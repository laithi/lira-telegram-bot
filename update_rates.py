import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

def get_rates():
    url = "https://sp-today.com/currencies"
    # رأس طلب (Header) يحاكي متصفح حقيقي بشكل أفضل لتجنب الحظر
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Referer': 'https://sp-today.com/'
    }
    
    try:
        print("Starting request to website...")
        response = requests.get(url, headers=headers, timeout=20)
        
        if response.status_code != 200:
            return f"Error: Website returned status code {response.status_code}"

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # البحث عن الجداول في الصفحة
        tables = soup.find_all('table')
        if not tables:
            return "Error: No tables found on the page."

        # نختار أول جدول يحتوي على بيانات العملات غالباً
        table = tables[0]

        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"Last Update: {now} (Damascus Time)\n"
        output += "=" * 45 + "\n"
        output += f"{'العملة':<20} | {'شراء':<10} | {'مبيع':<10}\n"
        output += "=" * 45 + "\n"

        rows = table.find_all('tr')
        count = 0

        for row in rows:
            cols = row.find_all(['td', 'th'])
            if len(cols) >= 3:
                # تنظيف النص من أي رموز أو مسافات زائدة
                name = cols[0].get_text(strip=True)
                buy = cols[1].get_text(strip=True)
                sell = cols[2].get_text(strip=True)
                
                # تخطي رأس الجدول إذا كان يحتوي على كلمات بدل أرقام في خانة السعر
                if 'شراء' in buy or 'سعر' in buy:
                    continue
                
                output += f"{name:<20} | {buy:<10} | {sell:<10}\n"
                count += 1
        
        if count == 0:
            return "Error: Could not extract any data rows."
            
        print(f"Successfully extracted {count} currencies.")
        return output

    except Exception as e:
        return f"Script Error: {str(e)}"

if __name__ == "__main__":
    result = get_rates()
    # طباعة النتيجة في الـ Log الخاص بـ GitHub لترقبه
    print(result)
    
    # لا نقوم بتحديث الملف إذا كان هناك خطأ تقني فادح
    if "Script Error" not in result:
        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(result)
        print("File 'ratescur.txt' has been updated.")
