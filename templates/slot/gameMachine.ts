/**
 * Slot game state machine (XState v5).
 *
 * State flow:
 *   IDLE → BETTING → SPINNING → [WINNING | LOSING] → RESULT → IDLE
 *
 * TODO: Customize states, events, and transitions for your specific slot game.
 */

import { setup, assign, fromPromise } from 'xstate';
import type { Amount } from '../services/rgs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameMachineContext {
  /** Current bet amount in API format. */
  betAmount: Amount;
  /** Current game mode (maps to math mode name). */
  mode: string;
  /** Current balance in API format. */
  balance: Amount;
  /** Currency code from auth. */
  currency: string;
  /** Book data from the last /play response. */
  book: any | null;
  /** Total win from the current round. */
  totalWin: Amount;
  /** Error message for display. */
  error: string | null;
}

export type GameMachineEvent =
  | { type: 'SPIN'; amount: Amount; mode: string }
  | { type: 'RESPONSE_OK'; book: any; balance: Amount }
  | { type: 'RESPONSE_ERROR'; error: string }
  | { type: 'ANIMATION_DONE' }
  | { type: 'WIN_SHOWN' }
  | { type: 'NEW_ROUND' }
  | { type: 'UPDATE_BALANCE'; balance: Amount }
  | { type: 'SET_BET'; amount: Amount }
  | { type: 'SET_MODE'; mode: string };

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
    balance: 0,
    currency: 'USD',
    book: null,
    totalWin: 0,
    error: null,
  },

  states: {
    idle: {
      on: {
        SPIN: {
          target: 'betting',
          actions: assign({
            betAmount: ({ event }) => event.amount,
            mode: ({ event }) => event.mode,
            error: null,
            totalWin: 0,
            book: null,
          }),
        },
        SET_BET: {
          actions: assign({ betAmount: ({ event }) => event.amount }),
        },
        SET_MODE: {
          actions: assign({ mode: ({ event }) => event.mode }),
        },
        UPDATE_BALANCE: {
          actions: assign({ balance: ({ event }) => event.balance }),
        },
      },
    },

    betting: {
      // TODO: Invoke RGS play actor here
      on: {
        RESPONSE_OK: {
          target: 'spinning',
          actions: assign({
            book: ({ event }) => event.book,
            balance: ({ event }) => event.balance,
          }),
        },
        RESPONSE_ERROR: {
          target: 'idle',
          actions: assign({ error: ({ event }) => event.error }),
        },
      },
    },

    spinning: {
      // Reel animation running — wait for completion
      on: {
        ANIMATION_DONE: [
          {
            target: 'winning',
            guard: ({ context }) => (context.book?.payoutMultiplier ?? 0) > 0,
          },
          {
            target: 'losing',
          },
        ],
      },
    },

    winning: {
      // Show win celebration
      on: {
        WIN_SHOWN: 'result',
      },
    },

    losing: {
      // Brief loss feedback
      after: {
        500: 'result',
      },
    },

    result: {
      on: {
        NEW_ROUND: 'idle',
        // Optimistic UX: allow immediate re-spin from result
        SPIN: {
          target: 'betting',
          actions: assign({
            betAmount: ({ event }) => event.amount,
            mode: ({ event }) => event.mode,
            error: null,
            totalWin: 0,
            book: null,
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
