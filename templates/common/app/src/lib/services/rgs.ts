/**
 * RGS (Remote Game Server) API client for Stake Engine.
 *
 * All communication with the Stake Engine backend flows through this service.
 * The base URL is read from the `rgs_url` query parameter — it is never hardcoded.
 *
 * Monetary values use Stake Engine's integer format with 6 decimal places:
 * 1,000,000 = $1.00. Use {@link toApiAmount} and {@link fromApiAmount} for conversion.
 *
 * API flow:
 * 1. `/wallet/authenticate` — validate session, get balance + bet limits
 * 2. `/wallet/play` — place bet, receive simulation data
 * 3. Frontend animates the round
 * 4. `/wallet/end-round` — finalize round (win or loss)
 */

import { getGameParams } from "./url";
import { log } from "./logger";

// ---------------------------------------------------------------------------
// Amount types and conversion
// ---------------------------------------------------------------------------

/** Monetary amount in Stake Engine's integer format (1,000,000 = $1.00). */
export type Amount = number;

const AMOUNT_PRECISION = 6;
const AMOUNT_MULTIPLIER = Math.pow(10, AMOUNT_PRECISION);

/** Convert dollars to API integer format. */
export function toApiAmount(dollars: number): Amount {
  return Math.round(dollars * AMOUNT_MULTIPLIER);
}

