"""GameState class for {{GAME_NAME}}."""

from src.state.gamestate import GameState as BaseGameState


class GameState(BaseGameState):
    """
    GameState for {{GAME_NAME}}.

    Inherits from base GameState and can be extended with custom logic.
    """

    def __init__(self, config):
        super().__init__(config)
        # Add custom initialization here if needed
