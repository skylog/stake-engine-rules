# {{GAME_NAME}} - Math Engine (Crash Game)

This directory contains the math engine for {{GAME_NAME}} crash/burst game using the official **stake-engine-math-sdk**.

## Prerequisites

1. **Python 3.12+** installed
2. **stake-engine-math-sdk** cloned and accessible
3. Set `PYTHONPATH` to include the SDK:
   ```bash
   export PYTHONPATH="/path/to/stake-engine-math-sdk:$PYTHONPATH"
   ```

## Setup

1. **Customize game_config.py**:
   - Update `game_id` and `game_slug`
   - Set target RTP and house edge
   - Configure sell targets (default: 1.1x to 100x)
   - Adjust max crash point if needed
   - Enable/disable optional features (airdrops, safety nets)

2. **Customize game_calculations.py** (optional):
   - Modify crash point distribution if needed
   - Adjust chart path generation
   - Add custom payout logic

3. **Customize game_executables.py** (optional):
   - Modify event structure
   - Add bonus features (airdrops, multipliers)
   - Implement safety net mechanics

## Running Simulations

```bash
# Generate simulations (100k rounds for testing)
python run.py

# For production, edit run.py and increase to 1M+ rounds:
# num_sim_args = {mode: int(1e6) for mode in ...}
```

## Output Files

Generated in `library/publish_files/`:
- `index.json` - Mode metadata (one mode per target)
- `lookUpTable_degen_{target}_0.csv` - Simulation weights per target
- `books_degen_{target}.jsonl.zst` - Compressed simulation events per target

## Crash Game Mechanics

### Distribution
Crash games use an inverse distribution:
```
P(crash > x) = (1/x) * (1 - house_edge)
```

This ensures:
- Higher multipliers are rarer
- House edge is mathematically guaranteed
- RTP is consistent across all targets

### Targets
Each target becomes a separate bet mode:
- `degen_1_1` → 1.1x target
- `degen_2_0` → 2.0x target
- `degen_10_0` → 10.0x target
- etc.

Players choose their target before the round starts.

### Events
Each simulation generates:
1. `reveal` - Shows crash point and chart path
2. `startPump` - Animation begins
3. `setWin` or `rugPull` - Win or crash
4. `setTotalWin` - Final payout
5. `finalWin` - Round complete

## Verification

The script automatically runs format checks. Verify:
- ✅ RTP matches target (± 0.5%)
- ✅ All BookEvent indices are sequential
- ✅ Output files match expected format
- ✅ Crash distribution follows inverse curve

## Documentation

See the main RULES.md for:
- Section 13: Math Engine details
- Section 18: Quality Gates (Gate 3: Math Code Review)

For SDK documentation:
- https://stakeengine.github.io/math-sdk/
