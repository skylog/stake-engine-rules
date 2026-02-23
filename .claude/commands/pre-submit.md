---
description: Final pre-approval check — build, analyze bundle, and verify RULES.md compliance
argument-hint: "[game-slug]"  e.g. "cosmic-slots" — or no args to check current directory
allowed-tools: Bash(ls:*), Bash(pnpm:*), Bash(du:*), Bash(wc:*), Bash(node:*), Read, Glob, Grep
---

# /pre-submit — Final Pre-Approval Check

Runs a full build + bundle analysis + code review before submitting a game for approval. This is the last gate before sending to Stake Engine.

Two modes:
- `/pre-submit <game-slug>` — checks a **sibling directory** (`/Users/n.biryukov/Projects/GAME_SLUG/`)
- `/pre-submit` (no args) — checks the **current working directory**

## 1. Resolve Target Project

The user provides: `$ARGUMENTS`

**If arguments provided** (e.g. "cosmic-slots"):
- **Target**: `/Users/n.biryukov/Projects/GAME_SLUG/`

**If no arguments**:
- **Target**: current working directory
- If the current directory looks like the toolkit repo (has `templates/` dir), list sibling directories that look like Stake Engine projects (have `apps/` and `math/` dirs) and ask the user to pick one

Verify target has the expected monorepo structure (`apps/`, `math/`, `package.json`).

Find the app directory: first directory matching `TARGET/apps/*/`.

## 2. Load Rules

Read the full rules from one of these locations (first found):
1. `TARGET/docs/STAKE_ENGINE_RULES.md`
2. `/Users/n.biryukov/Projects/stake-engine-rules/RULES.md`

---

## Phase 1: Production Build

Run the build from TARGET directory:

```bash
cd TARGET && pnpm build
```

- If build **fails**, report the error and STOP — nothing else matters until build passes
- If build **succeeds**, continue to bundle analysis

## Phase 2: Bundle Analysis

Analyze the build output in `TARGET/apps/*/build/`:

### 2a. Asset Size Check

```bash
du -sh TARGET/apps/*/build/
du -sh TARGET/apps/*/static/audio/
```

Check total asset size. Background + foreground images must not exceed **3MB** combined (RULES.md §15).

List the 10 largest files in the build output.

### 2b. Absolute Path Check

Search the built `index.html` and all JS files in `build/_app/` for absolute paths that will 404 on the CDN:

- `/_app/` — should be `./_app/` (fix-base-path.cjs should have rewritten these)
- `/audio/` — should be `./audio/`
- `/images/` or `/assets/` — should be relative

If any absolute paths found, report as **CRITICAL** — the game will white-screen on deploy.

### 2c. fix-base-path Verification

Read `TARGET/apps/*/build/index.html` and verify:
- Asset references use `./_app/` (relative), not `/_app/` (absolute)
- The `<base>` tag injection script is present
- `base:` uses runtime detection (`new URL(".", document.baseURI)...`), not empty string

### 2d. External Request Check

Search all JS files in the build for external URLs:

```
grep -rE 'https?://' TARGET/apps/*/build/_app/
```

**Allowed**: only the RGS URL (constructed from `rgs_url` param at runtime)
**Not allowed**: any hardcoded external URLs (CDNs, fonts, analytics, etc.)

### 2e. Console Log Check

Search built JS files for console statements that aren't behind a debug flag:

- `console.log` — should not appear in production builds
- `console.warn` — acceptable if behind debug check
- `console.error` — acceptable (error logging)

## Phase 3: Code Review

Run the full `/review-game` review steps (all 11 phases from `/Users/n.biryukov/Projects/stake-engine-rules/.claude/commands/review-game.md` section "Review Steps") against the TARGET directory.

## Phase 4: Game Tile Assets

Check that required approval assets exist:

- [ ] Background image (PNG or JPG) in `TARGET/apps/*/static/` or provided separately
- [ ] Foreground image (PNG, transparent background) in `TARGET/apps/*/static/` or provided separately
- [ ] Provider logo (PNG, transparent background) in `TARGET/apps/*/static/` or provided separately

If missing, report as **WARNING** — these are required for approval but may be provided separately.

## Phase 5: Math Output Validation

Check `TARGET/math/*/output/` directory:

- [ ] `index.json` exists and is valid JSON with `modes` array
- [ ] Each mode has corresponding `lookUpTable_*.csv` and `books_*.jsonl.zst` files
- [ ] CSV files have no header row (first line is data)
- [ ] Mode names in `index.json` match what the frontend sends via `targetToMode()`

If `output/` is empty or missing, report as **CRITICAL** — math hasn't been generated yet.

---

## Report

Output a structured go/no-go report:

```
# Pre-Submit: GAME_NAME

## Verdict: ✅ READY / ❌ NOT READY

## Build
- Status: ✅ Success / ❌ Failed
- Build output: X MB
- Audio assets: X MB
- Largest files: [list top 5]

## Bundle Safety
- Absolute paths: ✅ None / ❌ Found [count] (will white-screen)
- fix-base-path: ✅ Applied / ❌ Not applied
- External requests: ✅ None / ❌ Found [list]
- Console logs: ✅ Clean / ⚠️ Found [count]

## Code Review
- Passed: X/Y checks
- Critical issues: [count]
- Warnings: [count]
[Include full issue list from /review-game]

## Assets
- Game tile images: ✅ Present / ⚠️ Missing
- Total asset size: X MB (limit: 3MB)

## Math
- Output files: ✅ Present / ❌ Missing
- Modes: [list mode names]
- Mode name consistency: ✅ Match / ❌ Mismatch

## ❌ Blockers (must fix before submit)
1. [blocker]: [file] — [what's wrong] → [fix]

## ⚠️ Warnings (should fix)
1. [warning]: [details]

## Action Items
- [ ] [specific thing to fix, in priority order]
```

The verdict is **❌ NOT READY** if there are ANY critical issues or blockers. Otherwise **✅ READY**.