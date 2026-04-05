# {{GAME_NAME}} - Math Engine

This directory contains the math engine for {{GAME_NAME}} using the official **stake-engine-math-sdk**.

## Prerequisites

1. **Python 3.12+** installed
2. **stake-engine-math-sdk** cloned and accessible
3. Set `PYTHONPATH` to include the SDK:
   ```bash
   export PYTHONPATH="/path/to/stake-engine-math-sdk:$PYTHONPATH"
   ```

## Setup

1. **Create reel strips** in `reels/` directory:
   ```
   reels/
   ├── BR0.csv  # Base game reels
   └── FR0.csv  # Free spin reels (if applicable)
   ```

   Each CSV should have columns for each reel with symbol names.

2. **Customize game_config.py**:
   - Update paytable with your symbols and payouts
   - Define paylines (or use ways/cluster/scatter)
   - Configure special symbols (wilds, scatters)
   - Set target RTP (90.0% - 98.0%)

## Running Simulations

```bash
# Generate simulations (100k rounds for testing)
python run.py

# For production, edit run.py and increase to 1M+ rounds:
# num_sim_args = {"base": int(1e6)}
```

## Output Files

Generated in `library/publish_files/`:
- `index.json` - Mode metadata
- `lookUpTable_base_0.csv` - Simulation weights (sim_id, weight, payoutMultiplier)
- `books_base.jsonl.zst` - Compressed simulation events

## Verification

The script automatically runs format checks. Verify:
- ✅ RTP is within target range (± 0.5%)
- ✅ All BookEvent indices are sequential
- ✅ Output files match expected format

## Documentation

See the main RULES.md for:
- Section 13: Math Engine details
- Section 18: Quality Gates (Gate 3: Math Code Review)

For SDK documentation:
- https://stakeengine.github.io/math-sdk/
