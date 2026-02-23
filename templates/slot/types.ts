/**
 * Game-specific types for {{GAME_NAME}} (slot game).
 *
 * Re-exports common types from services and defines game-specific book events,
 * symbol types, and other domain types.
 *
 * TODO: Customize for your slot game's symbols, paylines, and features.
 */

// Re-export common types
export type { Amount } from '../services/rgs';
export { toApiAmount, fromApiAmount } from '../services/rgs';
export type { GameParams } from '../services/url';

// ---------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------

/** All symbol IDs used in the game. */
export type SymbolId = string; // e.g., 'H1' | 'H2' | 'L1' | 'WILD' | 'SCATTER'

// ---------------------------------------------------------------------------
// Book & BookEvent types
// ---------------------------------------------------------------------------

/**
 * The Book is the complete round data from the RGS.
 * Contains all pre-computed events for the entire round.
 */
export interface Book {
  id: number;
  /** Payout multiplier x100 (e.g., 200 = 2.00x). Zero on loss. */
  payoutMultiplier: number;
  events: BookEvent[];
  criteria?: string;
}

/**
 * BookEvent types — each event describes one step in the round animation.
 *
 * IMPORTANT: Events are in `round.state`, NOT `round.events` in the RGS response.
 * Use normalizeBook() to convert.
 */
export type BookEvent =
  | BookEventReveal
  | BookEventWinInfo
  | BookEventSetWin
  | BookEventSetTotalWin
  | BookEventFinalWin
  | BookEventFreeSpinTrigger;

export interface BookEventReveal {
  index: number;
  type: 'reveal';
  /** Flat array of symbol IDs for the board (row-major order). */
  board: SymbolId[];
  /** Game type: "basegame" or "freegame". */
  gameType: string;
}

export interface BookEventWinInfo {
  index: number;
  type: 'winInfo';
  totalWin: number;
  wins: Array<{
    symbol: SymbolId;
    kind: number;
    win: number;
    positions: number[];
    meta?: Record<string, unknown>;
  }>;
}

export interface BookEventSetWin {
  index: number;
  type: 'setWin';
  amount: number;
  winLevel: number;
}

export interface BookEventSetTotalWin {
  index: number;
  type: 'setTotalWin';
  amount: number;
}

export interface BookEventFinalWin {
  index: number;
  type: 'finalWin';
  amount: number;
}

export interface BookEventFreeSpinTrigger {
  index: number;
  type: 'freeSpinTrigger';
  count: number;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize RGS round response to Book format.
 *
 * CRITICAL: RGS returns events in `round.state`, not `round.events`.
 * Round ID is in `round.betID`, not `round.id`.
 */
export function normalizeBook(round: Record<string, unknown>): Book {
  const state = round.state as any[];
  if (!Array.isArray(state)) {
    throw new Error('round.state is not an array — check RGS response format');
  }

  return {
    id: (round.betID as number) ?? 0,
    payoutMultiplier: (round.payoutMultiplier as number) ?? 0,
    events: state.map((event, i) => ({ ...event, index: event.index ?? i })),
    criteria: round.criteria as string | undefined,
  };
}
