/**
 * Burst/crash game state machine (XState v5).
 *
 * State flow:
 *   IDLE → BETTING → PUMPING → (CASHING_OUT | RUGGED) → RESULT → IDLE
 *
 * Key rules:
 * - EVERY round calls /wallet/end-round (including rugged rounds)
 * - RUGGED routes through CASHING_OUT for end-round call
 * - Optimistic UX: player can re-bet from RESULT state
 * - RESTORE_ROUND: resume active round on page reload
 *
 * TODO: Customize events and actions for your game's specific mechanics.
 */

import { setup, assign } from 'xstate';
import type { Amount } from '../services/rgs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameMachineContext {
  /** Current bet amount in API format. */
  betAmount: Amount;
  /** Current game mode. */
  mode: string;
  /** Selected target multiplier (e.g., 2.0 for 2x). */
  target: number;
  /** Current balance in API format. */
  balance: Amount;
  /** Currency code. */
  currency: string;
  /** Book data from the last /play response. */
  book: any | null;
  /** Current multiplier during pumping. */
  currentMultiplier: number;
  /** Crash point from the book (pre-determined). */
  crashPoint: number;
  /** Total win from the current round. */
  totalWin: Amount;
  /** Whether the player survived (reached target). */
  survived: boolean;
  /** Error message for display. */
  error: string | null;
}

export type GameMachineEvent =
  | { type: 'APE_IN'; amount: Amount; mode: string; target: number }
  | { type: 'RESPONSE_OK'; book: any; balance: Amount }
  | { type: 'RESPONSE_ERROR'; error: string }
  | { type: 'UPDATE_MULTIPLIER'; value: number }
  | { type: 'TARGET_REACHED' }
  | { type: 'RUG_REACHED' }
  | { type: 'ANIMATION_DONE' }
  | { type: 'CONFIRMED'; balance: Amount }
  | { type: 'NEW_ROUND' }
  | { type: 'UPDATE_BALANCE'; balance: Amount }
  | { type: 'SET_BET'; amount: Amount }
  | { type: 'SET_TARGET'; target: number }
  | { type: 'RESTORE_ROUND'; book: any };

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameMachineEvent,
  },
}).createMachine({
  id: '{{GAME_SLUG}}',
  initial: 'idle',
  context: {
    betAmount: 0,
    mode: 'BASE',
    target: 2.0,
    balance: 0,
    currency: 'USD',
    book: null,
    currentMultiplier: 1.0,
    crashPoint: 0,
    totalWin: 0,
    survived: false,
    error: null,
  },

  states: {
    idle: {
      on: {
        APE_IN: {
          target: 'betting',
          actions: assign({
            betAmount: ({ event }) => event.amount,
            mode: ({ event }) => event.mode,
            target: ({ event }) => event.target,
            error: null,
            totalWin: 0,
            book: null,
            currentMultiplier: 1.0,
            survived: false,
          }),
        },
        SET_BET: {
          actions: assign({ betAmount: ({ event }) => event.amount }),
        },
        SET_TARGET: {
          actions: assign({ target: ({ event }) => event.target }),
        },
        UPDATE_BALANCE: {
          actions: assign({ balance: ({ event }) => event.balance }),
        },
        RESTORE_ROUND: {
          target: 'pumping',
          actions: assign({ book: ({ event }) => event.book }),
        },
      },
    },

    betting: {
      // TODO: Invoke RGS play actor here
      on: {
        RESPONSE_OK: {
          target: 'pumping',
          actions: assign({
            book: ({ event }) => event.book,
            balance: ({ event }) => event.balance,
            crashPoint: ({ event }) => {
              const reveal = event.book?.events?.find((e: any) => e.type === 'reveal');
              return reveal?.crashPoint ?? 0;
            },
          }),
        },
        RESPONSE_ERROR: {
          target: 'idle',
          actions: assign({ error: ({ event }) => event.error }),
        },
      },
    },

    pumping: {
      // Chart animation running — multiplier climbing toward crash point
      on: {
        UPDATE_MULTIPLIER: {
          actions: assign({ currentMultiplier: ({ event }) => event.value }),
        },
        TARGET_REACHED: {
          target: 'cashingOut',
          actions: assign({ survived: true }),
        },
        RUG_REACHED: {
          target: 'rugged',
          actions: assign({ survived: false }),
        },
      },
    },

    cashingOut: {
      // Send /end-round, credit winnings
      on: {
        CONFIRMED: {
          target: 'result',
          actions: assign({ balance: ({ event }) => event.balance }),
        },
      },
    },

    rugged: {
      // Show crash animation, then route through cashingOut for /end-round
      on: {
        ANIMATION_DONE: 'cashingOut',
      },
    },

    result: {
      on: {
        NEW_ROUND: 'idle',
        // Optimistic UX: allow immediate re-bet from result
        APE_IN: {
          target: 'betting',
          actions: assign({
            betAmount: ({ event }) => event.amount,
            mode: ({ event }) => event.mode,
            target: ({ event }) => event.target,
            error: null,
            totalWin: 0,
            book: null,
            currentMultiplier: 1.0,
            survived: false,
          }),
        },
        UPDATE_BALANCE: {
          actions: assign({ balance: ({ event }) => event.balance }),
        },
      },
    },
  },
});

export type GameMachineActorRef = ReturnType<typeof gameMachine.createActor>;
