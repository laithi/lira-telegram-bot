import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

def get_rates():
    url = "https://sp-today.com/currencies"
    
    # Headers متقدمة جداً لمحاكاة متصفح Chrome حقيقي
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    }
    
    try:
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            return f"Error: Status code {response.status_code}"

        soup = BeautifulSoup(response.text, 'html.parser')
        
        # محاولة العثور على أي جدول في الصفحة
        tables = soup.find_all('table')
        
        # إذا لم يجد جداول، ربما البيانات داخل div (تنسيق الجوال)
        if not tables:
            # طباعة جزء من الكود للديناصورات (للدينا لتعرف ماذا حدث)
            print("Debug: No tables found. HTML snippet:", response.text[:500])
            return "Error: Could not find any table on page."

        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"Last Update: {now} (Damascus Time)\n"
        output += "=" * 45 + "\n"
        output += f"{'العملة':<20} | {'شراء':<10} | {'مبيع':<10}\n"
        output += "=" * 45 + "\n"

        data_found = False
        # البحث في كل الجداول الموجودة
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 3:
                    name = cols[0].get_text(strip=True)
                    buy = cols[1].get_text(strip=True)
                    sell = cols[2].get_text(strip=True)
                    
                    # التأكد أننا نسحب أرقاماً وليس عناوين
                    clean_buy = buy.replace(',', '').replace('.', '')
                    if clean_buy.isdigit():
                        output += f"{name:<20} | {buy:<10} | {sell:<10}\n"
                        data_found = True
            
            if data_found: break # إذا وجدنا البيانات في أول جدول لا داعي للباقي

        if not data_found:
            return "Error: Data not found in tables."
            
        return output

    except Exception as e:
        return f"Script Error: {str(e)}"

if __name__ == "__main__":
    result = get_rates()
    print(result) # لمشاهدة النتيجة في الـ Logs
    
    if "Error" not in result:
        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(result)
        print("Done!")
