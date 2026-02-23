<!--
  Root layout for burst/crash game — initializes on mount.

  Flow: parse URL → create RGS → authenticate → create XState actor → render
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
        log.info('[init] Live mode');
        auth = await rgs.authenticate();
        config = auth.config;

        // Stale round recovery
        if (auth.round && Object.keys(auth.round).length > 0) {
          log.info('[init] Stale round — ending');
          await rgs.endRound();
        }
      } else {
        log.info('[init] Demo mode');
      }

      const actor = createActor(gameMachine);
      actor.start();

      // Set initial balance + default bet from auth response
      if (auth) {
        actor.send({ type: 'UPDATE_BALANCE', balance: auth.balance.amount });
        if (config?.defaultBetLevel) {
          actor.send({ type: 'SET_BET', amount: config.defaultBetLevel });
        }
      }

      setGameContext({ actor, rgs, params, config, terms, replayBook });
      ready = true;
    } catch (err: any) {
      log.error('[init] Failed:', err);
      initError = err.message ?? 'Failed to initialize';
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
    width: 100%; height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: #0d0d1a; color: #fff;
    font-family: system-ui, sans-serif; gap: 16px;
  }
  .spinner {
    width: 40px; height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #00d4aa; border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .init-error {
    width: 100%; height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: #0d0d1a; color: #ff4444;
    font-family: system-ui, sans-serif; gap: 8px;
  }
  .init-error .detail { font-size: 12px; opacity: 0.7; color: #fff; }
</style>
