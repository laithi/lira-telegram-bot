import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

def get_rates():
    # الرابط الخاص بأسعار الصرف في دمشق (أو الصفحة العامة)
    url = "https://www.liratna.com/exchange-rates"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=20)
        if response.status_code != 200:
            return f"Error: Status code {response.status_code}"

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # موقع ليرتنا يعرض البيانات غالباً في جداول ضمن div بـ class معين
        # سنبحث عن أول جدول يحتوي على بيانات
        tables = soup.find_all('table')
        
        if not tables:
            return "Error: No tables found on Liratna."

        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"المصدر: ليرتنا (Liratna)\n"
        output += f"آخر تحديث: {now} (بتوقيت دمشق)\n"
        output += "=" * 45 + "\n"
        output += f"{'العملة':<20} | {'شراء':<10} | {'مبيع':<10}\n"
        output += "=" * 45 + "\n"

        data_found = False
        # نأخذ أول جدول (غالباً هو جدول العملات الرئيسي)
        rows = tables[0].find_all('tr')
        
        for row in rows:
            cols = row.find_all(['td', 'th'])
            if len(cols) >= 3:
                name = cols[0].get_text(strip=True)
                buy = cols[1].get_text(strip=True)
                sell = cols[2].get_text(strip=True)
                
                # تنظيف البيانات من الكلمات غير الضرورية
                if 'شراء' in buy or 'العملة' in name or not buy:
                    continue
                
                output += f"{name:<20} | {buy:<10} | {sell:<10}\n"
                data_found = True

        if not data_found:
            return "Error: Could not parse data from Liratna tables."
            
        return output

    except Exception as e:
        return f"Script Error: {str(e)}"

if __name__ == "__main__":
    result = get_rates()
    print(result) # للتحقق في الـ Logs
    
    # حفظ النتيجة في الملف
    if "Error" not in result:
        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(result)
        print("Success: ratescur.txt updated from Liratna.")
