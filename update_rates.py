import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz
import re

def get_rates():
    # استخدام المصدر الأساسي (SP-Today) لأنه أدق وأسرع، أو موقع بديل ثابت
    # سنستخدم sp-today مع معالجة ذكية للنص لأنه لا يستخدم جداول بل Divs
    url = "https://sp-today.com/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code != 200:
            return f"Error: Status code {response.status_code}"

        soup = BeautifulSoup(response.content, 'html.parser')
        
        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"المصدر: السوق الموازية (SP Today)\n"
        output += f"توقيت السحب: {now} (بتوقيت دمشق)\n"
        output += "=" * 45 + "\n"
        output += f"{'العملة':<20} | {'شراء':<10} | {'مبيع':<10}\n"
        output += "=" * 45 + "\n"

        # قائمة العملات التي نريد البحث عنها
        currencies_to_find = [
            ("الدولار الأمريكي", "USD"),
            ("اليورو", "EUR"),
            ("التركية", "TRY"),
            ("الذهب عيار 21", "Gold 21"),
            ("الذهب عيار 18", "Gold 18")
        ]

        data_found = False
        
        # البحث في عناصر الموقع
        # sp-today يستخدم هيكلية معقدة قليلاً، لذا سنبحث عن النصوص مباشرة
        for ar_name, code in currencies_to_find:
            # نبحث عن العنصر الذي يحتوي على اسم العملة
            currency_element = soup.find(string=re.compile(ar_name))
            
            if currency_element:
                # نعود للوراء (للعنصر الأب) لنحصل على الحاوية الكاملة للسطر
                parent = currency_element.find_parent(lambda tag: tag.name == 'div' and ('row' in tag.get('class', []) or 'item' in str(tag)))
                
                if not parent:
                    # محاولة بديلة: البحث عن أقرب عناصر span تحتوي أرقام
                    parent = currency_element.find_parent('div')
                
                if parent:
                    # استخراج كل النصوص داخل هذا العنصر وتنظيفها
                    text_content = parent.get_text(separator='|').split('|')
                    numbers = []
                    
                    for text in text_content:
                        # تنظيف النص لاستخراج الأرقام فقط (مع التعامل مع الفواصل)
                        clean_text = text.strip().replace(',', '')
                        if clean_text.isdigit() and len(clean_text) >= 3: # نفترض أن السعر أكثر من 3 خانات
                            numbers.append(clean_text)
                    
                    # عادة الرقم الأول شراء والثاني مبيع أو العكس حسب الموقع
                    # في sp-today غالباً: شراء - مبيع (أو العكس)، سنأخذ أكبر رقمين
                    if len(numbers) >= 2:
                        # عادة في سوريا المبيع هو الرقم الأعلى والشراء هو الرقم الأقل
                        nums = [int(n) for n in numbers[:2]]
                        buy = min(nums)
                        sell = max(nums)
                        
                        output += f"{ar_name:<20} | {buy:<10} | {sell:<10}\n"
                        data_found = True

        if not data_found:
            # محاولة أخيرة باستخدام موقع بديل بسيط جداً (HTML Table) إذا فشل الأول
            # لأن sp-today قد يغير الكلاسات للحماية
            return get_rates_backup()
            
        return output

    except Exception as e:
        return f"Script Error: {str(e)}"

def get_rates_backup():
    """وظيفة احتياطية تستخدم موقعاً بسيطاً جداً في حال فشل الموقع الأول"""
    try:
        url = "https://lirat.org" # موقع يعرض جدول HTML كلاسيكي بسيط
        response = requests.get(url, timeout=30)
        soup = BeautifulSoup(response.content, 'html.parser')
        table = soup.find('table')
        
        if not table: return "Error: Could not find table in backup source."
        
        output = "\n--- (بيانات من المصدر الاحتياطي Lirat.org) ---\n"
        rows = table.find_all('tr')
        
        for row in rows[1:5]: # أول 5 عملات فقط
            cols = row.find_all('td')
            if len(cols) >= 3:
                name = cols[0].get_text(strip=True)
                buy = cols[1].get_text(strip=True)
                sell = cols[2].get_text(strip=True)
                output += f"{name:<20} | {buy:<10} | {sell:<10}\n"
        return output
    except:
        return "Error: Failed to scrape both primary and backup sources."

if __name__ == "__main__":
    result = get_rates()
    print(result)
    
    if "Error" not in result:
        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(result)
        print("✅ Success: ratescur.txt updated.")
    else:
        print(f"❌ Failed: {result}")
        exit(1) # هذا السطر مهم ليقوم GitHub Actions بالإبلاغ عن فشل العملية
