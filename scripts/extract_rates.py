import json
import re
from datetime import datetime, timezone

IN_TXT = "rates.txt"
OUT_JSON = "rates.json"

ORDERED_CURRENCIES = ["KWD", "USD", "SEK", "AED", "GBP", "JOD", "EUR", "SAR"]

def extract_date(text: str):
    m = re.search(r"\b(\d{2}-\d{2}-\d{4})\b", text)
    return m.group(1) if m else None

def to_float(s: str):
    if s is None:
        return None
    s = s.strip().replace(",", "").replace(":", ".")
    try:
        return float(s)
    except:
        return None

def parse_rates_txt(text: str):
    """
    Expected blocks:
      CUR ...
      123.45
      +0.03 / -0.41 / 0.00
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    rates_map = {}

    i = 0
    while i < len(lines):
        cur_line = lines[i].upper()

        m = re.match(r"^([A-Z]{3})\b", cur_line)
        if not m:
            i += 1
            continue

        cur = m.group(1)

        price = to_float(lines[i + 1]) if i + 1 < len(lines) else None

        change_raw = lines[i + 2].replace(" ", "") if i + 2 < len(lines) else None
        # يقبل +0.03 / -0.41 / 0.00
        change = to_float(change_raw) if (change_raw and re.match(r"^[+-]?\d+(\.\d+)?$", change_raw)) else None

        rates_map[cur] = {"mid": price, "change": change}
        i += 3

    # enforce ordered output and ensure all currencies exist
    ordered = {}
    for c in ORDERED_CURRENCIES:
        ordered[c] = rates_map.get(c, {"mid": None, "change": None})

    return ordered

def main():
    with open(IN_TXT, "r", encoding="utf-8") as f:
        txt = f.read()

    bulletin_date = extract_date(txt)
    rates = parse_rates_txt(txt)

    payload = {
        "source": "Manual rates feed (rates.txt)",
        "bulletin_date": bulletin_date,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "base": "SYP",
        "mode": "official_mid_rates",
        "rates": rates,
        "ordered_currencies": ORDERED_CURRENCIES,
        "notes": [
            "Rates are maintained manually in rates.txt and compiled to rates.json via GitHub Actions."
        ]
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print("Generated", OUT_JSON)

if __name__ == "__main__":
    main()
