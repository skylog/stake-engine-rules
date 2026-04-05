"""
Custom executable functions for {{GAME_NAME}} crash game.

Implements the main game logic for generating crash game events.
"""

from typing import List, Dict, Any
from game_calculations import generate_crash_point, generate_chart_path, calculate_payout


def execute_crash_round(
    sim_id: int,
    target: float,
    house_edge: float,
    max_crash: float,
    chart_steps: int = 50
) -> Dict[str, Any]:
    """
    Execute a single crash game round.

    Args:
        sim_id: Simulation ID
        target: Player's sell target multiplier
        house_edge: House edge percentage
        max_crash: Maximum crash multiplier
        chart_steps: Number of chart animation steps

    Returns:
        Dictionary with simulation data including events
    """
    crash_point = generate_crash_point(house_edge, max_crash)
    chart_path = generate_chart_path(crash_point, chart_steps)
    survived = crash_point >= target
    payout_multiplier = int(target * 100) if survived else 0

    events = [
        {
            "index": 0,
            "type": "reveal",
            "crashPoint": crash_point,
            "chartPath": chart_path,
            "gameType": "basegame",
        },
        {"index": 1, "type": "startPump"},
    ]

    if survived:
        events.append({
            "index": 2,
            "type": "setWin",
            "amount": payout_multiplier
        })
    else:
        events.append({
            "index": 2,
            "type": "rugPull",
            "crashMultiplier": crash_point
        })

    events.append({
        "index": len(events),
        "type": "setTotalWin",
        "amount": payout_multiplier
    })
    events.append({
        "index": len(events),
        "type": "finalWin",
        "amount": payout_multiplier
    })

    return {
        "id": sim_id,
        "payoutMultiplier": payout_multiplier,
        "events": events,
    }
