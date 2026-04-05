"""Main file for generating simulation results for {{GAME_NAME}}."""

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from utils.game_analytics.run_analysis import create_stat_sheet
from utils.rgs_verification import execute_all_tests
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs

if __name__ == "__main__":

    # Configuration
    num_threads = 10
    rust_threads = 20
    batching_size = 5000
    compression = True
    profiling = False

    # Number of simulations per mode
    # TODO: Increase to 1,000,000+ for production
    num_sim_args = {
        "base": int(1e5),  # 100,000 simulations for testing
        # Add more modes here as needed
    }

    # What to run
    run_conditions = {
        "run_sims": True,           # Generate simulation books
        "run_optimization": True,   # Optimize RTP distribution
        "run_analysis": True,       # Generate analytics
        "run_format_checks": True,  # Verify output format
    }
    target_modes = list(num_sim_args.keys())

    # Initialize
    config = GameConfig()
    gamestate = GameState(config)
    if run_conditions["run_optimization"] or run_conditions["run_analysis"]:
        optimization_setup_class = OptimizationSetup(config)

    # Run simulations
    if run_conditions["run_sims"]:
        print(f"Generating simulations for {{GAME_NAME}}...")
        create_books(
            gamestate,
            config,
            num_sim_args,
            batching_size,
            num_threads,
            compression,
            profiling,
        )

    # Generate config files (index.json, etc.)
    generate_configs(gamestate)

    # Optimize RTP distribution
    if run_conditions["run_optimization"]:
        print("Running RTP optimization...")
        OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
        generate_configs(gamestate)

    # Generate analytics
    if run_conditions["run_analysis"]:
        print("Generating analytics...")
        custom_keys = [{"symbol": "scatter"}]
        create_stat_sheet(gamestate, custom_keys=custom_keys)

    # Verify output format
    if run_conditions["run_format_checks"]:
        print("Verifying output format...")
        execute_all_tests(config)

    print(f"\nDone! Output files are in: math/{{GAME_SNAKE}}/library/publish_files/")
    print("Files generated:")
    print("  - index.json")
    print("  - lookUpTable_base_0.csv")
    print("  - books_base.jsonl.zst")
