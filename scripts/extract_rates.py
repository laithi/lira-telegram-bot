#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATES_TXT = ROOT / "rates.txt"
RATES_JSON = ROOT / "rates.json"

# order you want in the bot / frontend
ORDERED = ["USD", "AED", "SAR", "EUR", "KWD", "SEK", "GBP", "JOD"]


def _to_float(s: str) -> float:
    """Normalize 12130,00 → 12130.00 and cast to float."""
    s = s.strip()
    s = s.replace("\u066b", ".").replace("\u066c", ",")  # just in case Arabic separators
    s = s.replace(",", "")
    return float(s)


def parse_rates_txt(text: str):
    """
    Expected format (3-line blocks, separated by blank line):

    USD 🇺🇸
    12130.00
    12200.00

    AED 🇦🇪
    3269.00
    3321.00
    """
    lines = [ln.strip() for ln in text.splitlines()]
    rates: dict[str, dict[str, float]] = {}

    i = 0
    while i < len(lines):
        line = lines[i]
        if not line:
            i += 1
            continue

        # "USD 🇺🇸" -> code = USD
        m = re.match(r"^([A-Z]{3})\b", line)
        if not m:
            i += 1
            continue

        code = m.group(1).upper()

        # لازم يكون عندنا سطرين بعده (مبيع / شراء)
        if i + 2 >= len(lines):
            break

        buy_line = lines[i + 1].strip()
        sell_line = lines[i + 2].strip()

        if not buy_line or not sell_line:
            i += 1
            continue

        try:
            buy = _to_float(buy_line)
            sell = _to_float(sell_line)
        except ValueError:
            i += 1
            continue

        rates[code] = {"buy": buy, "sell": sell}
        i += 3  # ننتقل للبلوك اللي بعده

    return rates


def build_output(rates_map: dict[str, dict[str, float]]):
    """Build final JSON structure consumed by the bot / frontend."""
    now = datetime.now(timezone.utc).isoformat()

    out_rates: dict[str, dict[str, float | None]] = {}
    for code in ORDERED:
        if code not in rates_map:
            continue

        buy = float(rates_map[code]["buy"])
        sell = float(rates_map[code]["sell"])
        mid = round((buy + sell) / 2, 2)

        out_rates[code] = {
            "buy": buy,
            "sell": sell,
            "mid": mid,      # نخليه مشان الكومباتيبليتي
            "change": None,
        }

    return {
        "source": "Manual rates feed (rates.txt)",
        "bulletin_date": None,
        "generated_at_utc": now,
        "base": "SYP",
        "mode": "manual_buy_sell",
        "rates": out_rates,
        "ordered_currencies": ORDERED,
        "notes": [
            "Rates are maintained manually in rates.txt (buy / sell) and compiled to rates.json via scripts/extract_rates.py.",
        ],
    }


def main():
    if not RATES_TXT.exists():
        raise SystemExit(f"rates.txt not found at: {RATES_TXT}")

    txt = RATES_TXT.read_text(encoding="utf-8", errors="ignore")
    rates_map = parse_rates_txt(txt)
    out = build_output(rates_map)

    RATES_JSON.write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("✅ Generated rates.json")
    for c in ORDERED:
        r = out["rates"].get(c)
        if not r:
            continue
        print(c, "=> buy", r["buy"], "| sell", r["sell"], "| mid", r["mid"])


if __name__ == "__main__":
    main()
