"""Cost helpers — Workers AI neuron estimates."""

from __future__ import annotations

WAI_NEURON_PER_1K_USD = 0.011  # $11 / 1M neurons
WAI_DAILY_INCLUDED_NEURONS = 10_000


def estimate_usd(
    provider: str,
    input_tokens: int,
    output_tokens: int,
    cost_in: float,
    cost_out: float,
    cost_basis: str | None = None,
) -> tuple[float, str | None]:
    """Return (cost_usd, note)."""
    itok = max(0, int(input_tokens))
    otok = max(0, int(output_tokens))
    if provider == "workers_ai" or cost_basis == "neurons_approx":
        neurons = itok + otok
        wai = (neurons / 1000.0) * WAI_NEURON_PER_1K_USD
        note = (
            f"~${wai * 1000:.4f}/1k calls (neuron estimate, not guaranteed). "
            f"Paid rate ${WAI_NEURON_PER_1K_USD}/1k neurons; "
            f"{WAI_DAILY_INCLUDED_NEURONS:,} neurons/day included on Workers Paid."
        )
        return round(wai, 8), note
    usd = (itok / 1_000_000) * cost_in + (otok / 1_000_000) * cost_out
    return round(usd, 8), None
