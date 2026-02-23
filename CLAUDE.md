# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A game development toolkit for building games on the Stake Engine platform (stake.com / stake.us). Contains:

- **RULES.md** — the definitive 960-line platform guide (must-read before building any game)
- **templates/** — full project scaffolding for slot and burst/crash games
- **.claude/commands/** — Claude Code skills for automated project generation

This repo is NOT a game itself — it generates game projects.

## Skills

- `/new-game <name> [slot|burst]` — creates a new game project as a sibling directory (e.g., `../my-game/`)
- `/init-game <name> [slot|burst]` — scaffolds into the current working directory
- `/review-game <game-slug>` — reviews a sibling game project for RULES.md compliance
- `/review-game` (no args) — reviews the current directory's game project for RULES.md compliance

Both skills parse the name into `{{GAME_NAME}}` (Title Case), `{{GAME_SLUG}}` (kebab-case), `{{GAME_SNAKE}}` (snake_case), substitute all template placeholders, symlink RULES.md into `docs/`, run `git init` and `pnpm install`.

## Generated Game Stack

| Layer           | Technology                                     |
|-----------------|------------------------------------------------|
| Frontend        | Svelte 5 (runes API)                           |
| Framework       | SvelteKit 2 with adapter-static (SPA, no SSR)  |
| State           | XState v5                                      |
| Audio           | Howler.js                                      |
| Build           | Vite + Turbo                                   |
| Package Manager | pnpm 10.5.0                                    |
| Node            | 18.18.0                                        |
| Math Engine     | Python                                         |

## Template Architecture

### Common templates (`templates/common/`)

**Root** — monorepo config: `package.json` (turbo scripts: `dev`, `build`, `check`, `lint`), `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.gitignore`, `CLAUDE.md`.

**App** — SvelteKit boilerplate with these pre-built services:
- `rgs.ts` — full RGS API client (authenticate, play, endRound, getBalance, fetchReplay, sendEvent) with typed error handling, 10s timeouts, and money conversion (`toApiAmount`/`fromApiAmount` with 6 decimal places)
- `url.ts` — iframe query param parsing (live mode: `sessionID`, `rgs_url`; replay mode: `replay=true`, `game`, `event`; social: `social=true`)
- `audio.ts` — Howler.js singleton with lazy-loading, dual format (.webm + .mp3 fallback)
- `terminology.ts` — social casino term replacement (44 regex patterns, "bet"→"play", "win"→"payout")
- `logger.ts` — opt-in via `?debug=true`
- `context.ts` — module-level singleton (not Svelte context, because `setContext()` throws in async/$effect)
- `fix-base-path.cjs` — post-build script that rewrites `/_app/` → `./_app/` for iframe deployment

### Game-specific templates

**Slot** (`templates/slot/`) — XState machine: `idle → betting → spinning → [winning|losing] → result → idle`. Types include `Book`, `BookEvent`, `normalizeBook()`. Math engine: reel strips, paytable, modes.

**Burst/Crash** (`templates/burst/`) — XState machine: `idle → betting → pumping → [cashing_out|rugged] → result → idle`. Types include crash point, chart path, `TARGETS`, `targetToMode()`. Math engine: house edge, target RTP, crash distribution.

## Critical Platform Rules (from RULES.md)

These are the most common sources of bugs:

1. **RGS response normalization** — events are in `round.state` (NOT `round.events`), round ID is `round.betID` (NOT `round.id`). The `normalizeBook()` function in each game type's `types.ts` handles this.

2. **Money format** — integers with 6 decimal places. `1,000,000 = $1.00`. Never use floating-point arithmetic on money.

3. **`rgs_url` normalization** — may arrive without `https://` prefix from the query param. Must add it.

4. **Mode name mismatch** — Python `str(2.0)` → `"2.0"`, JavaScript `String(2.0)` → `"2"`. The `targetToMode()` function must add `.0` for integer-like floats to match Python's naming.

5. **Stale round recovery** — on authenticate, check if `auth.round` is non-empty, call `endRound()` to close it, then refresh balance.

6. **End-round is mandatory** — must call `/wallet/end-round` for EVERY round including rugged/lost rounds. Skipping causes "player does not have active bet" errors on next play.

7. **Base path** — games are served from `/{gameId}/{version}/` inside an iframe. SvelteKit generates absolute paths that 404. The `app.html` runtime `<base>` tag + `fix-base-path.cjs` post-build script solve this. All asset paths must be relative.

8. **Svelte 5 pitfalls** — `$effect` + `$state` can cause infinite loops (use `untrack()`); XState snapshot changes on every event (track state manually); child method calls in `$effect` need `untrack()` wrapping.

## Math Engine Output Format

Both game types generate files in `math/{game_snake}/output/`:
- `index.json` — mode metadata (name, cost, events file, weights file)
- `lookUpTable_{mode}_0.csv` — simulation weights (NO header row): `sim_number,probability,payout_multiplier`
- `books_{mode}.jsonl.zst` — Zstandard-compressed JSONL with simulation events

RTP must be 90.0%–98.0%, all modes within 0.5% of each other. Run 100k–1M simulations per mode.

## Editing Templates

When modifying templates, remember:
- All files use `{{GAME_NAME}}`, `{{GAME_SLUG}}`, `{{GAME_SNAKE}}`, `{{GAME_TYPE}}` placeholders
- The scaffolding logic is in `.claude/commands/new-game.md` (shared steps) and `.claude/commands/init-game.md` (references new-game)
- `templates/common/` is shared by both game types; `templates/slot/` and `templates/burst/` are type-specific
- Template files map to specific paths in the generated project (see `new-game.md` for the full mapping)
