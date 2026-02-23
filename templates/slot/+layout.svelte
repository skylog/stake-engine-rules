<!--
  Root layout — initializes the game on mount.

  Flow:
  1. Parse URL params
  2. Create RGS service
  3. Authenticate (or load replay data)
  4. Create XState actor
  5. Set game context
  6. Render children (game)
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { RgsService } from '$lib/services/rgs';
  import { getGameParams } from '$lib/services/url';
  import { createTerms } from '$lib/services/terminology';
  import { log } from '$lib/services/logger';
  import { setGameContext } from '$lib/context';
  import { gameMachine } from '$lib/machines/gameMachine';
  import { createActor } from 'xstate';

  let { children } = $props();

  let ready = $state(false);
  let initError = $state<string | null>(null);

  onMount(async () => {
    try {
      const params = getGameParams();
      const rgs = new RgsService();
      const terms = createTerms(params.social);

      let config = null;
      let replayBook = undefined;
      let auth: any = null;

      if (params.replay) {
        // Replay mode — no auth needed
        log.info('[init] Replay mode');
        const replay = await rgs.fetchReplay(
          params.replayGame, params.replayVersion,
          params.replayMode, params.replayEvent,
        );
        replayBook = {
          id: 0,
          payoutMultiplier: replay.payoutMultiplier,
          events: Array.isArray(replay.state) ? replay.state : [],
        };
      } else if (params.rgsUrl) {
        // Live mode — authenticate
        log.info('[init] Live mode — authenticating');
        auth = await rgs.authenticate();
        config = auth.config;

        // Check for stale active round
        if (auth.round && Object.keys(auth.round).length > 0) {
          log.info('[init] Stale round detected — ending it');
          await rgs.endRound();
        }
      } else {
        // Demo mode — no RGS
        log.info('[init] Demo mode (no rgs_url)');
      }

      // Create XState actor
      const actor = createActor(gameMachine);
      actor.start();

      // Set initial balance + default bet from auth response
      if (auth) {
        actor.send({ type: 'UPDATE_BALANCE', balance: auth.balance.amount });
        if (config?.defaultBetLevel) {
          actor.send({ type: 'SET_BET', amount: config.defaultBetLevel });
        }
      }

      // Set game context
      setGameContext({
        actor,
        rgs,
        params,
        config,
        terms,
        replayBook,
      });

      ready = true;
    } catch (err: any) {
      log.error('[init] Failed:', err);
      initError = err.message ?? 'Failed to initialize game';
    }
  });
</script>

{#if initError}
  <div class="init-error">
    <p>Failed to load game</p>
    <p class="detail">{initError}</p>
  </div>
{:else if ready}
  {@render children()}
{:else}
  <div class="loading">
    <div class="spinner"></div>
    <p>Loading {{GAME_NAME}}...</p>
  </div>
{/if}

<style>
  .loading {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0d0d1a;
    color: #ffffff;
    font-family: system-ui, sans-serif;
    gap: 16px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #00d4aa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .init-error {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0d0d1a;
    color: #ff4444;
    font-family: system-ui, sans-serif;
    gap: 8px;
  }

  .init-error .detail {
    font-size: 12px;
    opacity: 0.7;
    color: #ffffff;
  }
</style>
