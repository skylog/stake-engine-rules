"""
Math engine configuration for {{GAME_NAME}} (slot game).

Defines reels, paytable, modes, and RTP target.

TODO: Customize with your game's specific reel strips, symbols, and paytable.
"""

# ---------------------------------------------------------------------------
# Game parameters
# ---------------------------------------------------------------------------

GAME_NAME = "{{GAME_SNAKE}}"

# Target RTP (must be 90.0% - 98.0% for Stake Engine)
TARGET_RTP = 0.93  # 93%

# Number of simulations per mode
NUM_SIMULATIONS = 100_000

# ---------------------------------------------------------------------------
# Reel configuration
# ---------------------------------------------------------------------------

NUM_REELS = 5
NUM_ROWS = 3

# Symbols: high-pay (H1-H5), low-pay (L1-L4), special (WILD, SCATTER)
SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'H5', 'L1', 'L2', 'L3', 'L4', 'WILD', 'SCATTER']

# Reel strips — define symbol distribution per reel
# Each list represents one reel; symbols repeat based on desired frequency.
# TODO: Design reel strips to achieve target RTP
REEL_STRIPS = [
    ['L1', 'L2', 'H3', 'L4', 'L3', 'H1', 'L2', 'L1', 'H4', 'SCATTER',
     'L3', 'H5', 'L4', 'L1', 'H2', 'L2', 'WILD', 'L3', 'L4', 'H3'],
] * NUM_REELS  # Same strip for all reels (customize per reel for better design)

# ---------------------------------------------------------------------------
# Paytable — symbol: {kind: multiplier}
# ---------------------------------------------------------------------------

PAYTABLE = {
    'H1': {3: 50, 4: 200, 5: 1000},
    'H2': {3: 30, 4: 100, 5: 500},
    'H3': {3: 20, 4: 60,  5: 250},
    'H4': {3: 15, 4: 40,  5: 150},
    'H5': {3: 10, 4: 30,  5: 100},
    'L1': {3: 5,  4: 15,  5: 50},
    'L2': {3: 5,  4: 10,  5: 40},
    'L3': {3: 3,  4: 8,   5: 30},
    'L4': {3: 3,  4: 5,   5: 20},
    'WILD': {5: 2000},  # Wild only pays on 5-kind
}

# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------

MODES = [
    {
        'name': 'base',
        'cost': 1.0,
        'description': 'Base game',
    },
    # Add bonus/free-spin modes here:
    # {
    #     'name': 'bonus',
    #     'cost': 100.0,
    #     'description': 'Bonus buy',
    # },
]

# ---------------------------------------------------------------------------
# Free spins config (if applicable)
# ---------------------------------------------------------------------------

FREESPIN_TRIGGER_COUNT = 3  # Scatters needed to trigger
FREESPIN_ROUNDS = 10        # Number of free spins awarded
