<!--
  Main game component for {{GAME_NAME}} (burst/crash game).

  Central orchestrator: chart, multiplier, bet controls, result display.

  TODO: Add your game-specific visual components (chart, multiplier, social feed, etc.)
-->
<script lang="ts">
  import { getGameContext } from '$lib/context';
  import { fromApiAmount, TARGETS } from '$lib/types';

  const { actor, params, config } = getGameContext();

  // ---------------------------------------------------------------------------
  // Reactive state from XState actor
  // ---------------------------------------------------------------------------

  let gameState = $state('idle');
  let balance = $state(0);
  let currency = $state('USD');
  let currentMultiplier = $state(1.0);
  let target = $state(2.0);
  let betAmount = $state(0);
  let survived = $state(false);
  let totalWin = $state(0);
  let error = $state<string | null>(null);

  $effect(() => {
    const sub = actor.subscribe((snapshot: any) => {
      const ctx = snapshot.context;
      gameState = snapshot.value as string;
      balance = ctx.balance;
      currency = ctx.currency;
      currentMultiplier = ctx.currentMultiplier;
      target = ctx.target;
      betAmount = ctx.betAmount;
      survived = ctx.survived;
      totalWin = ctx.totalWin;
      error = ctx.error;
    });
    return () => sub.unsubscribe();
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleApeIn() {
    const ctx = actor.getSnapshot().context;
    actor.send({
      type: 'APE_IN',
      amount: ctx.betAmount,
      mode: 'BASE', // TODO: map target to mode
      target: ctx.target,
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.code === 'Space' && (gameState === 'idle' || gameState === 'result')) {
      e.preventDefault();
      handleApeIn();
    }
  }

  // Color based on multiplier
  function getMultiplierColor(mult: number): string {
    if (mult < 2) return '#00d4aa';
    if (mult < 10) return '#ffd700';
    if (mult < 100) return '#ff8c00';
    return '#ff4444';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="game">
  <header class="game-header">
    <div class="game-title">{{GAME_NAME}}</div>
    <div class="balance">
      {fromApiAmount(balance).toFixed(2)} {currency}
    </div>
  </header>

  <main class="game-area">
    <!-- TODO: Replace with your Chart component -->
    <div class="chart-placeholder">
      {#if gameState === 'pumping'}
        <div class="multiplier" style="color: {getMultiplierColor(currentMultiplier)}">
          {currentMultiplier.toFixed(2)}x
        </div>
        <div class="target-label">Target: {target}x</div>
      {:else if gameState === 'rugged'}
        <div class="multiplier rugged">RUGGED!</div>
      {:else if gameState === 'result' && survived}
        <div class="multiplier won">
          +{fromApiAmount(totalWin).toFixed(2)} {currency}
        </div>
      {:else}
        <div class="multiplier idle">
          {target}x
        </div>
        <div class="state-label">{gameState.toUpperCase()}</div>
      {/if}
    </div>
  </main>

  <footer class="game-controls">
    <!-- Target selector -->
    <div class="target-grid">
      {#each TARGETS as t}
        <button
          class="target-btn"
          class:selected={target === t}
          onclick={() => actor.send({ type: 'SET_TARGET', target: t })}
          disabled={gameState === 'pumping' || gameState === 'betting'}
        >
          {t}x
        </button>
      {/each}
    </div>

    <button
      class="ape-btn"
      onclick={handleApeIn}
      disabled={gameState !== 'idle' && gameState !== 'result'}
    >
      {gameState === 'pumping' ? 'PUMPING...' : gameState === 'betting' ? 'BETTING...' : 'APE IN'}
    </button>
  </footer>

  {#if error}
    <div class="error-toast">{error}</div>
  {/if}
</div>

<style>
  .game {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #0d0d1a;
    color: #ffffff;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
  }

  .game-title { font-size: 14px; font-weight: 600; opacity: 0.7; }
  .balance { font-size: 16px; font-weight: 700; }

  .game-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chart-placeholder { text-align: center; }

  .multiplier {
    font-size: 48px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .multiplier.idle { color: #00d4aa; opacity: 0.5; }
  .multiplier.rugged { color: #ff4444; }
  .multiplier.won { color: #00ff88; }

  .target-label {
    font-size: 14px;
    color: #ffd700;
    margin-top: 8px;
  }

  .state-label {
    font-size: 12px;
    opacity: 0.4;
    margin-top: 8px;
  }

  .game-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
  }

  .target-grid {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .target-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    cursor: pointer;
  }

  .target-btn.selected {
    background: rgba(0, 212, 170, 0.2);
    border-color: #00d4aa;
    color: #00d4aa;
  }

  .target-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .ape-btn {
    background: linear-gradient(135deg, #00d4aa, #00b894);
    color: #0d0d1a;
    border: none;
    border-radius: 8px;
    padding: 12px 48px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .ape-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ape-btn:not(:disabled):hover { filter: brightness(1.1); }

  .error-toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 68, 68, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
  }
</style>
