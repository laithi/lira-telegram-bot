import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

def get_rates():
    url = "https://sp-today.com/currencies"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # تحديد وقت التحديث بتوقيت دمشق
        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"Last Update (Damascus Time): {now}\n"
        output += "-" * 40 + "\n"
        output += f"{'Currency':<20} | {'Buy':<10} | {'Sell':<10}\n"
        output += "-" * 40 + "\n"

        # استخراج البيانات من الجدول
        table = soup.find('table')
        rows = table.find_all('tr')[1:] # تخطي العنوان
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 3:
                name = cols[0].text.strip()
                buy = cols[1].text.strip()
                sell = cols[2].text.strip()
                output += f"{name:<20} | {buy:<10} | {sell:<10}\n"
        
        return output
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    data = get_rates()
    with open("rates.txt", "w", encoding="utf-8") as f:
        f.write(data)
