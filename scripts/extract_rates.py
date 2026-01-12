#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATES_TXT = ROOT / "rates.txt"
RATES_JSON = ROOT / "rates.json"

ORDERED = ["USD", "AED", "SAR", "EUR", "KWD", "SEK", "GBP", "JOD"]


def _to_float(s: str) -> float:
    s = s.strip()
    s = s.replace("\u066b", ".")
    s = s.replace("\u066c", ",")
    s = s.replace(",", "")
    return float(s)


def parse_rates_txt(text: str):
    lines = [ln.strip() for ln in text.splitlines()]
    rates = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line:
            i += 1
            continue
        m = re.match(r"^([A-Z]{3})\b", line)
        if not m:
            i += 1
            continue
        code = m.group(1).upper()
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
        i += 3
    return rates


def build_output(rates_map):
    now = datetime.now(timezone.utc).isoformat()
    out_rates = {}
    for code in ORDERED:
        if code not in rates_map:
            continue
        buy = float(rates_map[code]["buy"])
        sell = float(rates_map[code]["sell"])
        mid = round((buy + sell) / 2, 2)
        out_rates[code] = {
            "buy": buy,
            "sell": sell,
            "mid": mid,
            "change": None
        }
    return {
        "source": "Manual rates feed (rates.txt)",
        "bulletin_date": None,
        "generated_at_utc": now,
        "base": "SYP",
        "mode": "manual_buy_sell",
        "rates": out_rates,
        "ordered_currencies": ORDERED
    }


def main():
    txt = RATES_TXT.read_text(encoding="utf-8", errors="ignore")
    rates_map = parse_rates_txt(txt)
    out = build_output(rates_map)
    RATES_JSON.write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("done")


if __name__ == "__main__":
    main()
