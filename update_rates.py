import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

def get_rates():
    # الرابط الذي زودتني به (تحديث مباشر لأسعار الصرف)
    url = "https://www.syria.tv/%D8%A3%D8%B3%D8%B9%D8%A7%D8%B1-%D8%B5%D8%B1%D9%81-%D8%A7%D9%84%D8%B9%D9%85%D9%84%D8%A7%D8%AA-%D9%85%D9%82%D8%A7%D8%A8%D9%84-%D8%A7%D9%84%D9%84%D9%8A%D8%B1%D8%A9-%D8%AA%D8%AD%D8%AF%D9%8A%D8%AB-%D9%85%D8%A8%D8%A7%D8%B4%D8%B1"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en;q=0.9'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code != 200:
            return f"Error: Status code {response.status_code}"

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # في المواقع الإخبارية، البيانات تكون غالباً داخل جداول في محتوى المقال
        tables = soup.find_all('table')
        
        if not tables:
            return "Error: لم يتم العثور على جداول بيانات في صفحة تلفزيون سوريا."

        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"المصدر: تلفزيون سوريا (Syria TV)\n"
        output += f"توقيت السحب: {now} (بتوقيت دمشق)\n"
        output += "=" * 45 + "\n"
        output += f"{'العملة (دمشق)':<20} | {'شراء':<10} | {'مبيع':<10}\n"
        output += "=" * 45 + "\n"

        data_found = False
        
        # سنبحث في أول جدولين (عادة جدول دمشق يكون الأول أو الثاني)
        for table in tables[:2]:
            rows = table.find_all('tr')
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 3:
                    name = cols[0].get_text(strip=True)
                    buy = cols[1].get_text(strip=True)
                    sell = cols[2].get_text(strip=True)
                    
                    # تنظيف وتصفية: نريد فقط الأسطر التي تحتوي على أرقام في خانة المبيع
                    # نتحقق إذا كان النص يحتوي على أرقام
                    clean_sell = sell.replace(',', '').replace('.', '')
                    if clean_sell.isdigit() and len(clean_sell) > 2:
                        output += f"{name:<20} | {buy:<10} | {sell:<10}\n"
                        data_found = True
            
            if data_found: break # إذا وجدنا بيانات دمشق نكتفي بها

        if not data_found:
            return "Error: لم نتمكن من تحليل أرقام العملات من الجداول."
            
        return output

    except Exception as e:
        return f"Script Error: {str(e)}"

if __name__ == "__main__":
    result = get_rates()
    print(result) # لمشاهدة النتيجة في GitHub Actions Logs
    
    # حفظ النتيجة في الملف المطلوب
    if "Error" not in result:
        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(result)
        print("✅ Success: ratescur.txt updated from Syria TV.")
    else:
        print(f"❌ Failed: {result}")
