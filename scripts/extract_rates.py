import json
import re
from datetime import datetime, timezone

IN_TXT = "rates.txt"
OUT_JSON = "rates.json"

ORDERED_CURRENCIES = ["KWD", "USD", "SEK", "AED", "GBP", "JOD", "EUR", "SAR"]

def parse_rates_txt(text: str):
    """
    يتوقع شكل:
    CUR
    123.45
    +0.00  (أو -0.41 أو 0.00)
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    rates = {}

    i = 0
    while i < len(lines):
        # العملة تكون مثل: "KWD 🇰🇼"
        cur_line = lines[i]
        m = re.match(r"^([A-Z]{3})\b", cur_line.upper())
        if not m:
            i += 1
            continue

        cur = m.group(1)
        price = None
        change = None

        # السطر التالي السعر
        if i + 1 < len(lines):
            try:
                price = float(lines[i + 1].replace(",", "").replace(":", "."))
            except:
                price = None

        # السطر الثالث التغير
        if i + 2 < len(lines):
            ch = lines[i + 2].replace(" ", "")
            # يقبل 0.00 أو +0.03 أو -0.41
            if re.match(r"^[+-]?\d+(\.\d+)?$", ch):
                try:
                    change = float(ch)
                except:
                    change = None

        rates[cur] = {"mid": price, "change": change}
        i += 3

    # رتب حسب ORDERED_CURRENCIES وضمن وجود كل العملات
    ordered = {}
    for c in ORDERED_CURRENCIES:
        ordered[c] = rates.get(c, {"mid": None, "change": None})

    return ordered

def extract_date(text: str):
    # اختياري: إذا حاب تكتب التاريخ داخل rates.txt كسطر مثل: DATE: 05-01-2026
    m = re.search(r"\b(\d{2}-\d{2}-\d{4})\b", text)
    return m.group(1) if m else None

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
