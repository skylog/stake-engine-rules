/**
 * Mock RGS for demo mode (burst/crash game).
 *
 * When no `rgs_url` is present, this mock generates crash points
 * using the same inverse distribution as the real math engine.
 *
 * TODO: Customize chart path generation and book events for your game.
 */

import type { Book } from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** House edge (7% = 93% RTP). */
const HOUSE_EDGE = 0.07;

/** Maximum possible crash point. */
const MAX_CRASH = 1000;

/** Available targets. */
const TARGETS = [1.1, 1.25, 1.5, 2, 3, 5, 10, 25, 50, 100];

// ---------------------------------------------------------------------------
// Crash point generation
// ---------------------------------------------------------------------------

/**
 * Generate a crash point using the inverse distribution:
 *   P(crash > x) = (1/x) * (1 - house_edge)
 */
function generateCrashPoint(): number {
  // Instant rug (honeypot) probability = house_edge
  if (Math.random() < HOUSE_EDGE) {
    return 1.0;
  }

  const r = Math.random();
  const crash = (1 - HOUSE_EDGE) / r;
  return Math.min(Math.round(crash * 100) / 100, MAX_CRASH);
}

/**
 * Generate a chart path (array of multiplier values) for animation.
 * The path follows an exponential curve up to the crash point.
 */
function generateChartPath(crashPoint: number): number[] {
  const path: number[] = [];
  const totalSteps = Math.max(20, Math.floor(Math.log2(crashPoint) * 15));

  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    // Exponential curve: 1 → crashPoint
    const value = Math.pow(crashPoint, t);
    path.push(Math.round(value * 100) / 100);
  }

  return path;
}

// ---------------------------------------------------------------------------
// Mock book generation
// ---------------------------------------------------------------------------

/**
 * Generate a mock Book for a burst/crash round.
 */
export function generateMockBook(betAmount: number, target: number): Book {
  const crashPoint = generateCrashPoint();
  const chartPath = generateChartPath(crashPoint);
  const survived = crashPoint >= target;
  const payoutMultiplier = survived ? Math.round(target * 100) : 0;

  const events: any[] = [
    {
      index: 0,
      type: 'reveal',
      crashPoint,
      chartPath,
      gameType: 'basegame',
    },
    {
      index: 1,
      type: 'startPump',
    },
  ];

  if (survived) {
    events.push({
      index: 2,
      type: 'setWin',
      amount: payoutMultiplier,
    });
  } else {
    events.push({
      index: 2,
      type: 'rugPull',
      crashMultiplier: crashPoint,
    });
  }

  events.push({
    index: events.length,
    type: 'setTotalWin',
    amount: payoutMultiplier,
  });

  events.push({
    index: events.length,
    type: 'finalWin',
    amount: payoutMultiplier,
  });

  return {
    id: Math.floor(Math.random() * 100000),
    payoutMultiplier,
    events,
  };
}
