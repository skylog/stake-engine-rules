---
description: Review a Stake Engine game project for compliance with RULES.md
argument-hint: "[game-slug]"  e.g. "cosmic-slots" — or no args to review current directory
allowed-tools: Bash(ls:*), Bash(pnpm build:*), Bash(grep:*), Read, Glob, Grep
---

# /review-game — Review Stake Engine Game for RULES.md Compliance

Two modes depending on arguments:

- `/review-game <game-slug>` — reviews a **sibling directory** (`/Users/n.biryukov/Projects/GAME_SLUG/`)
- `/review-game` (no args) — reviews the **current working directory**

## 1. Resolve Target Project

The user provides: `$ARGUMENTS`

**If arguments provided** (e.g. "cosmic-slots"):
- **Game slug**: the argument
- **Target**: `/Users/n.biryukov/Projects/GAME_SLUG/`
- Verify target exists

**If no arguments**:
- **Target**: current working directory
- If the current directory looks like the toolkit repo (has `templates/` dir), list sibling directories that look like Stake Engine projects (have `apps/` and `math/` dirs) and ask the user to pick one

Verify target has the expected monorepo structure (`apps/`, `math/`, `package.json`). If not, warn the user and ask if they want to continue.

## 2. Load Rules

Read the full rules from one of these locations (first found):
1. `TARGET/docs/STAKE_ENGINE_RULES.md` (symlink in the game project)
2. `/Users/n.biryukov/Projects/stake-engine-rules/RULES.md` (toolkit repo)

## 3. Run Review

Follow the **review steps** below with TARGET set to the resolved directory.

---

# Review Steps

## Phase 1: Project Structure

Check that the project has the required structure:

```
TARGET/
├── apps/*/              — at least one SvelteKit app
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +layout.svelte
│   │   │   ├── +layout.ts
│   │   │   └── +page.svelte
│   │   └── lib/
│   │       ├── components/      — has Game.svelte
│   │       ├── machines/        — has gameMachine.ts
│   │       ├── services/        — rgs.ts, audio.ts, url.ts, terminology.ts, logger.ts
│   │       └── types/           — index.ts with normalizeBook()
│   ├── static/audio/
│   ├── scripts/fix-base-path.cjs
│   ├── svelte.config.js
│   └── package.json
├── math/*/
│   ├── config.py
│   └── run.py
└── package.json
```

Report: missing files, unexpected structure.

## Phase 2: RGS Integration (RULES.md §3, §8, §10)

Read the RGS service file and the types/normalization file. Check:

- [ ] **Response normalization**: events read from `round.state` (NOT `round.events`), round ID from `round.betID` (NOT `round.id`)
- [ ] **`rgs_url` normalization**: adds `https://` if missing
- [ ] **10-second timeout**: all fetch calls use AbortController with timeout
- [ ] **`/wallet/end-round` always called**: even for rugged/lost rounds — trace state machine to verify
- [ ] **Stale round recovery**: on authenticate, checks `auth.round` for non-empty object, calls `endRound()` + `getBalance()`
- [ ] **Error handling**: uses typed error codes (ERR_VAL, ERR_IPB, etc.), has `RgsError` or equivalent

## Phase 3: Money Format (RULES.md §4)

Search the codebase for money handling:

- [ ] **Integer format**: uses `toApiAmount()` / `fromApiAmount()` with 6 decimal places (1,000,000 = $1.00)
- [ ] **No floating-point money math**: no raw multiplication/division on monetary values
- [ ] **AMOUNT_PRECISION = 6** constant defined

## Phase 4: State Machine (RULES.md §6)

Read the game machine file. Check:

- [ ] **Uses XState v5** with `setup()` + `createMachine()`
- [ ] **All states connected**: no orphan states, every state has transitions
- [ ] **Rugged rounds route through endRound**: crashed/lost state → endRound call → result (NOT direct to result)
- [ ] **Actors are stubs**: real implementations provided via `.provide({ actors })`
- [ ] **Error states handled**: network errors, RGS errors don't leave machine stuck

