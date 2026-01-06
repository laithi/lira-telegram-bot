import json
import re
from datetime import datetime, timezone
from PIL import Image
import pytesseract

IMG_PATH = "latest.jpg"
OUT_JSON = "rates.json"
OUT_OCR = "ocr.txt"

# ترتيب العملات كما تظهر في النشرة (حسب الصورة المرفقة)
ORDERED_CURRENCIES = ["KWD", "USD", "SEK", "AED", "GBP", "JOD", "EUR", "SAR"]

def normalize(text: str) -> str:
    # تحويل الأرقام العربية إلى إنجليزية
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    for i, d in enumerate(arabic_digits):
        text = text.replace(d, str(i))

    # توحيد فواصل وأخطاء OCR الشائعة
    text = text.replace("،", ",")
    text = text.replace(":", ".")   # أحياناً OCR يحول النقطة إلى :
    text = re.sub(r"[ \t]+", " ", text)
    return text

def extract_date(text: str) -> str | None:
    # تاريخ مثل 05-01-2026
    m = re.search(r"\b(\d{2}-\d{2}-\d{4})\b", text)
    return m.group(1) if m else None

def extract_rates_by_order(text: str):
    """
    استخراج السعر لكل عملة اعتماداً على ترتيب ظهورها.
    نبحث عن العملة ثم نأخذ أول رقم عشري بعدها (السعر).
    نتجاهل أرقام التغير (مثل 0.00 أو 0.41-).
    """
    rates = {}
    upper = text.upper()

    for cur in ORDERED_CURRENCIES:
        # ابحث عن أول ظهور للرمز (حتى لو OCR شوّه بعض الحروف، USD/EUR/SAR غالباً صحيحة)
        idx = upper.find(cur)
        if idx == -1:
            rates[cur] = None
            continue

        # خذ مقطع صغير بعد العملة للبحث عن أرقام
        chunk = upper[idx: idx + 200]

        # التقط أرقام عشرية (361.37, 111.00 ...)
        nums = re.findall(r"\d+(?:\.\d+)?", chunk)

        # فلترة: نريد أول رقم "كبير" أو منطقي كسعر (عادة > 1)
        # واستبعاد أرقام التغير الصغيرة (مثل 0.00)
        price = None
        for n in nums:
            try:
                val = float(n)
            except:
                continue
            # قاعدة بسيطة: السعر غالباً >= 1
            # وللتأكد أكثر: استبعد 0 و 0.xx
            if val >= 1:
                price = val
                break

        rates[cur] = price

    return rates

def main():
    img = Image.open(IMG_PATH)

    # OCR عربي + إنجليزي
    raw = pytesseract.image_to_string(img, lang="ara+eng")
    raw = normalize(raw)

    with open(OUT_OCR, "w", encoding="utf-8") as f:
        f.write(raw)

    bulletin_date = extract_date(raw)
    rates = extract_rates_by_order(raw)

    payload = {
        "source": "Central Bank of Syria (uploaded bulletin image)",
        "bulletin_date": bulletin_date,  # مثال: 05-01-2026
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "image": IMG_PATH,
        "base": "SYP",
        "mode": "official_mid_rates",
        "rates": rates,
        "ordered_currencies": ORDERED_CURRENCIES,
        "notes": [
            "Rates extracted by fixed order to avoid OCR mistakes in currency codes.",
            "If a currency is null, check ocr.txt and adjust ORDERED_CURRENCIES or parsing window."
        ]
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    ok_count = sum(1 for v in rates.values() if isinstance(v, (int, float)))
    print(f"Generated {OUT_JSON} with {ok_count}/{len(ORDERED_CURRENCIES)} rates")

if __name__ == "__main__":
    main()
