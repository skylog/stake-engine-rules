# Stake Engine Game Development Rules

> A comprehensive guide for AI agents building games on the Stake Engine platform.
> Distilled from real production bugs, failed reviews, and hard-won fixes on the Rug Run project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [RGS API Integration](#3-rgs-api-integration)
4. [Money Format](#4-money-format)
5. [URL Parameters](#5-url-parameters)
6. [State Machine (XState)](#6-state-machine-xstate)
7. [Book & Events System](#7-book--events-system)
8. [RGS Response Normalization](#8-rgs-response-normalization)
9. [Mode Parameter Mapping](#9-mode-parameter-mapping)
10. [Stale Round Recovery](#10-stale-round-recovery)
11. [Bet Replay Mode](#11-bet-replay-mode)
12. [Social Casino Terminology](#12-social-casino-terminology)
13. [Math Engine](#13-math-engine)
14. [Build & Deployment](#14-build--deployment)
15. [Audio & Assets](#15-audio--assets)
16. [Svelte 5 Gotchas](#16-svelte-5-gotchas)
17. [Approval Checklist](#17-approval-checklist)
18. [Quality Gates & Review Process](#18-quality-gates--review-process)
19. [Conventions & Best Practices](#19-conventions--best-practices)
20. [Common Bugs & Fixes](#20-common-bugs--fixes)

---

## 1. Architecture Overview

```
Operator iframe
  └─ SvelteKit SPA (adapter-static, no SSR)
       ├─ XState v5 state machine (game lifecycle)
       ├─ RGS API client (fetch, typed errors, 10s timeout)
       ├─ EventEmitter (pub/sub for BookEvents → UI)
       ├─ Howler.js (audio, all files local)
       └─ PixiJS 8 (optional, for canvas rendering)
```

**Key constraints:**
- Game runs inside an operator `<iframe>` on stake.com / stake.us
- All outcomes are pre-computed server-side (no client-side RNG)
- Static files only — zero external network requests (fonts, scripts, images)
- Everything served from Stake Engine CDN at `/{gameId}/{version}/`
- Each bet is stateless and independent (no jackpots, no gamble features, no continuation)

---

## 2. Project Structure

```
project-root/
├── apps/
│   └── {game-name}/                    # SvelteKit frontend
│       ├── src/
│       │   ├── app.html                # Entry HTML with <base> tag script
│       │   ├── routes/
│       │   │   ├── +layout.svelte      # Init: auth, context, loading screen
│       │   │   ├── +layout.ts          # prerender=true, ssr=false
│       │   │   └── +page.svelte        # Renders main <Game /> component
│       │   └── lib/
│       │       ├── components/         # Svelte 5 components (runes API)
│       │       ├── machines/           # XState v5 state machine
│       │       ├── services/           # RGS client, mock, URL parsing, audio, terminology
│       │       ├── events/             # EventEmitter, BookEvent handlers, sequence()
│       │       ├── types/              # TypeScript type definitions
│       │       └── context.ts          # Module-level game context singleton
│       ├── static/                     # Static assets (audio, images)
│       ├── scripts/
│       │   └── fix-base-path.cjs       # Post-build path rewriting
│       ├── svelte.config.js            # adapter-static config
│       ├── vite.config.ts
│       └── package.json
├── math/
│   └── {game_name}/                    # Python math engine
│       ├── config.py                   # RTP, modes, targets, limits
│       ├── run.py                      # CLI entry point
│       ├── simulator.py                # Multiprocessing simulation runner
│       ├── generator.py                # Crash point / outcome generation
│       ├── chart.py                    # Chart path generation (if applicable)
│       ├── airdrop.py                  # Bonus round math (if applicable)
│       ├── writer.py                   # Output writers (CSV, JSONL, Zstd)
│       └── output/                     # Generated files for RGS upload
│           ├── index.json
│           ├── lookUpTable_{mode}_0.csv
│           └── books_{mode}.jsonl.zst
├── docs/                               # Stake Engine documentation
├── package.json                        # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md
```

---

## 3. RGS API Integration

### Endpoints

| Endpoint | Method | When | Purpose |
|----------|--------|------|---------|
| `/wallet/authenticate` | POST | App load | Validate session, get balance + config + active round |
| `/wallet/balance` | POST | On demand | Refresh balance |
| `/wallet/play` | POST | Bet placed | Debit bet, receive simulation Book |
| `/wallet/end-round` | POST | Round complete | Finalize payout, credit winnings |
| `/bet/event` | POST | Optional | Log custom event |
| `/bet/replay/{game}/{version}/{mode}/{event}` | GET | Replay mode | Load pre-computed simulation (no session needed) |

### Request/Response Formats

**Authenticate:**
```json
// Request
{ "sessionID": "xxx" }

// Response
{
  "balance": { "amount": 10000000, "currency": "USD" },
  "config": {
    "minBet": 100000,
    "maxBet": 100000000,
    "stepBet": 100000,
    "defaultBetLevel": 1000000,
    "betLevels": [100000, 500000, 1000000, 5000000, 10000000],
    "betModes": {},
    "jurisdiction": {
      "socialCasino": false,
      "disabledFullscreen": false,
      "disabledTurbo": false,
      "disabledSuperTurbo": false,
      "disabledAutoplay": false,
      "disabledSlamstop": false,
      "disabledSpacebar": false,
      "disabledBuyFeature": false,
      "displayNetPosition": false,
      "displayRTP": false,
      "displaySessionTimer": false,
      "minimumRoundDuration": 0
    }
  },
  "round": {},
  "meta": null
}
```

**Play:**
```json
// Request
{ "sessionID": "xxx", "amount": 1000000, "mode": "degen_2_0" }

// Response
{
  "balance": { "amount": 9000000, "currency": "USD" },
  "round": {
    "betID": 123,
    "payoutMultiplier": 200,
    "costMultiplier": 1.0,
    "state": [ /* BookEvents here, NOT "events" */ ],
    "active": true
  }
}
```

**End Round:**
```json
// Request
{ "sessionID": "xxx" }

// Response
{ "balance": { "amount": 11000000, "currency": "USD" } }
```

**Note on API fields:**
- `jurisdiction` and `meta` fields are present in authenticate response but should be ignored in most implementations
- `betModes` contains game-specific bet mode configuration (empty object if not used)
- `costMultiplier` is used for bonus buy features (1.0 for normal bets)

### Error Codes

| Code | HTTP | Meaning | Action |
|------|------|---------|--------|
| `ERR_VAL` | 400 | Invalid request | Check payload format |
| `ERR_IPB` | 400 | Insufficient balance | Show "not enough funds" |
| `ERR_IS` | 400 | Invalid/expired session | Prompt page reload |
| `ERR_ATE` | 400 | Auth failed / token expired | Prompt page reload |
| `ERR_GLE` | 400 | Gambling limits exceeded | Show limits message |
| `ERR_LOC` | 400 | Invalid player location | Show location error |
| `ERR_GEN` | 500 | General server error | Retry or show error |
| `ERR_MAINTENANCE` | 500 | RGS maintenance | Show maintenance screen |

### Timeout

All fetch requests MUST have a 10-second timeout via `AbortController`:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10_000);
try {
  const response = await fetch(url, { signal: controller.signal, ... });
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new RgsError("ERR_GEN", "Request timed out (10s)", 0);
  }
  throw new RgsError("ERR_GEN", `Network error: ${error}`, 0);
} finally {
  clearTimeout(timeoutId);
}
```

---

## 4. Money Format

**All monetary values are integers with 6 decimal places.**

| Integer | Real Amount |
|---------|------------|
| `100_000` | $0.10 |
| `1_000_000` | $1.00 |
| `10_000_000` | $10.00 |
| `100_000_000` | $100.00 |

**Rules:**
- NEVER use floating point for money
- Always convert at API boundary: `amount * 1_000_000` to send, `amount / 1_000_000` to display
- `payoutMultiplier` in responses is `multiplier * 100` (integer): `200` = 2.00x
- Bets must be between `minBet` and `maxBet`
- Bets must be divisible by `stepBet`
- Use `betLevels` from config for quick-select buttons

---

## 5. URL Parameters

### Live Mode
```
?sessionID={token}&rgs_url={endpoint}&lang=en&device=desktop&social=false
```

### Replay Mode
```
?replay=true&game={uuid}&version=1&mode=degen_2_0&event=12345&amount=1000000&currency=USD
```

### Parameter Rules

| Parameter | Required | Default | Notes |
|-----------|----------|---------|-------|
| `sessionID` | Live mode | `""` | Not needed for replay |
| `rgs_url` | Live mode | `""` | **NEVER hardcode** — may arrive without `https://` prefix, auto-prepend it |
| `lang` | No | `"en"` | ISO 639-1 |
| `device` | No | `"desktop"` | `"mobile"` or `"desktop"` |
| `replay` | No | `false` | Enables replay mode |
| `social` | No | `false` | stake.us terminology mode |
| `game` | Replay | — | Game UUID |
| `version` | Replay | — | Math version |
| `mode` | Replay | — | Bet mode name |
| `event` | Replay | — | Simulation event ID |
| `amount` | Replay | — | Bet amount for display |
| `currency` | Replay | — | Currency for display |

**Critical bug prevention:** `rgs_url` may arrive without protocol prefix. Always normalize:
```typescript
if (rgsUrl && !rgsUrl.startsWith('http')) {
  rgsUrl = 'https://' + rgsUrl;
}
```

---

## 6. State Machine (XState)

### Lifecycle

```
IDLE → BETTING → PUMPING → (CASHING_OUT | RUGGED) → RESULT → IDLE
```

With bonus rounds:
```
PUMPING → target hit → BONUS_BANNER → PUMPING(bonus) → ... → CASHING_OUT → RESULT
```

### Critical Rules

1. **Call `/wallet/end-round` ONLY for non-zero payout rounds** — rounds with `payoutMultiplier === 0` are automatically completed by the RGS. Check the payout before calling:
   ```typescript
   if (book.payoutMultiplier > 0) {
     await rgs.endRound();
   }
   ```

2. **Rugged rounds may be auto-closed by RGS** — when `active === false` in the play response. Track this and skip the `end-round` call, just refresh balance instead.

3. **`endRound` is called ONCE** after all rounds (base + bonus/airdrops complete) — but only if the total payout is non-zero.

4. **Optimistic UX pattern** — allow the player to click the bet button during `rugged` or `cashingOut` states. Queue the intent and fire `APE_IN` when `result` state is reached:
   ```typescript
   let pendingBet = false;

   function handleBet() {
     const state = currentState;
     if (state === 'rugged' || state === 'cashingOut') {
       if (state === 'rugged') actor.send({ type: 'ANIMATION_DONE' });
       pendingBet = true;
       return;
     }
     actor.send({ type: 'APE_IN', betAmount, target });
   }

   $effect(() => {
     if (gameState === 'result' && pendingBet) {
       pendingBet = false;
       actor.send({ type: 'APE_IN', betAmount, target });
     }
   });
   ```

5. **Add `APE_IN` handler to `result` state** for immediate re-bet without going through `idle`:
   ```typescript
   result: {
     on: {
       NEW_ROUND: { target: 'idle', actions: 'resetForNewRound' },
       APE_IN: {
         target: 'betting',
         actions: ['resetForNewRound', 'prepareRound', /* assign bet params */],
       },
     },
   }
   ```

6. **Actors are stubs in the machine definition** — provide real implementations via `.provide({ actors: { ... } })` at creation time, using either real RGS actors or mock actors.

---

## 7. Book & Events System

### Book Structure (Frontend)

```typescript
interface Book {
  id: number;               // Round/simulation ID
  payoutMultiplier: number; // Integer: 200 = 2.00x
  events: BookEvent[];      // Ordered event list
  crashPoint: number;       // Extracted from reveal event
  chartPath: number[];      // Extracted from reveal event
  criteria?: string;        // Mode name
}
```

### BookEvent Processing

**Events MUST be processed sequentially, NEVER in parallel:**
```typescript
async function sequence(fns: Array<() => Promise<void>>): Promise<void> {
  for (const fn of fns) {
    await fn();
  }
}
```

**Why:** Animations must play in order. Processing events with `Promise.all()` causes visual chaos.

### EventEmitter Pattern

BookEvents → BookEventHandlers → EmitterEvents → Svelte Components

```typescript
// Handler processes a BookEvent and broadcasts EmitterEvents
const handlers: Record<string, BookEventHandler> = {
  reveal: async (event, emitter) => {
    emitter.broadcast({ type: 'chartReveal', crashPoint: event.crashPoint, ... });
  },
  startPump: async (event, emitter) => {
    emitter.broadcast({ type: 'pumpStart' });
  },
};

// Component subscribes to EmitterEvents
emitter.subscribe({
  chartReveal: (event) => { /* update chart */ },
  pumpStart: () => { /* start animation */ },
});
```

---

## 8. RGS Response Normalization

**The RGS response format does NOT match the frontend Book type. You MUST normalize.**

### Key Differences

| RGS Field | Frontend Field | Notes |
|-----------|---------------|-------|
| `round.betID` | `book.id` | Round ID uses `betID`, not `id` |
| `round.state` | `book.events` | Events are in `state`, NOT `events` |
| (nested in state[0]) | `book.crashPoint` | Must extract from the `reveal` event |
| (nested in state[0]) | `book.chartPath` | Must extract from the `reveal` event |
| `round.mode` | `book.criteria` | Mode name field |
| `round.active` | (tracked separately) | Whether RGS auto-closed the round |

### normalizeBook Implementation

```typescript
function normalizeBook(rawRound: Record<string, unknown>): Book {
  // Events live in "state", not "events"
  const events = (rawRound.state ?? rawRound.events ?? []) as BookEvent[];

  // crashPoint and chartPath are inside the reveal event, not at top level
  const reveal = events.find(e => e.type === 'reveal') as any;

  return {
    id: (rawRound.betID ?? rawRound.id ?? 0) as number,
    payoutMultiplier: rawRound.payoutMultiplier as number,
    events,
    crashPoint: reveal?.crashPoint ?? 0,
    chartPath: reveal?.chartPath ?? [],
    criteria: (rawRound.criteria ?? rawRound.mode) as string,
  };
}
```

**This is the #1 source of white-screen bugs.** If you don't normalize, the game receives empty/undefined data and renders nothing.

---

## 9. Mode Parameter Mapping

### The Problem

Python and JavaScript stringify numbers differently:

| Language | `str(2.0)` | `str(1.25)` |
|----------|-----------|-------------|
| Python | `"2.0"` | `"1.25"` |
| JavaScript | `"2"` | `"1.25"` |

### The Fix

JavaScript must manually add `.0` for integer-like floats:

```typescript
function targetToMode(target: number): string {
  let str = String(target);
  if (!str.includes('.')) str += '.0';
  return `mode_${str.replace('.', '_')}`;
}

// Examples:
targetToMode(2.0)    // → "mode_2_0"    (NOT "mode_2")
targetToMode(1.25)   // → "mode_1_25"
targetToMode(100.0)  // → "mode_100_0"  (NOT "mode_100")
```

**Sending the wrong mode name causes the RGS to return an error** because it can't find a matching mode in `index.json`. This was the root cause of a white-screen-on-deploy bug.

---

## 10. Stale Round Recovery

### The Problem

If the player refreshes during an active round, the RGS still has that round open. The next `/wallet/play` call will fail because there's already an active bet.

### The Fix

Check `auth.round` on startup and close stale rounds with non-zero payout:

```typescript
const auth = await rgs.authenticate();

if (auth.round && Object.keys(auth.round).length > 0) {
  // Only close rounds with non-zero payout (zero-payout rounds are auto-closed by RGS)
  if (auth.round.payoutMultiplier > 0) {
    console.info('Stale active round detected, closing...');
    try {
      await rgs.endRound();
      const refreshed = await rgs.getBalance();
      actor.send({ type: 'UPDATE_BALANCE', balance: refreshed.balance.amount, currency: refreshed.balance.currency });
    } catch (err) {
      // Don't throw — round may already be closed
      console.warn('Failed to close stale round:', err);
    }
  } else {
    console.info('Stale round with zero payout detected (already auto-closed by RGS)');
    // Just refresh balance, no need to call endRound
    const refreshed = await rgs.getBalance();
    actor.send({ type: 'UPDATE_BALANCE', balance: refreshed.balance.amount, currency: refreshed.balance.currency });
  }
}
```

**Rules:**
- `auth.round` may be an empty object `{}` — check `Object.keys().length > 0`
- Swallow errors from `endRound` — the round might already be auto-closed
- Always refresh balance after closing a stale round

---

## 11. Bet Replay Mode

**Bet replay is MANDATORY for approval.** The game must support `?replay=true` to replay any historical round without a player session.

### Requirements

- [ ] Detect `replay=true` query parameter
- [ ] Fetch replay data via `GET /bet/replay/{game}/{version}/{mode}/{event}`
- [ ] **No authenticated API calls** (no session, no `/wallet/authenticate`)
- [ ] Show loading state while fetching
- [ ] Display "Play" button — do NOT auto-start
- [ ] **Disable all betting UI** (hide bet controls, hide autoplay)
- [ ] Play full animation with sounds
- [ ] Show final results (bet cost, payout, win amount)
- [ ] Add "Play Again" button to rewatch
- [ ] Handle fetch errors with user-friendly message
- [ ] **No way to transition to normal play from replay**

### Implementation

```typescript
if (params.replay) {
  const replay = await rgs.fetchReplay(
    params.replayGame,
    params.replayVersion,
    params.replayMode,
    params.replayEvent
  );
  const book = normalizeBook(replay.state);
  // Set context with replayBook, no session needed
  setGameContext({ replayBook: book, ... });
}
```

---

## 12. Social Casino Terminology

When `?social=true` (stake.us), ALL gambling terms must be replaced.

### Required Replacements

| Restricted Term | Replacement |
|----------------|-------------|
| bet / bets | play / plays |
| betting | playing |
| total bet | total play |
| bet amount | play amount |
| win / wins | payout / payouts |
| winnings | coins won |
| won | paid out |
| balance | coins |
| wager | play |
| money / cash | coins |
| gamble | play |
| deposit | get coins |
| withdraw | redeem |
| credit | balance |
| buy bonus | get bonus |
| currency | token |
| stake | play amount |

### Implementation

Use regex-based replacement with word boundaries, ordered multi-word phrases first:

```typescript
const SOCIAL_TERMS: ReadonlyArray<[RegExp, string]> = [
  // Multi-word phrases FIRST (order matters)
  [/\bwin feature\b/gi, 'Play Feature'],
  [/\btotal bet\b/gi, 'Total Play'],
  [/\bbet amount\b/gi, 'Play Amount'],
  // Single words LAST
  [/\bbets\b/gi, 'Plays'],
  [/\bbet\b/gi, 'Play'],
  [/\bwins\b/gi, 'Payouts'],
  [/\bwin\b/gi, 'Payout'],
  [/\bbalance\b/gi, 'Coins'],
];

function createTerms(social: boolean) {
  if (!social) return (text: string) => text;
  return (text: string) => {
    let result = text;
    for (const [pattern, replacement] of SOCIAL_TERMS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  };
}
```

**Apply `t()` to ALL user-visible text:** labels, buttons, rules modal, result screen, error messages.

**Common mistake:** Hardcoded error strings bypass `t()`. For example, `errorToast = 'Insufficient funds'` contains the restricted word "funds" and won't be filtered. Always use `t()`:
```typescript
// BAD — "funds" is a restricted term in social mode
errorToast = 'Insufficient funds';

// GOOD — goes through terminology filter
errorToast = t('Insufficient balance');
```

---

## 13. Math Engine

### Output Files (3 per mode, strictly enforced)

**1. `index.json`** — Mode metadata:
```json
{
  "modes": [
    {
      "name": "mode_name",
      "cost": 1.0,
      "events": "books_mode_name.jsonl.zst",
      "weights": "lookUpTable_mode_name_0.csv"
    }
  ]
}
```

**2. `lookUpTable_{mode}_0.csv`** — Simulation weights (NO header row):
```
0,1000000000,0
1,1000000000,0
2,500000000,150
3,10000000,2500
```
Format: `sim_id,weight,payoutMultiplier`

Columns:
- `sim_id`: Simulation number (0-indexed, matches line in books file)
- `weight`: Probability weight (larger = more likely to be selected)
- `payoutMultiplier`: Payout as integer × 100 (200 = 2.00x, 2500 = 25.00x)

**3. `books_{mode}.jsonl.zst`** — Zstandard-compressed JSONL, one simulation per line:
```json
{"id":1,"payoutMultiplier":200,"events":[...]}
```

### Required Fields in Every Simulation

- `"id"`: integer (simulation number)
- `"events"`: array of event dicts
- `"payoutMultiplier"`: integer (multiplier * 100)

### RTP Rules

- Must be between **90.0% and 98.0%**
- All modes must be within **0.5%** of each other
- Formula: `RTP = sum(payouts) / sum(bets)` over all simulations
- Run **100,000 – 1,000,000** simulations per mode for statistical stability
- High-payout modes need more simulations (auto-scale by target)

### Simulation Quality Rules

- Reasonable hit-rate for non-zero wins (at least 1 in 20 bets)
- No single simulation should dominate hit-rate overwhelmingly
- Payout diversity: intermediate wins must exist between small and max payouts
- Maximum win must be realistically obtainable (more frequent than 1 in 10,000,000)
- Zero-weight payouts should NOT dominate

---

## 14. Build & Deployment

### SvelteKit Configuration

```javascript
// svelte.config.js
import adapter from "@sveltejs/adapter-static";
export default {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "index.html",  // SPA mode
    }),
  },
};
```

```typescript
// +layout.ts
export const prerender = true;
export const ssr = false;
```

### The Base Path Problem

Stake Engine serves games from `/{gameId}/{version}/`, but SvelteKit generates absolute paths (`/_app/...`). This causes 404s on every asset.

### Solution: Two-Part Fix

**Part 1: Runtime `<base>` tag** in `app.html`:
```html
<script>
  (function() {
    var p = location.pathname;
    var dir = p.endsWith('/') ? p : p.substring(0, p.lastIndexOf('/') + 1);
    var b = document.createElement('base');
    b.href = dir;
    document.head.appendChild(b);
  })();
</script>
```

**Part 2: Post-build script** (`scripts/fix-base-path.cjs`):
```javascript
// Run after vite build:
// 1. Rewrite /_app/ → ./_app/ (relative paths)
// 2. Replace base: "" with runtime base detection:
//    base: new URL(".", document.baseURI).pathname.replace(/\/$/, "")

const fs = require('fs');
const indexPath = './build/index.html';
let html = fs.readFileSync(indexPath, 'utf-8');

// Make asset paths relative
html = html.replace(/"\/_app\//g, '"./_app/');
html = html.replace(/'\/_app\//g, "'./_app/");

// Replace static base with runtime detection
html = html.replace(
  /base:\s*""/g,
  'base: new URL(".", document.baseURI).pathname.replace(/\\/$/, "")'
);

fs.writeFileSync(indexPath, html);
```

**Package.json:**
```json
{
  "scripts": {
    "build": "vite build && node scripts/fix-base-path.cjs"
  }
}
```

---

## 15. Audio & Assets

### Rules

- **No external requests** — all fonts, images, audio must be in `/static/`
- Audio files go in `/static/audio/`
- Use relative paths: `./audio/file.mp3` (NOT `/audio/file.mp3`)
- Provide dual format: `.webm` (Chrome/Firefox) + `.mp3` (Safari fallback)
- Use **Howler.js** for audio (lazy-load, multi-format, volume control)

### Howler.js Pattern

```typescript
const SOUNDS = {
  bet: { src: ['./audio/bet.webm', './audio/bet.mp3'], volume: 0.3 },
  win: { src: ['./audio/win.webm', './audio/win.mp3'], volume: 0.5 },
};

// Lazy-load: create Howl instances only on first play
let howls: Map<string, Howl> = new Map();

function play(name: string) {
  if (!howls.has(name)) {
    howls.set(name, new Howl(SOUNDS[name]));
  }
  howls.get(name)!.play();
}
```

### Game Tile Assets (Required for Approval)

- **Background**: High-res PNG or JPG
- **Foreground**: High-res PNG with transparent background
- **Provider Logo**: High-res PNG with transparent background
- Combined background + foreground must not exceed 3MB

---

## 16. Svelte 5 Gotchas

### `$effect` + `$state` Infinite Loops

**Never read and write the same `$state` inside `$effect`:**
```typescript
// BAD: effect_update_depth_exceeded
let count = $state(0);
$effect(() => { count = count + 1; });

// GOOD: use untrack() for reads that shouldn't trigger re-run
$effect(() => {
  const current = untrack(() => count);
  count = current + 1;
});
```

### Child Method Calls in `$effect`

If a child component method reads/writes `$state`, Svelte tracks those as parent effect dependencies:
```typescript
// BAD: autoplayRef.tick() reads $state internally, triggers re-run
$effect(() => {
  if (gameState === 'result') autoplayRef.tick();
});

// GOOD: wrap in untrack
$effect(() => {
  if (gameState === 'result') untrack(() => autoplayRef.tick());
});
```

### `$derived` from XState Snapshot

XState snapshots change on EVERY event (including `UPDATE_MULTIPLIER` at 30-60fps). Using `$derived` from the snapshot in `$effect` causes continuous re-runs:

```typescript
// BAD: fires on every multiplier tick
let state = $derived(snapshot.value);
$effect(() => { if (state === 'result') doSomething(); });

// GOOD: use actor.subscribe() with manual state detection
let previousState = '';
actor.subscribe((snap) => {
  const current = snap.value;
  if (current !== previousState) {
    previousState = current;
    if (current === 'result') doSomething();
  }
});
```

### Module-Level Context (Not Svelte Context)

`setContext()` throws if called inside `$effect()` or async code. Use a module-level singleton:

```typescript
// context.ts
let _ctx: GameContext | null = null;

export function setGameContext(ctx: GameContext): void { _ctx = ctx; }
export function getGameContext(): GameContext {
  if (!_ctx) throw new Error('Context not initialized');
  return _ctx;
}
```

**Why it's safe:** Only one game instance per iframe, set once during init, read by children after init completes.

---

## 17. Approval Checklist

### Must-Have UI Features

- [ ] Player can change bet size
- [ ] All bet levels from `/wallet/authenticate` are selectable
- [ ] Current balance displayed
- [ ] Final win amounts clearly shown
- [ ] If multiple winning actions, payout incrementally updates
- [ ] Sound mute/unmute option
- [ ] **Spacebar mapped to the bet button** (CRITICAL — easy to forget)
- [ ] Autoplay requires explicit player confirmation (no single-click auto-bet)

### Rules & Paytable (Accessible from UI)

- [ ] Detailed game rules
- [ ] **RTP of game must match empirical math output** — compute from lookup tables, don't hardcode uniform values (e.g., 93.00% everywhere when actual values range 92.90%–93.06%)
- [ ] Maximum win amount per mode
- [ ] Payout amounts for all symbol/outcome combinations
- [ ] If special symbols: list all obtainable values
- [ ] How to access feature modes (if any)
- [ ] UI button guide
- [ ] Cost of each bet mode

### Required Game Disclaimer

```
Malfunction voids all wins and plays. A consistent internet connection is
required. In the event of a disconnection, reload the game to finish any
uncompleted rounds. The expected return is calculated over many plays. The
game display is not representative of any physical device and is for
illustrative purposes only. Winnings are settled according to the amount
received from the Remote Game Server and not from events within the web
browser.

TM and (c) {year} Stake Engine.
```

### Visual Requirements

- [ ] Free of visual bugs (broken/missing assets, broken animations)
- [ ] Unique audio and visual assets (sample assets = auto-reject)
- [ ] Supports mini-player modal (popout view) without distortion
- [ ] Supports mobile view for common devices
- [ ] All UI functionality usable during screen scaling

### Responsive / Viewport Requirements (From Review)

Stake Engine reviews test at **specific small viewports**. These MUST work without cutoff or overflow:

- [ ] **Popout S (~480×270)**: All popups (bet picker, target picker, autoplay config) must be scrollable with `max-height` + `overflow-y: auto`. Buttons like DONE/START must always be visible (use `flex-shrink: 0` on action rows, only scroll the content grid).
- [ ] **Mobile S (~320×568)**: Balance area must handle large amounts ($25,000+) without pushing elements off-screen. Use `flex-shrink`, `min-width: 0`, and `overflow: hidden` on text containers.
- [ ] **Test with production bet levels** — demo mode may have 7 levels, but production configs can have 33+. All must fit and scroll in the bet picker popup.
- [ ] **Toolbar buttons (info, mute) must not compete with balance** — on narrow screens, move them to a separate row (e.g., `flex-direction: column-reverse` on mobile).

### Test Resolutions (36 viewports)

Every resolution must be verified across 5 screens: **Idle**, **Bet Picker**, **Target Picker**, **Autoplay**, **Game Rules**.

**Portrait Phones (confirmed in review):**

| # | Resolution | Device | Reviewed |
|---|-----------|--------|----------|
| 1 | 320×568 | iPhone SE 1st gen | |
| 2 | 344×882 | Galaxy Z Fold 5 (inner) | Yes |
| 3 | 360×640 | Samsung Galaxy S5, common Android | |
| 4 | 360×740 | Samsung Galaxy S8+ | Yes |
| 5 | 375×667 | iPhone SE (2nd/3rd gen) | Yes |
| 6 | 375×812 | iPhone X/XS/11 Pro | |
| 7 | 390×844 | iPhone 12 Pro | Yes |
| 8 | 393×852 | iPhone 14 Pro | |
| 9 | 412×732 | Google Pixel | |
| 10 | 412×914 | Samsung Galaxy A51/71 | Yes |
| 11 | 412×915 | Pixel 7 / Galaxy S20 Ultra | Yes |
| 12 | 414×736 | iPhone 6+/7+/8+ | |
| 13 | 414×896 | iPhone XR/11 | Yes |
| 14 | 430×932 | iPhone 14 Pro Max | Yes |

**Tablets & Foldables (confirmed in review):**

| # | Resolution | Device | Reviewed |
|---|-----------|--------|----------|
| 15 | 540×720 | Surface Duo | Yes |
| 16 | 768×1024 | iPad Mini | Yes |
| 17 | 820×1180 | iPad Air | Yes |
| 18 | 853×1280 | Asus Zenbook Fold | Yes |
| 19 | 912×1368 | Surface Pro 7 | Yes |
| 20 | 1024×1366 | iPad Pro | Yes |

**Landscape Phones:**

| # | Resolution | Device |
|---|-----------|--------|
| 21 | 568×320 | iPhone SE landscape |
| 22 | 640×360 | Galaxy S5 landscape |
| 23 | 667×375 | iPhone 6/7/8 landscape |
| 24 | 736×414 | iPhone Plus landscape |
| 25 | 780×360 | Android landscape |

**Smart Displays & Desktops (confirmed in review):**

| # | Resolution | Context | Reviewed |
|---|-----------|---------|----------|
| 26 | 400×225 | Stake Engine iframe (minimum) | |
| 27 | 480×270 | Popout S | |
| 28 | 480×320 | Small popout | |
| 29 | 512×288 | 16:9 popout | |
| 30 | 600×400 | Medium window | |
| 31 | 640×480 | VGA / classic | |
| 32 | 768×432 | Wide popout | |
| 33 | 800×600 | Desktop standard | |
| 34 | 1024×600 | Nest Hub | Yes |
| 35 | 1280×720 | Stake Engine desktop (primary review resolution) | |
| 36 | 1280×800 | Nest Hub Max | Yes |

### CSS Breakpoints

| Breakpoint | Target |
|-----------|--------|
| `max-width: 360px` | Narrow phones (iPhone SE 1st gen, 320px) — smallest icons/fonts |
| `max-width: 768px` | Mobile phones — medium icons/fonts |
| `max-height: 320px` | Ultra-compact (iframe 400×225, landscape phones) — horizontal layout |
| Default (>768px, >320px height) | Desktop — full-size icons/fonts |

**Key CSS pattern for scrollable popups on small viewports:**
```css
.popup-panel {
  max-height: 90vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

@media (max-height: 320px) {
  .popup-panel { max-height: 85vh; }
  .popup-header, .popup-actions { flex-shrink: 0; }  /* always visible */
  .popup-content-grid { overflow-y: auto; max-height: 30vh; } /* only this scrolls */
}
```

### Network & Security

- [ ] No errors in network tab
- [ ] No game information logged to console in production
- [ ] No external network requests
- [ ] All assets from Stake Engine CDN

### Post-Approval Restrictions

- Only minor visual fixes allowed after approval
- **NO math changes, NO new modes, NO gameplay mechanic changes**
- Game math is locked once approved

---

## 18. Common Bugs & Fixes

### Bug: White Screen on Deploy

**Cause:** Wrong mode name in `/wallet/play` request (e.g., `"BASE"` instead of `"degen_2_0"`).
**Fix:** Use `targetToMode()` to generate correct mode names matching `index.json`.

**Cause 2:** Absolute asset paths (`/_app/`) instead of relative (`./_app/`).
**Fix:** Run `fix-base-path.cjs` post-build script.

### Bug: "Player does not have active bet" Error

**Cause:** Calling `/wallet/end-round` on an already-closed round (RGS auto-closes rugged rounds with `active: false`).
**Fix:** Track `lastRoundActive` flag from play response, skip `end-round` if `false`.

### Bug: Rugged Rounds Never Settle

**Cause:** State machine routes `rugged → result` directly, skipping `/wallet/end-round`.
**Fix:** Always route through `cashingOut`: `rugged → ANIMATION_DONE → cashingOut → result`.

### Bug: Stale Round Blocks New Bets

**Cause:** Player refreshed mid-round, RGS still has active round.
**Fix:** Check `auth.round` on startup, call `endRound()` to close stale rounds.

### Bug: Chart Animation Too Slow/Fast

**Cause:** Fixed per-tick delay doesn't account for varying `chartPath` lengths between RGS and mock.
**Fix:** Use target-based duration: `totalMs = 3000 + log2(maxMult) * 1500`, divided by `path.length`.

### Bug: MCap/Holders Display Jitters

**Cause:** Updating derived values on every multiplier tick (30-60fps).
**Fix:** Quantize the cosmetic multiplier (e.g., to 0.5 steps) and round display values.

### Bug: `effect_update_depth_exceeded`

**Cause:** `$effect` reads and writes the same `$state` variable.
**Fix:** Use `untrack()` for reads, or move writes to `setTimeout`/`setInterval` callbacks.

### Bug: Svelte `lifecycle_outside_component` Error

**Cause:** Calling `setContext()` inside an async function or `$effect`.
**Fix:** Use module-level singleton pattern instead of Svelte context.

### Bug: Audio Files 404 on Deploy

**Cause:** Absolute paths (`/audio/file.mp3`) resolve to CDN root instead of game directory.
**Fix:** Use relative paths (`./audio/file.mp3`) — the `<base>` tag makes them resolve correctly.

### Bug: RTP Values in Info Section Don't Match Math Tab

**Cause:** Hardcoded uniform RTP (e.g., "93.00%" for every mode) instead of computing from actual lookup table data.
**Fix:** Compute empirical RTP from `lookUpTable_{mode}_0.csv`: `RTP = sum(weight * payoutMultiplier) / (sum(weight) * 100)`. Each mode has a different RTP (e.g., 92.90% for 50x, 93.06% for 10x). Stake Engine's Math tab shows the real values and the Info section must match.

### Bug: Restricted Wording in Social Mode Error Messages

**Cause:** Error strings hardcoded in JS (e.g., `'Insufficient funds'`) bypass the `t()` terminology filter, leaving restricted gambling terms visible on stake.us.
**Fix:** Pass ALL user-visible strings through `t()`, including error toasts, validation messages, and dynamically generated text. Audit every string literal in game logic, not just template text.

### Bug: Popups Cut Off on Popout S (~480×270)

**Cause:** Popup panels have no `max-height` or `overflow-y`, so on viewports shorter than ~320px the bottom of the popup (including action buttons) is unreachable.
**Fix:** Add `max-height: 90vh; overflow-y: auto` to popup panels. On ultra-compact (`max-height: 320px`), make headers and action buttons `flex-shrink: 0` and only scroll the content grid (`max-height: 30vh; overflow-y: auto`).

### Bug: Balance Overflow on Mobile S (~320px)

**Cause:** Large balance amounts (e.g., "$25,000.00") push toolbar buttons (info, mute) off-screen when all elements are in a single row on narrow viewports.
**Fix:** Wrap toolbar buttons and balance in a flex container. On mobile, use `flex-direction: column-reverse` so balance stays on top and buttons move to a separate row below. Add `min-width: 0` and `overflow: hidden` to text containers.

---

## 18. Quality Gates & Review Process

### Approval Gates (5 Stages)

Use these gates to ensure quality at every stage of development. Each gate must pass before moving to the next phase.

#### Gate 1: Before Implementation Starts
- [ ] Game type confirmed (lines/ways/cluster/scatter)
- [ ] `game_id` follows naming convention (`{studio_id}_{version}_{game_type}`)
- [ ] BookEvent contract defined in writing (TypeScript types + Python schema)
- [ ] Both frontend and math teams have reviewed the contract
- [ ] Target RTP confirmed with product team (typically 94-97%)
- [ ] Reference game identified

#### Gate 2: Frontend Code Review
- [ ] `tsc --noEmit` passes — zero type errors
- [ ] All `bookEventHandlerMap` handlers are `async`
- [ ] All `broadcast()` calls are `await`ed
- [ ] `createEventEmitter` result is destructured correctly
- [ ] `setContextEventEmitter` receives object `{ eventEmitter }`
- [ ] EmitterEvent types exported from `.svelte` `<script module>` blocks
- [ ] `createBonusSnapshot` handler reconstructs state without animations
- [ ] Win level `max` (level 10) hides UI correctly
- [ ] `winLevelSoundsPlay/Stop` used for win handlers
- [ ] `BOOK_EVENT_TYPES_TO_RESERVE` includes all resumable event types
- [ ] Resume flow tested: mid-bonus reconnect does not replay animations

#### Gate 3: Math Code Review
- [ ] `game_id` set BEFORE `construct_paths()`
- [ ] All betmodes defined
- [ ] Distributions cover all condition combinations
- [ ] `scatter_triggers` defined (if game has free spins)
- [ ] `anticipation_triggers` computed correctly: `min(triggers.keys()) - 1`
- [ ] Reel CSVs exist at correct `self.reels_path`
- [ ] Simulation run ≥ 1,000,000 rounds
- [ ] RTP within agreed target (± 0.5%)
- [ ] BookEvent `index` fields are sequential in simulation output

#### Gate 4: Integration Review (before QA)
- [ ] BookEvent JSON from Math SDK matches TypeScript types exactly
- [ ] All event types handled in `bookEventHandlerMap`
- [ ] No unhandled event types (frontend logs warning or errors)
- [ ] Resume flow: mid-bonus reconnect tested end-to-end

#### Gate 5: Pre-Launch
- [ ] Full RTP certification complete
- [ ] Win levels validated visually (especially `max` — UI hide fires)
- [ ] Free spin retrigger tested (if applicable)
- [ ] Mid-bonus reconnect tested in staging
- [ ] Performance: no frame drops during win animations
- [ ] No TypeScript `any` or `@ts-ignore` in game logic files

### Code Review Severity Levels

Classify issues found during review:

**BLOCKER** — Must fix before merge:
- Type errors (`tsc --noEmit` fails)
- Missing `await` on `broadcast()` calls
- BookEvent contract mismatch between frontend and math
- Missing handlers for BookEvent types
- RTP outside target range (> 0.5% deviation)

**CRITICAL** — Must fix before QA:
- Resume flow broken (animations replay on reconnect)
- Win level `max` doesn't hide UI
- Stale round recovery missing
- Zero-payout rounds call `endRound()` incorrectly
- Missing `index` fields in BookEvents

**MAJOR** — Should fix:
- Hardcoded strings not using `t()` terminology filter
- Missing error handling for RGS calls
- Performance issues (frame drops during animations)
- Accessibility issues (missing ARIA labels, keyboard navigation)

**MINOR** — Nice to have:
- Code style inconsistencies
- Missing comments on complex logic
- Suboptimal variable names
- Console logs left in production code

---

## 19. Conventions & Best Practices

### Code Style

**TypeScript/JavaScript:**
- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names (avoid single letters except loop counters)
- Use async/await over raw Promises
- Handle errors explicitly (try/catch for async, error states in machines)

**Svelte 5:**
- Use runes API (`$state`, `$derived`, `$effect`) not legacy reactivity
- Keep components small and focused (< 200 lines)
- Extract reusable logic to composables/utilities
- Use `$props()` for component props, destructure with defaults
- Avoid side effects in `$derived` (use `$effect` instead)

**XState v5:**
- One machine per game lifecycle
- Use actors for async operations (RGS calls)
- Keep machine logic pure (no side effects in guards/actions)
- Use context for state data, events for transitions
- Document complex states with comments

### Naming Conventions

**Files:**
- Components: `PascalCase.svelte` (e.g., `BetPicker.svelte`)
- Utilities: `camelCase.ts` (e.g., `formatMoney.ts`)
- Machines: `camelCaseMachine.ts` (e.g., `gameMachine.ts`)
- Types: `camelCase.ts` or `types.ts`

**Variables:**
- Boolean: `isLoading`, `hasError`, `canBet`
- Functions: `handleClick`, `formatBalance`, `calculatePayout`
- Constants: `UPPER_SNAKE_CASE` for true constants
- RGS fields: Match API exactly (`betID`, `payoutMultiplier`, `costMultiplier`)

**Events:**
- XState: `UPPER_SNAKE_CASE` (e.g., `PLACE_BET`, `UPDATE_BALANCE`)
- BookEvents: `camelCase` type field (e.g., `"reveal"`, `"setWin"`)
- DOM: `on:click`, `on:input` (lowercase)

### Error Handling

**RGS API calls:**
```typescript
try {
  const response = await rgs.play(params);
  // Handle success
} catch (error) {
  if (error instanceof RGSError) {
    // Show user-friendly message
    console.error('RGS error:', error.code, error.message);
  } else {
    // Unknown error
    console.error('Unexpected error:', error);
  }
}
```

**State machine:**
- Use `onError` in invoke actors
- Transition to error states (e.g., `idle.error`)
- Store error in context for UI display
- Provide retry mechanisms where appropriate

### Performance

**Avoid:**
- Unnecessary re-renders (use `$derived` wisely)
- Large inline objects/arrays in templates (extract to variables)
- Heavy computations in render path (use `$derived` or memoization)
- Blocking the main thread (use Web Workers for heavy math)

**Optimize:**
- Lazy load heavy components (dynamic imports)
- Debounce/throttle rapid events (input, scroll)
- Use CSS transforms for animations (not top/left)
- Preload critical assets (audio, images)

### Accessibility

**Required:**
- Semantic HTML (`<button>`, `<nav>`, `<main>`)
- ARIA labels for icon-only buttons
- Keyboard navigation (Tab, Enter, Escape)
- Focus management (trap focus in modals)
- Screen reader announcements for game state changes

**Example:**
```svelte
<button
  aria-label="Place bet"
  on:click={handleBet}
  disabled={!canBet}
>
  <BetIcon />
</button>
```

### Testing Strategy

**Manual testing checklist:**
- [ ] Demo mode works (no RGS)
- [ ] Live mode works (with RGS)
- [ ] Replay mode works (with betID)
- [ ] Stale round recovery works
- [ ] All bet modes work
- [ ] Mobile responsive (see Section 17)
- [ ] Audio plays correctly
- [ ] Terminology filter works (social vs real money)
- [ ] Error states display properly

**Browser testing:**
- Chrome/Edge (primary)
- Safari (iOS/macOS)
- Firefox
- Mobile browsers (iOS Safari, Chrome Android)

### Security

**Never:**
- Trust client-side RNG (all outcomes from RGS)
- Store sensitive data in localStorage
- Expose API keys or secrets
- Allow arbitrary code execution
- Bypass RGS validation

**Always:**
- Validate RGS responses
- Sanitize user inputs (if any)
- Use HTTPS for RGS calls
- Follow CSP (Content Security Policy)
- Keep dependencies updated

### Git Workflow

**Commits:**
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Keep commits atomic (one logical change)
- Write descriptive messages (what and why)

**Branches:**
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `fix/*` - bug fixes

**Pull Requests:**
- Reference issue numbers
- Include screenshots/videos for UI changes
- Pass all quality gates (see Section 18)
- Get approval before merging

### Documentation

**Code comments:**
- Explain WHY, not WHAT (code shows what)
- Document complex algorithms
- Add JSDoc for public APIs
- Keep comments up-to-date

**README files:**
- Setup instructions
- Development commands
- Deployment process
- Troubleshooting guide

**CLAUDE.md:**
- Project-specific rules for AI agents
- Common pitfalls and solutions
- Links to relevant documentation

---

## 20. Common Bugs & Fixes

```
1. Parse URL params (sessionID, rgs_url, social, replay, device, lang)
2. Create EventEmitter
3. If no rgs_url → DEMO MODE (mock RGS, mock balance)
4. If replay=true → REPLAY MODE (fetch replay, no auth)
5. If rgs_url → LIVE MODE:
   a. Create RGS client (normalize URL, add https:// if missing)
   b. Create XState actors wrapping RGS calls
   c. Create XState game machine with .provide({ actors })
   d. Call /wallet/authenticate
   e. Send UPDATE_BALANCE to machine
   f. Check auth.round for stale rounds → close if present
   g. Set game context (module-level singleton)
   h. Show loading screen (min 1800ms for branding)
   i. Render <Game /> component
```

---

## Quick Reference: Dev Commands

```bash
# Frontend development
cd apps/{game-name}
pnpm dev          # Start dev server (demo mode, no RGS needed)
pnpm check        # TypeScript / Svelte type checking
pnpm build        # Production build + fix-base-path

# Math engine
cd math/{game_name}
python run.py     # Generate all simulation files
python run.py -m mode_2_0 -n 100000  # Specific mode, custom count

# Upload to Stake Engine
# 1. Upload math/output/ as new math version
# 2. Upload apps/{game}/build/ as new frontend version
```
