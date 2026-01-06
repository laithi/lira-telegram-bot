#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATES_TXT = ROOT / "rates.txt"
RATES_JSON = ROOT / "rates.json"

# order you want in the bot
ORDERED = ["USD", "AED", "SAR", "EUR", "KWD", "SEK", "GBP", "JOD"]

def parse_rates_txt(text: str):
    """
    Expected format (blank lines allowed):
      USD 🇺🇸
      111.00

      AED 🇦🇪
      30.24
      ...
    We will:
      - detect a currency line by leading 3-letter code
      - take the next non-empty line as its value
      - ignore flags/extra text after code
    """
    lines = [ln.strip() for ln in text.splitlines()]
    # keep blank lines for stepping, but we'll search next non-empty for value
    rates = {}

    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^([A-Z]{3})\b", line)
        if not m:
            i += 1
            continue

        code = m.group(1)

        # find next non-empty line as value
        j = i + 1
        while j < len(lines) and lines[j].strip() == "":
            j += 1

        if j >= len(lines):
            rates[code] = None
            i = j
            continue

        raw_val = lines[j].strip().replace(",", "")

        # allow values like 111.00 or 111 or 111٫00 (Arabic decimal)
        raw_val = raw_val.replace("٫", ".")
        try:
            val = float(raw_val)
        except Exception:
            val = None

        rates[code] = val
        i = j + 1

    return rates

def build_output(rates_map: dict):
    now = datetime.now(timezone.utc).isoformat()

    out = {
        "source": "Manual rates feed (rates.txt)",
        "bulletin_date": None,
        "generated_at_utc": now,
        "base": "SYP",
        "mode": "official_mid_rates",
        "rates": {},
        "ordered_currencies": ORDERED,
        "notes": [
            "Rates are maintained manually in rates.txt and compiled to rates.json via GitHub Actions."
        ],
    }

    for code in ORDERED:
        mid = rates_map.get(code)
        out["rates"][code] = {
            "mid": mid if isinstance(mid, (int, float)) else None,
            "change": None
        }

    # also keep any extra currencies that may exist in file
    for code, mid in rates_map.items():
        if code in out["rates"]:
            continue
        out["rates"][code] = {"mid": mid if isinstance(mid, (int, float)) else None, "change": None}

    return out

def main():
    if not RATES_TXT.exists():
        raise SystemExit(f"rates.txt not found at: {RATES_TXT}")

    txt = RATES_TXT.read_text(encoding="utf-8", errors="ignore")
    rates_map = parse_rates_txt(txt)
    out = build_output(rates_map)

    RATES_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("✅ Generated rates.json")
    for c in ORDERED:
        print(c, "=>", out["rates"][c]["mid"])

if __name__ == "__main__":
    main()
