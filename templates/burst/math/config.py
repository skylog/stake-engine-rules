"""
Math engine configuration for {{GAME_NAME}} (burst/crash game).

Defines crash point distribution, targets, and RTP.

TODO: Customize for your game's specific mechanics.
"""

# ---------------------------------------------------------------------------
# Game parameters
# ---------------------------------------------------------------------------

GAME_NAME = "{{GAME_SNAKE}}"

# House edge and RTP
HOUSE_EDGE = 0.07     # 7%
TARGET_RTP = 0.93     # 93%

# Maximum crash point
MAX_CRASH = 1000.0

# Number of simulations per mode
NUM_SIMULATIONS = 100_000

# ---------------------------------------------------------------------------
# Sell targets
# ---------------------------------------------------------------------------

TARGETS = [1.1, 1.25, 1.5, 2.0, 3.0, 5.0, 10.0, 25.0, 50.0, 100.0]

# Mode name mapping: target -> mode string
def target_to_mode(target: float) -> str:
    """Convert target multiplier to mode name for index.json."""
    return f"degen_{target:.1f}".replace(".", "_")

# ---------------------------------------------------------------------------
# Chart path config
# ---------------------------------------------------------------------------

# Number of data points in the chart path
CHART_PATH_STEPS = 50

# Tick speed range (ms)
BASE_TICK_MS = 60
MIN_TICK_MS = 30

# ---------------------------------------------------------------------------
# Bonus features (optional)
# ---------------------------------------------------------------------------

# Airdrop (free rounds) config
AIRDROP_ENABLED = False
AIRDROP_TRIGGER_MIN_TARGET = 3.0
AIRDROP_PROBABILITY = 0.15
AIRDROP_COUNT_WEIGHTS = {1: 0.70, 2: 0.25, 3: 0.05}

# Safety net checkpoints (for high-volatility targets)
SAFETY_NET_ENABLED = False
SAFETY_NET_CONFIG = {
    10.0:  {"hit_rate": 0.35, "tiers": ["low"]},
    25.0:  {"hit_rate": 0.40, "tiers": ["low", "mid"]},
    50.0:  {"hit_rate": 0.45, "tiers": ["low", "mid", "high"]},
    100.0: {"hit_rate": 0.50, "tiers": ["low", "mid", "high"]},
}
