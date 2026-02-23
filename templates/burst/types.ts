/**
 * Game-specific types for {{GAME_NAME}} (burst/crash game).
 *
 * Re-exports common types and defines burst-specific book events,
 * chart path data, and crash point types.
 *
 * TODO: Customize for your game's specific mechanics and visual features.
 */

// Re-export common types
export type { Amount } from '../services/rgs';
export { toApiAmount, fromApiAmount } from '../services/rgs';
export type { GameParams } from '../services/url';

// ---------------------------------------------------------------------------
// Book & BookEvent types
// ---------------------------------------------------------------------------

export interface Book {
  id: number;
  /** Payout multiplier x100 (e.g., 200 = 2.00x). Zero on loss. */
  payoutMultiplier: number;
  events: BookEvent[];
  criteria?: string;
}

export type BookEvent =
  | BookEventReveal
  | BookEventStartPump
  | BookEventSetWin
  | BookEventSetTotalWin
  | BookEventFinalWin
  | BookEventRugPull;

export interface BookEventReveal {
  index: number;
  type: 'reveal';
  /** Pre-determined crash point multiplier. */
  crashPoint: number;
  /** Pre-computed chart path data points for animation. */
  chartPath: number[];
  /** Additional game-specific data. */
  [key: string]: unknown;
}

export interface BookEventStartPump {
  index: number;
  type: 'startPump';
}

export interface BookEventSetWin {
  index: number;
  type: 'setWin';
  amount: number;
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

export interface BookEventRugPull {
  index: number;
  type: 'rugPull';
  crashMultiplier: number;
}

// ---------------------------------------------------------------------------
// Sell targets
// ---------------------------------------------------------------------------

export const TARGETS = [1.1, 1.25, 1.5, 2, 3, 5, 10, 25, 50, 100] as const;
export type Target = (typeof TARGETS)[number];

/**
 * Map a target multiplier to the mode name for the RGS /play request.
 *
 * Stake Engine uses mode strings like "degen_2_0", "degen_10_0", etc.
 * TODO: Adjust naming convention to match your math engine's mode names.
 */
export function targetToMode(target: number): string {
  const str = target.toFixed(1).replace('.', '_');
  return `degen_${str}`;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize RGS round response to Book format.
 *
 * CRITICAL: RGS returns events in `round.state`, not `round.events`.
 * Round ID is `round.betID`, not `round.id`.
 */
export function normalizeBook(round: Record<string, unknown>): Book {
  const state = round.state as any[];
  if (!Array.isArray(state)) {
    throw new Error('round.state is not an array — check RGS response format');
  }

  const payoutMultiplier = (round.payoutMultiplier as number) ?? 0;

  return {
    id: (round.betID as number) ?? 0,
    payoutMultiplier,
    events: state.map((event, i) => ({ ...event, index: event.index ?? i })),
    criteria: round.criteria as string | undefined,
  };
}
