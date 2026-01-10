import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz
import re

URL = "https://sp-today.com/currencies"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ar,en;q=0.9",
    "Referer": "https://sp-today.com/",
}

def clean_number(s: str) -> str:
    # يشيل كل شيء عدا الأرقام
    return re.sub(r"[^\d]", "", s or "")

def get_rates():
    r = requests.get(URL, headers=HEADERS, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}")

    soup = BeautifulSoup(r.text, "html.parser")

    syria_tz = pytz.timezone("Asia/Damascus")
    now = datetime.now(syria_tz).strftime("%Y-%m-%d %H:%M:%S")

    output = "المصدر: الليرة اليوم (SP Today) - سوريا (عام)\n"
    output += f"توقيت السحب: {now}\n"
    output += "=" * 55 + "\n"
    output += f"{'العملة':<25} | {'شراء':<12} | {'مبيع':<12}\n"
    output += "=" * 55 + "\n"

    # نحاول نلقط أول جدول بالصفحة
    table = soup.find("table")
    if not table:
        # fallback: إذا تغيّر التصميم
        raise RuntimeError("لم يتم العثور على جدول الأسعار (table).")

    rows = table.find_all("tr")
    found_any = False

    for row in rows:
        cols = row.find_all(["td", "th"])
        if len(cols) < 3:
            continue

        # غالباً: (عملة) (شراء) (مبيع) ...
        currency_text = cols[0].get_text(" ", strip=True)
        buy_text = cols[1].get_text(" ", strip=True)
        sell_text = cols[2].get_text(" ", strip=True)

        buy = clean_number(buy_text)
        sell = clean_number(sell_text)

        # نتأكد إنهم أرقام منطقية
        if not buy or not sell:
            continue

        buy_fmt = "{:,}".format(int(buy))
        sell_fmt = "{:,}".format(int(sell))

        # نخلي اسم العملة مختصر/مرتب
        currency_name = re.sub(r"\s+", " ", currency_text).strip()
        if len(currency_name) > 25:
            currency_name = currency_name[:25]

        output += f"{currency_name:<25} | {buy_fmt:<12} | {sell_fmt:<12}\n"
        found_any = True

    if not found_any:
        raise RuntimeError("تم العثور على جدول لكن لم يتم استخراج أي أسعار.")

    return output

if __name__ == "__main__":
    try:
        result = get_rates()
        print(result)

        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(result)

        print("✅ Success: ratescur.txt updated from SP Today.")
    except Exception as e:
        print(f"❌ Failed: {e}")
        raise
