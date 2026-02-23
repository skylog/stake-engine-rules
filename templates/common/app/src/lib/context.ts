/**
 * Game context — module-level singleton.
 *
 * Uses a plain module variable instead of Svelte's setContext/getContext
 * because context is set from an async init() function inside $effect,
 * where setContext() would throw lifecycle_outside_component.
 *
 * This is safe because there's only one game instance per page.
 */

import type { RgsService, GameConfig } from './services/rgs';
import type { GameParams } from './services/url';
import type { createTerms } from './services/terminology';

// ---------------------------------------------------------------------------
// Context shape — customize for your game
// ---------------------------------------------------------------------------

export interface GameContext {
  /** XState actor running the game state machine. */
  actor: any;
  /** RGS API client. */
  rgs: RgsService;
  /** Parsed iframe query parameters. */
  params: GameParams;
  /** Game config from /wallet/authenticate. Set after auth. */
  config: GameConfig | null;
  /** Terminology translator for social casino mode. */
  terms: ReturnType<typeof createTerms>;
  /** Pre-loaded book for replay mode. */
  replayBook?: any;
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _ctx: GameContext | null = null;

export function setGameContext(ctx: GameContext): void {
  _ctx = ctx;
}

export function getGameContext(): GameContext {
  if (!_ctx) {
    throw new Error('Game context not initialized — call setGameContext() first');
  }
  return _ctx;
}
