import json
import re
from datetime import datetime, timezone
from PIL import Image
import pytesseract

IMG_PATH = "latest.jpg"
OUT_JSON = "rates.json"
OUT_OCR = "ocr.txt"

# العملات اللي بدنا نطلعها
CURRENCIES = ["USD", "EUR", "TRY", "SAR", "AED", "JOD", "QAR", "KWD", "BHD", "OMR", "GBP"]

def normalize(text: str) -> str:
    # توحيد أرقام عربية/إنجليزية + مسافات
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    for i, d in enumerate(arabic_digits):
        text = text.replace(d, str(i))
    text = text.replace("،", ",")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text

def extract_rate_lines(text: str):
    """
    استخراج عام:
    نحاول نلاقي أسطر فيها رمز عملة + رقمين (شراء/مبيع) أو رقم واحد.
    لأن شكل نشرات المصارف بيتغير، نخليها مرنة بالبداية.
    """
    rates = {}
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    for line in lines:
        # مثال احتمالي: USD 13250 13300
        # أو: USD 13250
        for cur in CURRENCIES:
            if cur in line.upper():
                # نجيب كل الأرقام اللي بالسطر
                nums = re.findall(r"\d+(?:\.\d+)?", line)
                if not nums:
                    continue

                # إذا في رقمين: نفترض buy/sell
                if len(nums) >= 2:
                    buy = float(nums[0])
                    sell = float(nums[1])
                    rates[cur] = {"buy": buy, "sell": sell, "raw_line": line}
                else:
                    rates[cur] = {"rate": float(nums[0]), "raw_line": line}
    return rates

def main():
    img = Image.open(IMG_PATH)

    # OCR عربي + إنجليزي (بعض النشرات فيها رموز/إنجليزي)
    raw = pytesseract.image_to_string(img, lang="ara+eng")
    raw = normalize(raw)

    with open(OUT_OCR, "w", encoding="utf-8") as f:
        f.write(raw)

    rates = extract_rate_lines(raw)

    payload = {
        "source": "Central Bank of Syria (uploaded bulletin image)",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "image": IMG_PATH,
        "rates": rates,
        "note": "Check ocr.txt if any currency missing; bulletin layout may require custom parsing tweaks."
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print("Generated", OUT_JSON, "with", len(rates), "currencies")

if __name__ == "__main__":
    main()
