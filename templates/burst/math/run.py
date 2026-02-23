"""
Simulation runner for {{GAME_NAME}} (burst/crash game).

Generates the three required files per mode:
  1. index.json — mode metadata
  2. lookUpTable_{mode}_0.csv — simulation weights
  3. books_{mode}.jsonl.zst — compressed game events

Usage:
  python run.py

Output goes to ./output/

TODO: Implement bonus features (airdrops, safety nets) if enabled.
"""

import json
import math
import os
import random
from pathlib import Path

try:
    import zstandard as zstd
    HAS_ZSTD = True
except ImportError:
    HAS_ZSTD = False
    print("WARNING: zstandard not installed. Output will be uncompressed JSONL.")

from config import (
    GAME_NAME, HOUSE_EDGE, TARGET_RTP, MAX_CRASH, NUM_SIMULATIONS,
    TARGETS, target_to_mode, CHART_PATH_STEPS,
)

OUTPUT_DIR = Path(__file__).parent / "output"


def generate_crash_point() -> float:
    """
    Generate a crash point using inverse distribution:
      P(crash > x) = (1/x) * (1 - house_edge)
    """
    if random.random() < HOUSE_EDGE:
        return 1.0  # Instant rug / honeypot

    r = random.random()
    crash = (1 - HOUSE_EDGE) / r
    return min(round(crash, 2), MAX_CRASH)


def generate_chart_path(crash_point: float) -> list[float]:
    """Generate chart path data points for animation."""
    steps = max(20, int(math.log2(max(crash_point, 1.01)) * CHART_PATH_STEPS / 3))
    path = []
    for i in range(steps + 1):
        t = i / steps
        value = crash_point ** t
        path.append(round(value, 2))
    return path


def generate_simulation(sim_id: int, target: float) -> dict:
    """Generate a single simulation for a given target."""
    crash_point = generate_crash_point()
    chart_path = generate_chart_path(crash_point)
    survived = crash_point >= target
    payout_multiplier = int(target * 100) if survived else 0

    events = [
        {
            "index": 0,
            "type": "reveal",
            "crashPoint": crash_point,
            "chartPath": chart_path,
            "gameType": "basegame",
        },
        {"index": 1, "type": "startPump"},
    ]

    if survived:
        events.append({"index": 2, "type": "setWin", "amount": payout_multiplier})
    else:
        events.append({"index": 2, "type": "rugPull", "crashMultiplier": crash_point})

    events.append({"index": len(events), "type": "setTotalWin", "amount": payout_multiplier})
    events.append({"index": len(events), "type": "finalWin", "amount": payout_multiplier})

    return {
        "id": sim_id,
        "payoutMultiplier": payout_multiplier,
        "events": events,
    }


def run_target(target: float):
    """Run simulations for a single target and write output files."""
    mode_name = target_to_mode(target)
    cost = 1.0  # All modes cost 1x

    print(f"\n--- Target: {target}x (mode: {mode_name}) ---")

    simulations = []
    wins = 0
    total_payout = 0

    for i in range(NUM_SIMULATIONS):
        sim = generate_simulation(i + 1, target)
        simulations.append(sim)
        if sim["payoutMultiplier"] > 0:
            wins += 1
            total_payout += sim["payoutMultiplier"] / 100.0

    total_bet = NUM_SIMULATIONS * cost
    rtp = total_payout / total_bet if total_bet > 0 else 0
    win_rate = wins / NUM_SIMULATIONS
    print(f"  Win rate: {win_rate:.4f} ({win_rate*100:.2f}%)")
    print(f"  RTP: {rtp:.4f} ({rtp*100:.2f}%)")

    # Write JSONL
    jsonl_name = f"books_{mode_name}.jsonl"
    lines = [json.dumps(sim, separators=(",", ":")) + "\n" for sim in simulations]
    raw_data = "".join(lines).encode("utf-8")

    if HAS_ZSTD:
        zst_path = OUTPUT_DIR / f"{jsonl_name}.zst"
        cctx = zstd.ZstdCompressor()
        with open(zst_path, "wb") as f:
            f.write(cctx.compress(raw_data))
        events_file = f"{jsonl_name}.zst"
    else:
        with open(OUTPUT_DIR / jsonl_name, "wb") as f:
            f.write(raw_data)
        events_file = jsonl_name

    # Write CSV
    csv_name = f"lookUpTable_{mode_name}_0.csv"
    weight = 1_000_000_000 // NUM_SIMULATIONS
    with open(OUTPUT_DIR / csv_name, "w") as f:
        for sim in simulations:
            f.write(f"{sim['id']},{weight},{sim['payoutMultiplier']}\n")

    print(f"  Wrote {events_file} + {csv_name}")

    return {
        "name": mode_name,
        "cost": cost,
        "events": events_file,
        "weights": csv_name,
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    index_modes = []
    for target in TARGETS:
        mode_info = run_target(target)
        index_modes.append(mode_info)

    # Write index.json
    with open(OUTPUT_DIR / "index.json", "w") as f:
        json.dump({"modes": index_modes}, f, indent=2)

    print(f"\nDone! {len(TARGETS)} modes, {NUM_SIMULATIONS} sims each.")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
