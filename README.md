# Stake Engine Game Development Toolkit

A comprehensive toolkit for building games on the **Stake Engine** platform (stake.com / stake.us).

## Contents

| Resource | Description |
|----------|-------------|
| [RULES.md](RULES.md) | Platform rules, API integration, known gotchas |
| [templates/](templates/) | Project scaffolding templates (slot + burst) |
| [.claude/commands/](.claude/commands/) | Claude Code skills for project generation |

## Quick Start

### Option 1: Create new project (from this repo)

```
cd stake-engine-rules
/new-game My Game slot
```

Creates `../my-game/` with full monorepo structure.

### Option 2: Scaffold into existing repo

```
cd my-game
/init-game My Game burst
```

Scaffolds the structure into the current directory.

## Skills

| Command | Description |
|---------|-------------|
| `/new-game <name> [slot\|burst]` | Create new project as sibling directory |
| `/init-game <name> [slot\|burst]` | Scaffold into current directory |
| `/review-game <game-slug>` | Review a sibling game project for RULES.md compliance |
| `/review-game` (no args) | Review the current game project for RULES.md compliance |

**Scaffolding arguments:**
- `name` — game title (e.g., "Cosmic Slots", "Moon Crash")
- `type` — `slot` (default) or `burst` (crash-style game)

## Templates

```
templates/
├── common/               # Shared across all game types
│   ├── root/             # Monorepo root config (6 files)
│   │   ├── package.json          pnpm + turbo
│   │   ├── pnpm-workspace.yaml   workspace config
│   │   ├── turbo.json             build orchestration
│   │   ├── gitignore              git ignores
│   │   ├── nvmrc                  Node 18.18.0
│   │   └── CLAUDE.md             project guidance
│   └── app/              # SvelteKit app boilerplate (13 files)
│       ├── package.json          svelte 5, xstate 5, howler
│       ├── svelte.config.js      adapter-static (SPA)
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── scripts/fix-base-path.cjs  post-build path fix
│       └── src/
│           ├── app.html          <base> tag runtime detection
│           ├── routes/+layout.ts  prerender, no SSR
│           └── lib/
│               ├── context.ts           module-level singleton
│               └── services/
│                   ├── rgs.ts           full RGS API client
│                   ├── audio.ts         Howler.js service
│                   ├── logger.ts        debug opt-in logger
│                   ├── url.ts           iframe URL parsing
│                   └── terminology.ts   social casino terms
├── slot/                 # Slot game templates (8 files)
│   ├── gameMachine.ts    idle → betting → spinning → result
│   ├── types.ts          board, symbols, paylines
│   ├── Game.svelte       main orchestrator
│   ├── +layout.svelte    init + auth
│   ├── +page.svelte
│   ├── mockRgs.ts        demo mode
│   └── math/
│       ├── config.py     reels, paytable, RTP
│       └── run.py        simulation runner
└── burst/                # Burst/crash game templates (8 files)
    ├── gameMachine.ts    idle → betting → pumping → rugged → result
    ├── types.ts          crash point, chart path, targets
    ├── Game.svelte       main orchestrator
    ├── +layout.svelte    init + auth
    ├── +page.svelte
    ├── mockRgs.ts        demo mode with inverse distribution
    └── math/
        ├── config.py     house edge, targets, RTP
        └── run.py        crash point generator
```

### Template Variables

| Placeholder | Example | Description |
|---|---|---|
| `{{GAME_NAME}}` | Cosmic Slots | Title case game name |
| `{{GAME_SLUG}}` | cosmic-slots | kebab-case (dirs, package name) |
| `{{GAME_SNAKE}}` | cosmic_slots | snake_case (Python module) |
| `{{GAME_TYPE}}` | slot | Game type identifier |

## Generated Project Structure

```
my-game/
├── apps/my-game/       — SvelteKit frontend (Svelte 5 + XState v5)
│   └── src/lib/
│       ├── components/   Game.svelte + your components
│       ├── machines/     XState state machine
│       ├── services/     RGS, audio, logger, URL, terminology
│       └── types/        Game-specific types + normalizeBook()
├── math/my_game/       — Python math engine
│   ├── config.py         Game parameters
│   ├── run.py            Simulation runner
│   └── output/           Generated files (index.json, CSV, JSONL.zst)
├── docs/               — STAKE_ENGINE_RULES.md (symlink)
├── CLAUDE.md           — Project guidance for AI agents
└── package.json        — pnpm monorepo root
```

## Using Skills from Another Project

To make `/new-game` and `/init-game` available in a different project, add `commandPaths` to that project's `.claude/settings.json`:

```json
{
  "commandPaths": ["/absolute/path/to/stake-engine-rules/.claude/commands"]
}
```

## RULES.md

The comprehensive platform guide covering:
- RGS API (authenticate, play, end-round)
- Money format (integer × 1,000,000)
- URL parameters (rgs_url, social, replay)
- XState patterns and state machine design
- Book & Events system
- RGS response normalization (the #1 source of bugs)
- Stale round recovery
- Social casino terminology
- Build & deploy (adapter-static + base path fix)
- Svelte 5 pitfalls
- Approval checklist

## License

Private — for internal use.