/** Convert API integer format to dollars. */
export function fromApiAmount(apiAmount: Amount): number {
  return apiAmount / AMOUNT_MULTIPLIER;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type RgsErrorCode =
  | "ERR_VAL"
  | "ERR_IPB"
  | "ERR_IS"
  | "ERR_ATE"
  | "ERR_GLE"
  | "ERR_LOC"
  | "ERR_GEN"
  | "ERR_MAINTENANCE";

export class RgsError extends Error {
  public readonly code: RgsErrorCode;
  public readonly statusCode: number;

  constructor(code: RgsErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "RgsError";
    this.code = code;
    this.statusCode = statusCode;
  }

  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  get isInsufficientBalance(): boolean {
    return this.code === "ERR_IPB";
  }

  get isSessionInvalid(): boolean {
    return this.code === "ERR_IS" || this.code === "ERR_ATE";
  }

  get isMaintenance(): boolean {
    return this.code === "ERR_MAINTENANCE";
  }
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface Balance {
  amount: Amount;
  currency: string;
}

export interface Jurisdiction {
  [key: string]: unknown;
}

export interface GameConfig {
  minBet: Amount;
  maxBet: Amount;
  stepBet: Amount;
  defaultBetLevel: Amount;
  betLevels: Amount[];
  jurisdiction: Jurisdiction;
}

export interface Round {
  [key: string]: unknown;
}

export interface AuthenticateResponse {
  balance: Balance;
  config: GameConfig;
  round: Round;
}

export interface BalanceResponse {
  balance: Balance;
}

export interface PlayResponse {
  balance: Balance;
  round: Round;
}

export interface EndRoundResponse {
  balance: Balance;
}

export interface ReplayResponse {
  payoutMultiplier: number;
  costMultiplier: number;
  state: Record<string, unknown>;
}

interface RgsErrorBody {
  code?: string;
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Error messages
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<RgsErrorCode, string> = {
  ERR_VAL: "Invalid request",
  ERR_IPB: "Insufficient balance",
  ERR_IS: "Session expired or invalid",
  ERR_ATE: "Authentication failed",
  ERR_GLE: "Gambling limits exceeded",
  ERR_LOC: "Playing from a restricted location",
  ERR_GEN: "Server error",
  ERR_MAINTENANCE: "Server is under maintenance",
};

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set<string>([
  "ERR_VAL", "ERR_IPB", "ERR_IS", "ERR_ATE",
  "ERR_GLE", "ERR_LOC", "ERR_GEN", "ERR_MAINTENANCE",
]);

// ---------------------------------------------------------------------------
// RGS Service
// ---------------------------------------------------------------------------

export class RgsService {
  private readonly baseUrl: string;
  private readonly sessionID: string;

  constructor() {
    const params = getGameParams();
    let url = params.rgsUrl;
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    this.baseUrl = url;
    this.sessionID = params.sessionID;
    log.info('[rgs] init — baseUrl:', this.baseUrl);
  }

  async authenticate(): Promise<AuthenticateResponse> {
    return this.post<AuthenticateResponse>("/wallet/authenticate", {
      sessionID: this.sessionID,
    });
  }

  async play(amount: Amount, mode: string = "BASE"): Promise<PlayResponse> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RgsError("ERR_VAL", `Invalid bet amount: ${amount}`, 0);
    }
    if (!Number.isInteger(amount)) {
      amount = Math.round(amount);
    }
    if (!mode || mode === 'undefined' || mode === 'null') {
      throw new RgsError("ERR_VAL", `Invalid game mode: ${mode}`, 0);
    }
    return this.post<PlayResponse>("/wallet/play", {
      amount, sessionID: this.sessionID, mode,
    });
  }

  async endRound(): Promise<EndRoundResponse> {
    return this.post<EndRoundResponse>("/wallet/end-round", {
      sessionID: this.sessionID,
    });
  }

  async getBalance(): Promise<BalanceResponse> {
    return this.post<BalanceResponse>("/wallet/balance", {
      sessionID: this.sessionID,
    });
  }

  async fetchReplay(
    game: string, version: string, mode: string, event: string,
  ): Promise<ReplayResponse> {
    return this.get<ReplayResponse>(
      `/bet/replay/${encodeURIComponent(game)}/${encodeURIComponent(version)}/${encodeURIComponent(mode)}/${encodeURIComponent(event)}`,
    );
  }

  async sendEvent(event: string): Promise<void> {
    await this.post<void>("/bet/event", {
      sessionID: this.sessionID, event,
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private buildUrl(path: string): string {
    const base = this.baseUrl.replace(/\/+$/, "");
    const endpoint = path.startsWith("/") ? path : `/${path}`;
    return `${base}${endpoint}`;
  }

  private async get<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(url, { method: "GET", signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new RgsError("ERR_GEN", "Request timed out (10s)", 0);
      }
      throw new RgsError("ERR_GEN",
        `Network error: ${error instanceof Error ? error.message : "Failed to reach RGS"}`, 0);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) await this.handleErrorResponse(response, path);
    const text = await response.text();
    if (!text) return undefined as T;
    try { return JSON.parse(text) as T; } catch {
      throw new RgsError("ERR_GEN", `Invalid JSON response from ${path}`, response.status);
    }
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path);
    log.info(`[rgs] POST ${path}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new RgsError("ERR_GEN", "Request timed out (10s)", 0);
      }
      throw new RgsError("ERR_GEN",
        `Network error: ${error instanceof Error ? error.message : "Failed to reach RGS"}`, 0);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) await this.handleErrorResponse(response, path);
    const text = await response.text();
    if (!text) return undefined as T;
    try { return JSON.parse(text) as T; } catch {
      throw new RgsError("ERR_GEN", `Invalid JSON response from ${path}`, response.status);
    }
  }

  private async handleErrorResponse(response: Response, path: string): Promise<never> {
    let errorBody: RgsErrorBody | null = null;
    try {
      const text = await response.text();
      log.error(`[rgs] Error from ${path} (${response.status}):`, text);
      if (text) errorBody = JSON.parse(text) as RgsErrorBody;
    } catch { /* could not parse */ }

    const rawCode = errorBody?.code || errorBody?.error;
    if (rawCode && KNOWN_ERROR_CODES.has(rawCode)) {
      const code = rawCode as RgsErrorCode;
      throw new RgsError(code, errorBody?.message || ERROR_MESSAGES[code], response.status);
    }

    const fallbackCode: RgsErrorCode = response.status >= 500 ? "ERR_GEN" : "ERR_VAL";
    throw new RgsError(fallbackCode,
      errorBody?.message || `Unexpected error from ${path} (HTTP ${response.status})`, response.status);
  }
}
