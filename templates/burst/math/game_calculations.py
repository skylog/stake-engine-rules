"""
Custom calculations for {{GAME_NAME}} crash game.

Implements crash point generation and chart path calculation.
"""

import math
import random
from typing import List


def generate_crash_point(house_edge: float, max_crash: float) -> float:
    """
    Generate a crash point using inverse distribution.

    P(crash > x) = (1/x) * (1 - house_edge)

    Args:
        house_edge: House edge percentage (e.g., 0.07 for 7%)
        max_crash: Maximum crash multiplier

    Returns:
        Crash point multiplier
    """
    if random.random() < house_edge:
        return 1.0  # Instant crash

    r = random.random()
    crash = (1 - house_edge) / r
    return min(round(crash, 2), max_crash)


def generate_chart_path(crash_point: float, steps: int = 50) -> List[float]:
    """
    Generate chart path data points for animation.

    Args:
        crash_point: Final crash multiplier
        steps: Base number of steps (adjusted by crash point)

    Returns:
        List of multiplier values for animation
    """
    actual_steps = max(20, int(math.log2(max(crash_point, 1.01)) * steps / 3))
    path = []

    for i in range(actual_steps + 1):
        t = i / actual_steps
        value = crash_point ** t
        path.append(round(value, 2))

    return path


def calculate_payout(crash_point: float, target: float, bet_amount: int = 100) -> int:
    """
    Calculate payout for a crash game round.

    Args:
        crash_point: Actual crash multiplier
        target: Player's sell target
        bet_amount: Bet amount in cents (default 100 = $1.00)

    Returns:
        Payout in cents (0 if crashed before target)
    """
    if crash_point >= target:
        return int(target * bet_amount)
    return 0
