"""Optimization setup for {{GAME_NAME}}."""

from src.config.optimization_paramaters import OptimizationParameters


class OptimizationSetup(OptimizationParameters):
    """
    Optimization parameters for {{GAME_NAME}}.

    Inherits from base OptimizationParameters.
    Customize optimization settings here if needed.
    """

    def __init__(self, config):
        super().__init__(config)
        # Add custom optimization parameters here if needed
