---
description: Scaffold a Stake Engine game into the current directory (run from your empty game repo)
argument-hint: "<game-name> [slot|burst]"  e.g. "Cosmic Slots slot" or "Moon Crash burst"
allowed-tools: Bash(mkdir:*), Bash(ln:*), Bash(pnpm install:*), Bash(ls:*), Read, Write, Glob, Grep, Edit
---

# /init-game — Scaffold Stake Engine Game Into Current Directory

Scaffolds the game project **into the current working directory**. Use this when you've already created and `cd`'d into your game repo.

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
- **Target**: current working directory

Verify templates dir exists. If the current dir already has `apps/` or `package.json`, warn user and ask before continuing.

## 3. Scaffold

Follow the **shared scaffolding steps** from `/new-game` — see `/Users/n.biryukov/Projects/stake-engine-rules/.claude/commands/new-game.md` section "Shared Scaffolding Steps".

The target directory is the current working directory.

## 4. Install Dependencies

```bash
pnpm install
```

## 5. Report Results

Same output as `/new-game` — list created structure, commands, and TODO files.
