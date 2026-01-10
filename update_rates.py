import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz
import re

def get_rates():
    # المصدر: الليرة اليوم (المصدر الأكثر دقة للأسعار في سوريا)
    url = "https://sp-today.com/ar/currency/syr/damascus"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en;q=0.9',
        'Referer': 'https://google.com'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code != 200:
            return f"Error: Status code {response.status_code}"

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # البحث عن التاريخ في الموقع لضمان التحديث
        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"المصدر: الليرة اليوم (SP Today) - دمشق\n"
        output += f"توقيت السحب: {now}\n"
        output += "=" * 45 + "\n"
        output += f"{'العملة':<20} | {'شراء':<10} | {'مبيع':<10}\n"
        output += "=" * 45 + "\n"

        # تعريف العملات التي نريدها مع الكلمات المفتاحية للبحث عنها في الصفحة
        target_currencies = [
            {"name": "الدولار الأمريكي", "key": "USD"},
            {"name": "اليورو", "key": "EUR"},
            {"name": "الليرة التركية", "key": "TRY"},
            {"name": "الذهب عيار 21", "key": "gold_21"},
        ]

        data_found = False

        # البحث عن الصفوف التي تحتوي على الأسعار
        # الموقع يستخدم كلاسات معينة للأسعار، سنحاول استخراجها بدقة
        rows = soup.find_all('tr')
        
        for row in rows:
            text = row.get_text()
            for curr in target_currencies:
                if curr['name'] in text or curr['key'] in text:
                    cols = row.find_all('td')
                    if len(cols) >= 3:
                        # تنظيف الأرقام من أي نصوص زائدة
                        buy = re.sub(r'[^\d]', '', cols[1].get_text(strip=True))
                        sell = re.sub(r'[^\d]', '', cols[2].get_text(strip=True))
                        
                        if buy and sell:
                            # تنسيق الأرقام مع فواصل آلاف
                            buy_fmt = "{:,}".format(int(buy))
                            sell_fmt = "{:,}".format(int(sell))
                            output += f"{curr['name']:<20} | {buy_fmt:<10} | {sell_fmt:<10}\n"
                            data_found = True
                            break

        if not data_found:
            # محاولة بديلة إذا كان الموقع يستخدم Divs بدلاً من Tables
            items = soup.find_all(['div', 'span'], class_=re.compile(r'value|price|amount'))
            if items:
                # هذه المنطقة لتغطية أي تغيير مفاجئ في تصميم الموقع
                return "Error: الموقع غير تصميمه، يرجى تحديث السكربت."
            return "Error: لم يتم العثور على بيانات الأسعار في الصفحة."
            
        return output

    except Exception as e:
        return f"Script Error: {str(e)}"

if __name__ == "__main__":
    result = get_rates()
    print(result) 
    
    if "Error" not in result:
        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(result)
        print("✅ Success: ratescur.txt updated from SP Today.")
    else:
        print(f"❌ Failed: {result}")
        # إنهاء السكربت بفشل ليظهر في GitHub Actions
        import sys
        sys.exit(1)
