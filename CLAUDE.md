# CLAUDE.md — Stake Engine Rules & Templates

This repo contains the Stake Engine game development toolkit:

## Contents

- `RULES.md` — comprehensive platform rules for AI agents building Stake Engine games
- `templates/` — project scaffolding templates for new games
- `.claude/commands/` — Claude Code skills for project generation

## Skills

- `/new-game <name> [slot|burst]` — create new project as sibling directory
- `/init-game <name> [slot|burst]` — scaffold into current directory

## Templates Structure

```
templates/
├── common/           # Shared across all game types
│   ├── root/         # Monorepo config (package.json, turbo, etc.)
│   └── app/          # SvelteKit app boilerplate (services, config)
├── slot/             # Slot game templates (reels, spins)
└── burst/            # Burst/crash game templates (chart, multiplier)
```

Template files use `{{GAME_NAME}}`, `{{GAME_SLUG}}`, `{{GAME_SNAKE}}` placeholders.

## Key Rules (from RULES.md)

- All game outcomes must be pre-computed as static files
- Money format: integers with 6 decimal places (1,000,000 = $1.00)
- Games run inside an iframe; use `rgs_url` query param for API calls
- RGS response: events in `round.state` (not `round.events`), ID in `round.betID`
- Must support bet replay (`?replay=true`) and social mode (`?social=true`)
- SvelteKit adapter-static with post-build path fix for relative URLs
