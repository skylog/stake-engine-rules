"""
Optimization parameters for {{GAME_NAME}} crash game.

Inherits from the SDK OptimizationParameters class.
"""

from src.optimization.optimization_parameters import OptimizationParameters


class GameOptimization(OptimizationParameters):
    """Optimization parameters for crash game RTP tuning."""

    def __init__(self):
        super().__init__()

        # Crash games typically don't need complex optimization
        # since the distribution is mathematically defined
        # Override if you need custom optimization logic
        pass
