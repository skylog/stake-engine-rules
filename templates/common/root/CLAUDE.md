# CLAUDE.md

## Project Overview

**{{GAME_NAME}}** is a {{GAME_TYPE}} game being built for the **Stake Engine** platform (stake.com / stake.us).

## Stake Engine Platform Constraints

- **All game outcomes must be pre-computed** as static files (Zstandard-compressed JSON + CSV lookup tables). The RGS selects a simulation at runtime — the frontend never determines results.
- **Monetary values are integers with 6 decimal places**: 1,000,000 = $1.00. Use the API amount format consistently.
- **Games are stateless**: each bet is independent. No jackpots, gamble features, or early cashout across rounds.
- **Games run inside an operator `<iframe>`**. The `rgs_url` query parameter must be used for all API calls (never hardcode URLs).
- **Static files only**: no external network requests (fonts, scripts, etc.). Everything loaded from Stake Engine CDN.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 5 + Canvas 2D (SvelteKit) |
| State Management | XState v5 |
| Build | Vite + Turborepo + pnpm |
| Math Engine | Python 3 (Carrot Math SDK format) |
| Audio | Howler.js |
| Package Manager | pnpm 10.5.0 |
| Node | 18.18.0 |

## Key Architecture

### RGS API Flow
1. `/wallet/authenticate` — validate session, get balance + bet limits
2. `/wallet/play` — place bet, receive simulation data
3. Frontend animates the round
4. `/wallet/end-round` — finalize round (win or loss)

### Game State Machine (XState v5)
See `apps/{{GAME_SLUG}}/src/lib/machines/gameMachine.ts`

### RGS Response Normalization (CRITICAL)
- Events are in `round.state`, NOT `round.events`
- Round ID is `round.betID`, NOT `round.id`
- `rgs_url` may arrive without `https://` prefix — normalize it
- If auth returns non-empty `round`, call `/wallet/end-round` first (stale round)

## Documentation

- `docs/STAKE_ENGINE_RULES.md` — comprehensive AI agent guide (symlink to stake-engine-rules repo)

## Project Structure

```
apps/{{GAME_SLUG}}/     — SvelteKit frontend
math/{{GAME_SNAKE}}/    — Python math engine
docs/                   — Documentation
```

## Dev Commands

- `pnpm dev` — start dev server (demo mode without RGS)
- `pnpm build` — production build
- `pnpm check` — svelte-check

## Approval Checklist (Critical)

Before submitting to Stake Engine:
- **Bet Replay is mandatory** — support `?replay=true` query param
- **Spacebar must be mapped to the bet button**
- All bet levels from `/wallet/authenticate` must be selectable
- Autoplay requires explicit player confirmation per action
- Must recover active rounds on page reload
- RTP must be 90.0%–98.0%; multiple modes within 0.5% of each other
- For stake.us: replace gambling terms when `social=true`
- Game tiles required: Background PNG/JPG, Foreground PNG, Provider Logo PNG
