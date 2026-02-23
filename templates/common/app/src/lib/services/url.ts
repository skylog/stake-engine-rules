/**
 * URL and query parameter parsing for Stake Engine iframe integration.
 *
 * Games are loaded inside an operator iframe with query parameters:
 *   ?sessionID={token}&lang={lang}&device={device}&rgs_url={rgsUrl}&social={bool}
 *
 * Replay mode:
 *   ?replay=true&game={uuid}&version={ver}&mode={mode}&event={id}
 */

export type Device = "mobile" | "desktop";

export type Language =
  | "ar" | "de" | "en" | "es" | "fi" | "fr" | "hi" | "id"
  | "ja" | "ko" | "pl" | "pt" | "ru" | "tr" | "vi" | "zh";

export interface GameParams {
  sessionID: string;
  lang: Language;
  device: Device;
  rgsUrl: string;
  replay: boolean;
  social: boolean;
  replayGame: string;
  replayVersion: string;
  replayMode: string;
  replayEvent: string;
  replayAmount: string;
  replayCurrency: string;
}

const VALID_LANGUAGES: ReadonlySet<string> = new Set([
  "ar", "de", "en", "es", "fi", "fr", "hi", "id",
  "ja", "ko", "pl", "pt", "ru", "tr", "vi", "zh",
]);

const VALID_DEVICES: ReadonlySet<string> = new Set(["mobile", "desktop"]);

function parseLanguage(value: string | null): Language {
  return value && VALID_LANGUAGES.has(value) ? value as Language : "en";
}

function parseDevice(value: string | null): Device {
  return value && VALID_DEVICES.has(value) ? value as Device : "desktop";
}

function parseBool(value: string | null): boolean {
  return value === "true" || value === "1";
}

export function getGameParams(): GameParams {
  const sp = new URLSearchParams(window.location.search);
  return {
    sessionID: sp.get("sessionID") ?? "",
    lang: parseLanguage(sp.get("lang")),
    device: parseDevice(sp.get("device")),
    rgsUrl: sp.get("rgs_url") ?? "",
    replay: parseBool(sp.get("replay")),
    social: parseBool(sp.get("social")),
    replayGame: sp.get("game") ?? "",
    replayVersion: sp.get("version") ?? "",
    replayMode: sp.get("mode") ?? "",
    replayEvent: sp.get("event") ?? "",
    replayAmount: sp.get("amount") ?? "",
    replayCurrency: sp.get("currency") ?? "",
  };
}

export function isReplayMode(): boolean {
  return getGameParams().replay;
}

export function isSocialMode(): boolean {
  return getGameParams().social;
}
