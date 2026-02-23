<!--
  Main game component for {{GAME_NAME}} (slot game).

  This is the central orchestrator that composes all game UI components.
  It subscribes to the XState actor for state changes and dispatches events.

  TODO: Add your game-specific components (reels, symbols, paytable, etc.)
-->
<script lang="ts">
  import { getGameContext } from '$lib/context';
  import { fromApiAmount } from '$lib/types';

  const { actor, params, config } = getGameContext();

  // ---------------------------------------------------------------------------
  // Reactive state from XState actor
  // ---------------------------------------------------------------------------

  let gameState = $state('idle');
  let balance = $state(0);
  let currency = $state('USD');
  let totalWin = $state(0);
  let error = $state<string | null>(null);

  $effect(() => {
    const sub = actor.subscribe((snapshot: any) => {
      const ctx = snapshot.context;
      gameState = snapshot.value as string;
      balance = ctx.balance;
      currency = ctx.currency;
      totalWin = ctx.totalWin;
      error = ctx.error;
    });
    return () => sub.unsubscribe();
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleSpin() {
    const ctx = actor.getSnapshot().context;
    actor.send({ type: 'SPIN', amount: ctx.betAmount, mode: ctx.mode });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.code === 'Space' && (gameState === 'idle' || gameState === 'result')) {
      e.preventDefault();
      handleSpin();
    }
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
    <!-- TODO: Add your game-specific components here -->
    <!-- Examples: ReelBoard, SymbolGrid, PaylineDisplay -->
    <div class="placeholder">
      <p>Game Area</p>
      <p class="state">State: {gameState}</p>
      {#if totalWin > 0}
        <p class="win">Win: {fromApiAmount(totalWin).toFixed(2)}</p>
      {/if}
    </div>
  </main>

  <footer class="game-controls">
    <!-- TODO: Add BetControls, Autoplay, etc. -->
    <button
      class="spin-btn"
      onclick={handleSpin}
      disabled={gameState !== 'idle' && gameState !== 'result'}
    >
      {gameState === 'spinning' ? 'SPINNING...' : 'SPIN'}
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

  .game-title {
    font-size: 14px;
    font-weight: 600;
    opacity: 0.7;
  }

  .balance {
    font-size: 16px;
    font-weight: 700;
  }

  .game-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder {
    text-align: center;
    opacity: 0.5;
    font-size: 18px;
  }

  .placeholder .state {
    font-size: 12px;
    margin-top: 8px;
  }

  .placeholder .win {
    color: #00d4aa;
    font-size: 24px;
    font-weight: 700;
  }

  .game-controls {
    display: flex;
    justify-content: center;
    padding: 16px;
  }

  .spin-btn {
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

  .spin-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spin-btn:not(:disabled):hover {
    filter: brightness(1.1);
  }

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
