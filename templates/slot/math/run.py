"""
Simulation runner for {{GAME_NAME}} (slot game).

Generates the three required files per mode:
  1. index.json — mode metadata
  2. lookUpTable_{mode}_0.csv — simulation weights
  3. books_{mode}.jsonl.zst — compressed game events

Usage:
  python run.py

Output goes to ./output/

TODO: Implement actual reel spinning, payline evaluation, and free spin logic.
"""

import json
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
    GAME_NAME, TARGET_RTP, NUM_SIMULATIONS,
    NUM_REELS, NUM_ROWS, SYMBOLS, REEL_STRIPS, PAYTABLE, MODES,
)

OUTPUT_DIR = Path(__file__).parent / "output"


def spin_reels() -> list[list[str]]:
    """Spin all reels and return a board (reels x rows)."""
    board = []
    for reel_idx in range(NUM_REELS):
        strip = REEL_STRIPS[reel_idx]
        start = random.randint(0, len(strip) - 1)
        symbols = []
        for row in range(NUM_ROWS):
            symbols.append(strip[(start + row) % len(strip)])
        board.append(symbols)
    return board


def evaluate_wins(board: list[list[str]]) -> list[dict]:
    """
    Evaluate winning combinations on the board.

    TODO: Implement your win evaluation logic here:
    - Lines: check each payline for matching symbols
    - Ways: check adjacent reels for matching symbols
    - Cluster: find connected groups of same symbols
    """
    # Placeholder: no wins (implement your logic)
    return []


def generate_simulation(sim_id: int) -> dict:
    """Generate a single simulation outcome."""
    board = spin_reels()
    flat_board = [sym for reel in board for sym in reel]
    wins = evaluate_wins(board)

    total_win = sum(w.get("win", 0) for w in wins)
    payout_multiplier = total_win  # Relative to 1x cost

    events = [
        {
            "index": 0,
            "type": "reveal",
            "board": flat_board,
            "gameType": "basegame",
        },
    ]

    if wins:
        events.append({
            "index": 1,
            "type": "winInfo",
            "totalWin": total_win,
            "wins": wins,
        })
        events.append({
            "index": 2,
            "type": "setWin",
            "amount": total_win,
            "winLevel": 2 if total_win > 20 else 1,
        })

    events.append({"index": len(events), "type": "setTotalWin", "amount": total_win})
    events.append({"index": len(events), "type": "finalWin", "amount": total_win})

    return {
        "id": sim_id,
        "payoutMultiplier": payout_multiplier,
        "events": events,
    }


def run_mode(mode: dict):
    """Run simulations for a single mode and write output files."""
    mode_name = mode["name"]
    cost = mode["cost"]

    print(f"\n--- Mode: {mode_name} (cost: {cost}x) ---")

    simulations = []
    total_payout = 0

    for i in range(NUM_SIMULATIONS):
        sim = generate_simulation(i + 1)
        simulations.append(sim)
        total_payout += sim["payoutMultiplier"] * cost

    total_bet = NUM_SIMULATIONS * cost
    rtp = total_payout / total_bet if total_bet > 0 else 0
    print(f"RTP: {rtp:.4f} ({rtp*100:.2f}%)")

    # Write JSONL (optionally compressed)
    jsonl_name = f"books_{mode_name}.jsonl"
    jsonl_path = OUTPUT_DIR / jsonl_name

    lines = [json.dumps(sim, separators=(",", ":")) + "\n" for sim in simulations]
    raw_data = "".join(lines).encode("utf-8")

    if HAS_ZSTD:
        zst_path = OUTPUT_DIR / f"{jsonl_name}.zst"
        cctx = zstd.ZstdCompressor()
        with open(zst_path, "wb") as f:
            f.write(cctx.compress(raw_data))
        print(f"Wrote {zst_path.name} ({len(simulations)} simulations)")
        events_file = f"{jsonl_name}.zst"
    else:
        with open(jsonl_path, "wb") as f:
            f.write(raw_data)
        print(f"Wrote {jsonl_name} ({len(simulations)} simulations)")
        events_file = jsonl_name

    # Write lookup table CSV (no header)
    csv_name = f"lookUpTable_{mode_name}_0.csv"
    csv_path = OUTPUT_DIR / csv_name
    # Equal weights for now (use optimization algorithm for production)
    weight = 1_000_000_000 // NUM_SIMULATIONS
    with open(csv_path, "w") as f:
        for sim in simulations:
            f.write(f"{sim['id']},{weight},{sim['payoutMultiplier']}\n")
    print(f"Wrote {csv_name}")

    return {
        "name": mode_name,
        "cost": cost,
        "events": events_file,
        "weights": csv_name,
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    index_modes = []
    for mode in MODES:
        mode_info = run_mode(mode)
        index_modes.append(mode_info)

    # Write index.json
    index_path = OUTPUT_DIR / "index.json"
    with open(index_path, "w") as f:
        json.dump({"modes": index_modes}, f, indent=2)
    print(f"\nWrote index.json")

    print(f"\nDone! Output in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