For **slot games**: verify flow `idle → betting → spinning → [winning|losing] → result → idle`
For **burst games**: verify flow `idle → betting → pumping → [cashing_out|rugged] → result → idle`

## Phase 5: Mode Mapping (RULES.md §9)

- [ ] **`targetToMode()` or equivalent**: handles integer-like floats (adds `.0` so `2.0` → `"mode_2_0"`, NOT `"mode_2"`)
- [ ] **Mode names match Python output**: compare with `math/*/config.py` mode definitions

## Phase 6: URL Parameters & Modes (RULES.md §5, §11, §12)

Read the URL service and layout files. Check:

- [ ] **Live mode params**: parses `sessionID`, `rgs_url`, `lang`, `device`, `social`
- [ ] **Replay mode**: supports `?replay=true` with `game`, `version`, `mode`, `event`, `amount`, `currency` params
- [ ] **Social mode**: applies terminology replacement when `?social=true`
- [ ] **Terminology service**: imported and used in UI-facing text

## Phase 7: Build & Deployment (RULES.md §14)

Read the SvelteKit config and build scripts. Check:

- [ ] **adapter-static**: configured with `fallback: "index.html"` (SPA mode)
- [ ] **prerender + no SSR**: `+layout.ts` exports `prerender = true`, `ssr = false`
- [ ] **Base path fix**: `app.html` has runtime `<base>` tag script AND `fix-base-path.cjs` rewrites `/_app/` → `./_app/`
- [ ] **Build script chains**: `vite build && node scripts/fix-base-path.cjs`
- [ ] **All asset paths relative**: no absolute `/audio/`, `/images/` paths in source

## Phase 8: Audio & Assets (RULES.md §15)

- [ ] **Howler.js service**: lazy-loaded, dual format (.webm + .mp3)
- [ ] **Mute toggle exists**: user can mute/unmute
- [ ] **Relative paths**: audio loaded via `./audio/` (not `/audio/`)
- [ ] **No external requests**: all assets are local

## Phase 9: Approval Checklist (RULES.md §17)

Check the UI code (Svelte components) for:

**Must-have features:**
- [ ] Bet size selector (all levels from auth response)
- [ ] Balance display
- [ ] Win amount display
- [ ] Sound mute/unmute control
- [ ] **Spacebar → bet action** (keyboard event listener)
- [ ] Autoplay requires per-action confirmation (no single-click auto-bet)

**Rules & Paytable (accessible from UI):**
- [ ] Game rules accessible (modal/panel)
- [ ] RTP displayed per mode
- [ ] Max win amount shown
- [ ] Payout table for all outcomes

**Disclaimer:**
- [ ] Legal disclaimer text present (check for "Malfunction voids all wins")

**Network & Security:**
- [ ] No `console.log` in production (only behind debug flag)
- [ ] No external URLs in fetch/import

## Phase 10: Svelte 5 Patterns (RULES.md §16)

Scan for known anti-patterns:

- [ ] No `$effect` that reads and writes the same `$state` without `untrack()`
- [ ] No `setContext()` called in async functions or `$effect` blocks
- [ ] Context uses module-level singleton pattern

## Phase 11: Math Engine (RULES.md §13)

Read `math/*/config.py` and `math/*/run.py`. Check:

- [ ] **Output files expected**: `index.json`, `lookUpTable_*.csv`, `books_*.jsonl.zst`
- [ ] **RTP in range**: 90.0% – 98.0%
- [ ] **Mode consistency**: all modes within 0.5% RTP of each other
- [ ] **Simulation count**: at least 100,000 per mode

---

## 4. Report

Output a structured report:

```
# Review: GAME_NAME

## Summary
X/Y checks passed | Z issues found

## ✅ Passing
- [list of passing checks, grouped by phase]

## ❌ Issues
### Critical (will fail approval)
- [issue]: [file:line] — [what's wrong] → [how to fix per RULES.md]

### Warning (may cause bugs)
- [issue]: [file:line] — [what's wrong] → [how to fix per RULES.md]

### Info (recommendations)
- [item]: [suggestion]
```

For each issue, always reference the relevant RULES.md section number and provide the specific fix from the rules.