"""
Game-specific configuration file for {{GAME_NAME}}.

Inherits from stake-engine-math-sdk Config class.
Customize this file with your game's specific mechanics, symbols, and paytable.
"""

import os
from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode


class GameConfig(Config):
    """Game configuration for {{GAME_NAME}}."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()

        # STEP 1: Set game_id FIRST (before construct_paths)
        self.game_id = "{{GAME_SLUG}}"  # Format: {studio_id}_{version}_{game_type}
        self.provider_number = 0
        self.working_name = "{{GAME_NAME}}"

        # STEP 2: THEN call construct_paths()
        self.construct_paths()

        # Game parameters
        self.wincap = 5000.0
        self.win_type = "lines"  # or "ways", "cluster", "scatter"
        self.rtp = 0.9300  # Target RTP (must be 90.0% - 98.0%)

        # Game dimensions
        self.num_reels = 5
        self.num_rows = [3] * self.num_reels

        # Paytable - TODO: Customize with your symbols and payouts
        # Format: (count, symbol): multiplier
        self.paytable = {
            (5, "W"): 50,
            (4, "W"): 20,
            (3, "W"): 10,
            (5, "H1"): 50,
            (4, "H1"): 20,
            (3, "H1"): 10,
            (5, "H2"): 15,
            (4, "H2"): 5,
            (3, "H2"): 3,
            (5, "H3"): 10,
            (4, "H3"): 3,
            (3, "H3"): 2,
            (5, "H4"): 8,
            (4, "H4"): 2,
            (3, "H4"): 1,
            (5, "L1"): 5,
            (4, "L1"): 1,
            (3, "L1"): 0.5,
            (5, "L2"): 3,
            (4, "L2"): 0.7,
            (3, "L2"): 0.3,
            (5, "L3"): 3,
            (4, "L3"): 0.7,
            (3, "L3"): 0.3,
            (5, "L4"): 2,
            (4, "L4"): 0.5,
            (3, "L4"): 0.2,
        }

        # Paylines - TODO: Define your payline patterns
        # Format: payline_id: [row_indices for each reel]
        self.paylines = {
            1: [1, 1, 1, 1, 1],  # Middle row
            2: [0, 0, 0, 0, 0],  # Top row
            3: [2, 2, 2, 2, 2],  # Bottom row
            4: [0, 1, 2, 1, 0],  # V shape
            5: [2, 1, 0, 1, 2],  # Inverted V
            6: [0, 0, 1, 2, 2],  # Ascending
            7: [2, 2, 1, 0, 0],  # Descending
            8: [1, 0, 1, 2, 1],  # W shape
            9: [1, 2, 1, 0, 1],  # M shape
            10: [0, 1, 1, 1, 2], # Ascending diagonal
            11: [2, 1, 1, 1, 0], # Descending diagonal
            12: [0, 1, 0, 1, 2], # Zigzag up
            13: [2, 1, 2, 1, 0], # Zigzag down
            14: [1, 0, 0, 0, 1], # U shape
            15: [1, 2, 2, 2, 1], # Inverted U
            16: [0, 2, 0, 2, 0], # Alternating
            17: [2, 0, 2, 0, 2], # Alternating inverted
            18: [1, 1, 0, 1, 1], # Dip
            19: [1, 1, 2, 1, 1], # Bump
            20: [0, 1, 2, 2, 2], # Ascending plateau
        }

        # Special symbols - TODO: Define wilds, scatters, etc.
        self.special_symbols = {
            "wild": ["W"],
            "scatter": ["S"],
        }

        # Free spins configuration (if applicable)
        self.freespin_triggers = {
            3: 10,  # 3 scatters = 10 free spins
            4: 15,  # 4 scatters = 15 free spins
            5: 20,  # 5 scatters = 20 free spins
        }

        # Bet modes - TODO: Define your game modes
        self.bet_modes = [
            BetMode(
                name="base",
                reel_count=5,
                row_count=3,
                symbols=["W", "S", "H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"],
                paylines=20,
            ),
            # Add more modes here (bonus buy, free spins, etc.)
        ]

        # Reel strips location
        self.reel_location = os.path.join(self.game_path, "reels")

        # TODO: Create CSV files in reels/ directory:
        # - BR0.csv (base game reels)
        # - FR0.csv (free spin reels, if applicable)
        # Each CSV should have columns for each reel with symbol names
