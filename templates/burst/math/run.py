"""
Simulation runner for {{GAME_NAME}} (burst/crash game).

Uses the official stake-engine-math-sdk to generate simulations.

This script:
1. Generates crash game simulations for each target
2. Optimizes RTP distribution
3. Creates output files (index.json, CSV, JSONL.zst)
4. Validates output format

Usage:
    python run.py

Output:
    library/publish_files/
    ├── index.json
    ├── lookUpTable_degen_1_1_0.csv
    ├── books_degen_1_1.jsonl.zst
    └── ... (one CSV + JSONL per target)
"""

from gamestate import GameState
from game_config import GameConfig
from game_executables import execute_crash_round

from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs
from src.optimization.optimization_execution import OptimizationExecution
from src.write_data.stat_sheet import create_stat_sheet
from src.tests.execute_all_tests import execute_all_tests


def main():
    """Run crash game simulations using the official SDK."""

    # Initialize configuration
    config = GameConfig()
    gamestate = GameState(config)

    print(f"=== {config.game_id} - Crash Game Simulation ===\n")
    print(f"Targets: {config.targets}")
    print(f"Target RTP: {config.rtp * 100:.2f}%")
    print(f"House Edge: {config.house_edge * 100:.2f}%\n")

    # Simulation parameters
    num_sim_args = {
        mode._target_to_mode_name(target): int(1e5)  # 100k sims for testing
        for target in config.targets
    }

    batching_size = 10_000
    num_threads = 4
    compression = True
    profiling = False

    print("Step 1: Generating simulations...")
    create_books(
        gamestate,
        config,
        num_sim_args,
        batching_size,
        num_threads,
        compression,
        profiling
    )

    print("\nStep 2: Generating configuration files...")
    generate_configs(gamestate)

    print("\nStep 3: Running optimization (if needed)...")
    # Crash games typically don't need optimization since distribution is fixed
    # Uncomment if you want to run optimization:
    # optimization = OptimizationExecution(gamestate, config)
    # optimization.run()

    print("\nStep 4: Creating statistics sheet...")
    create_stat_sheet(gamestate, config)

    print("\nStep 5: Validating output files...")
    execute_all_tests(gamestate, config)

    print("\n✅ Done! Check library/publish_files/ for output.")
    print("\nFor production, increase simulations to 1M+:")
    print("  num_sim_args = {mode: int(1e6) for mode in ...}")


if __name__ == "__main__":
    main()
