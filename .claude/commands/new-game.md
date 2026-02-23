---
description: Create a new Stake Engine game project in a sibling directory
argument-hint: "<game-name> [slot|burst]"  e.g. "Cosmic Slots slot" or "Moon Crash burst"
allowed-tools: Bash(mkdir:*), Bash(ln:*), Bash(git init:*), Bash(pnpm install:*), Bash(ls:*), Read, Write, Glob, Grep, Edit
---

# /new-game — Create New Stake Engine Game Project

Creates a new game project **as a sibling directory** to stake-engine-rules.

## 1. Parse Arguments

The user provides: `$ARGUMENTS`

Parse:
- **Game name**: everything before the last word if the last word is "slot" or "burst"; otherwise, the entire string
- **Game type**: last word if "slot" or "burst"; default to "slot"

Derive:
- `GAME_NAME` = title case (e.g. "Cosmic Slots")
- `GAME_SLUG` = kebab-case (e.g. "cosmic-slots")
- `GAME_SNAKE` = snake_case (e.g. "cosmic_slots")
- `GAME_TYPE` = "slot" or "burst"

If no arguments, ask user for game name and type.

## 2. Paths

- **Templates**: `/Users/n.biryukov/Projects/stake-engine-rules/templates/`
- **Rules repo**: `/Users/n.biryukov/Projects/stake-engine-rules/`
- **Target**: `/Users/n.biryukov/Projects/GAME_SLUG/` (sibling directory)

Verify templates dir exists. Check target doesn't exist — if it does, ask before overwriting.

## 3. Create & Scaffold

Create the target directory, then follow the **shared scaffolding steps** below.

## 4. Initialize Git & Install

```bash
cd TARGET_DIR
git init
pnpm install
```

---

# Shared Scaffolding Steps

These steps are identical for `/new-game` and `/init-game`.

## Create Directory Tree

```
TARGET/
├── apps/
│   └── GAME_SLUG/
│       ├── src/
│       │   ├── routes/
│       │   └── lib/
│       │       ├── components/
│       │       ├── machines/
│       │       ├── services/
│       │       └── types/
│       ├── static/
│       │   └── audio/
│       └── scripts/
├── math/
│   └── GAME_SNAKE/
│       └── output/
└── docs/
```

## Copy & Substitute Templates

Read each template from `templates/` and write to target, replacing:
- `{{GAME_NAME}}` → game name
- `{{GAME_SLUG}}` → kebab-case
- `{{GAME_SNAKE}}` → snake_case
- `{{GAME_TYPE}}` → "slot" or "burst"

### Common templates (ALL game types):

**`templates/common/root/` → project root:**
| Template | Target |
|----------|--------|
| `package.json` | `./package.json` |
| `pnpm-workspace.yaml` | `./pnpm-workspace.yaml` |
| `turbo.json` | `./turbo.json` |
| `gitignore` | `./.gitignore` |
| `nvmrc` | `./.nvmrc` |
| `CLAUDE.md` | `./CLAUDE.md` |

**`templates/common/app/` → `./apps/GAME_SLUG/`:**
| Template | Target |
|----------|--------|
| `package.json` | `apps/GAME_SLUG/package.json` |
| `svelte.config.js` | `apps/GAME_SLUG/svelte.config.js` |
| `vite.config.ts` | `apps/GAME_SLUG/vite.config.ts` |
| `tsconfig.json` | `apps/GAME_SLUG/tsconfig.json` |
| `src/app.html` | `apps/GAME_SLUG/src/app.html` |
| `scripts/fix-base-path.cjs` | `apps/GAME_SLUG/scripts/fix-base-path.cjs` |
| `src/routes/+layout.ts` | `apps/GAME_SLUG/src/routes/+layout.ts` |
| `src/lib/services/rgs.ts` | `apps/GAME_SLUG/src/lib/services/rgs.ts` |
| `src/lib/services/audio.ts` | `apps/GAME_SLUG/src/lib/services/audio.ts` |
| `src/lib/services/logger.ts` | `apps/GAME_SLUG/src/lib/services/logger.ts` |
| `src/lib/services/url.ts` | `apps/GAME_SLUG/src/lib/services/url.ts` |
| `src/lib/services/terminology.ts` | `apps/GAME_SLUG/src/lib/services/terminology.ts` |
| `src/lib/context.ts` | `apps/GAME_SLUG/src/lib/context.ts` |

### Game-type templates (`templates/GAME_TYPE/`):
| Template | Target |
|----------|--------|
| `gameMachine.ts` | `apps/GAME_SLUG/src/lib/machines/gameMachine.ts` |
| `types.ts` | `apps/GAME_SLUG/src/lib/types/index.ts` |
| `Game.svelte` | `apps/GAME_SLUG/src/lib/components/Game.svelte` |
| `+layout.svelte` | `apps/GAME_SLUG/src/routes/+layout.svelte` |
| `+page.svelte` | `apps/GAME_SLUG/src/routes/+page.svelte` |
| `mockRgs.ts` | `apps/GAME_SLUG/src/lib/services/mockRgs.ts` |
| `math/config.py` | `math/GAME_SNAKE/config.py` |
| `math/run.py` | `math/GAME_SNAKE/run.py` |

## Symlink RULES.md

```bash
ln -s /Users/n.biryukov/Projects/stake-engine-rules/RULES.md TARGET/docs/STAKE_ENGINE_RULES.md
```

## Report Results

```
Scaffolded: GAME_NAME (GAME_TYPE)

  apps/GAME_SLUG/       — SvelteKit frontend (Svelte 5 + XState v5)
  math/GAME_SNAKE/      — Python math engine
  docs/                 — RULES.md symlink

  pnpm dev       — dev server (demo mode)
  pnpm build     — production build

Customize:
  machines/gameMachine.ts  — game states
  components/Game.svelte   — main UI
  types/index.ts           — game types
  services/mockRgs.ts      — demo mock
  math/.../config.py       — math model
```