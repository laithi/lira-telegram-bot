#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
from bs4 import BeautifulSoup
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATES_TXT = ROOT / "rates.txt"

URL = "https://www.sp-today.com/"


def clean(x):
    x = x.strip()
    x = x.replace(",", "")
    x = x.replace("\u066b", ".")
    x = x.replace("\u066c", ",")
    return x


def main():
    html = requests.get(URL, timeout=10).text
    soup = BeautifulSoup(html, "html.parser")

    rows = soup.select("table.table.table-striped tbody tr")

    out_lines = []
    for tr in rows:
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue

        code_el = tds[0].get_text(strip=True).upper()
        m = code_el.split()
        code = m[0][:3]
        buy = clean(tds[1].get_text())
        sell = clean(tds[2].get_text())

        out_lines.append(f"{code}\n{buy}\n{sell}\n")

    RATES_TXT.write_text("\n".join(out_lines), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
