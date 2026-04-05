"""
Game configuration for {{GAME_NAME}} (burst/crash game).

Uses the official stake-engine-math-sdk Config class.
"""

from src.config.config import Config
from src.config.betmode import BetMode
from src.config.distributions import Distribution


class GameConfig(Config):
    """Configuration for {{GAME_NAME}} crash game."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return

        super().__init__()
        self._initialized = True

        # Game identification
        self.game_id = "{{GAME_SLUG}}"
        self.construct_paths()

        # RTP configuration
        self.rtp = 0.9300  # 93% target RTP
        self.house_edge = 0.07  # 7% house edge

        # Crash game parameters
        self.max_crash = 1000.0
        self.min_crash = 1.0

        # Sell targets (each becomes a separate bet mode)
        self.targets = [1.1, 1.25, 1.5, 2.0, 3.0, 5.0, 10.0, 25.0, 50.0, 100.0]

        # Chart animation parameters
        self.chart_path_steps = 50
        self.base_tick_ms = 60
        self.min_tick_ms = 30

        # Optional features
        self.airdrop_enabled = False
        self.airdrop_trigger_min_target = 3.0
        self.airdrop_probability = 0.15
        self.airdrop_count_weights = {1: 0.70, 2: 0.25, 3: 0.05}

        self.safety_net_enabled = False
        self.safety_net_config = {
            10.0:  {"hit_rate": 0.35, "tiers": ["low"]},
            25.0:  {"hit_rate": 0.40, "tiers": ["low", "mid"]},
            50.0:  {"hit_rate": 0.45, "tiers": ["low", "mid", "high"]},
            100.0: {"hit_rate": 0.50, "tiers": ["low", "mid", "high"]},
        }

        # Create bet modes for each target
        self.bet_modes = self._create_bet_modes()

    def _create_bet_modes(self) -> list[BetMode]:
        """Create a bet mode for each sell target."""
        modes = []

        for target in self.targets:
            mode_name = self._target_to_mode_name(target)

            # Crash game uses Distribution for crash point generation
            distribution = Distribution(
                name=f"crash_dist_{target}",
                type="inverse",  # P(crash > x) = (1/x) * (1 - house_edge)
                params={
                    "house_edge": self.house_edge,
                    "max_value": self.max_crash,
                    "target": target,
                }
            )

            mode = BetMode(
                name=mode_name,
                cost=1.0,  # All modes cost 1x bet
                distribution=distribution,
                metadata={
                    "target": target,
                    "game_type": "crash",
                }
            )
            modes.append(mode)

        return modes

    @staticmethod
    def _target_to_mode_name(target: float) -> str:
        """Convert target multiplier to mode name."""
        return f"degen_{target:.1f}".replace(".", "_")
