"""
Game state for {{GAME_NAME}} (burst/crash game).

Inherits from the official SDK GameState class.
"""

from src.state.gamestate import GameState as SDKGameState
from game_config import GameConfig


class GameState(SDKGameState):
    """Custom game state for {{GAME_NAME}}."""

    def __init__(self, config: GameConfig):
        super().__init__(config)

        # Add custom state variables here if needed
        # Example: self.current_crash_point = None
