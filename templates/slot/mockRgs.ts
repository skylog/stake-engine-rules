/**
 * Mock RGS for demo mode (slot game).
 *
 * When no `rgs_url` is present, this mock provides fake round data
 * so the game is playable without a backend.
 *
 * TODO: Customize with your game's symbols, reels, and paytable.
 */

import type { Book, SymbolId } from '../types';

// ---------------------------------------------------------------------------
// Config — customize for your game
// ---------------------------------------------------------------------------

/** Symbols available on the reels. */
const SYMBOLS: SymbolId[] = [
  'H1', 'H2', 'H3', 'H4', 'H5',
  'L1', 'L2', 'L3', 'L4',
  'WILD', 'SCATTER',
];

/** Number of reels. */
const REELS = 5;

/** Number of visible rows per reel. */
const ROWS = 3;

/** Simple paytable: symbol → { kind: multiplier }. */
const PAYTABLE: Record<string, Record<number, number>> = {
  H1: { 3: 50, 4: 200, 5: 1000 },
  H2: { 3: 30, 4: 100, 5: 500 },
  H3: { 3: 20, 4: 60, 5: 250 },
  H4: { 3: 15, 4: 40, 5: 150 },
  H5: { 3: 10, 4: 30, 5: 100 },
  L1: { 3: 5, 4: 15, 5: 50 },
  L2: { 3: 5, 4: 10, 5: 40 },
  L3: { 3: 3, 4: 8, 5: 30 },
  L4: { 3: 3, 4: 5, 5: 20 },
};

// ---------------------------------------------------------------------------
// Mock generation
// ---------------------------------------------------------------------------

function randomSymbol(): SymbolId {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function generateBoard(): SymbolId[] {
  const board: SymbolId[] = [];
  for (let i = 0; i < REELS * ROWS; i++) {
    board.push(randomSymbol());
  }
  return board;
}

/**
 * Generate a mock Book with random reel results.
 *
 * Returns a complete book event sequence:
 * reveal → winInfo → setWin → setTotalWin → finalWin
 */
export function generateMockBook(betAmount: number): Book {
  const board = generateBoard();

  // Simple win check: count matching symbols across first row (positions 0, 3, 6, 9, 12)
  // TODO: Implement proper payline/ways evaluation for your game
  let totalWin = 0;
  const wins: any[] = [];

  const firstRow = Array.from({ length: REELS }, (_, r) => board[r * ROWS]);
  const firstSymbol = firstRow[0];
  if (firstSymbol !== 'SCATTER') {
    let matchCount = 1;
    for (let r = 1; r < REELS; r++) {
      if (firstRow[r] === firstSymbol || firstRow[r] === 'WILD') matchCount++;
      else break;
    }
    const pay = PAYTABLE[firstSymbol]?.[matchCount] ?? 0;
    if (pay > 0) {
      totalWin = pay * betAmount;
      wins.push({
        symbol: firstSymbol,
        kind: matchCount,
        win: totalWin,
        positions: Array.from({ length: matchCount }, (_, r) => r * ROWS),
      });
    }
  }

  const events: any[] = [
    {
      index: 0,
      type: 'reveal',
      board,
      gameType: 'basegame',
    },
  ];

  if (totalWin > 0) {
    events.push({
      index: 1,
      type: 'winInfo',
      totalWin,
      wins,
    });
    events.push({
      index: 2,
      type: 'setWin',
      amount: totalWin,
      winLevel: totalWin > 100 ? 3 : totalWin > 20 ? 2 : 1,
    });
  }

  events.push({
    index: events.length,
    type: 'setTotalWin',
    amount: totalWin,
  });

  events.push({
    index: events.length,
    type: 'finalWin',
    amount: totalWin,
  });

  return {
    id: Math.floor(Math.random() * 100000),
    payoutMultiplier: totalWin,
    events,
  };
}
