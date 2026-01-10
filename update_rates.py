import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz

def get_rates():
    url = "https://sp-today.com/currencies"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        table = soup.find('table')
        if not table:
            return "Error: Could not find the price table."

        syria_tz = pytz.timezone('Asia/Damascus')
        now = datetime.now(syria_tz).strftime('%Y-%m-%d %H:%M:%S')
        
        output = f"Last Update: {now} (Damascus Time)\n"
        output += "-" * 45 + "\n"
        output += f"{'Currency':<20} | {'Buy':<10} | {'Sell':<10}\n"
        output += "-" * 45 + "\n"

        rows = table.find_all('tr')
        data_found = False

        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 3:
                name = cols[0].text.strip().replace('\n', '')
                buy = cols[1].text.strip()
                sell = cols[2].text.strip()
                if buy.replace(',', '').isdigit() or '.' in buy:
                    output += f"{name:<20} | {buy:<10} | {sell:<10}\n"
                    data_found = True
        
        return output if data_found else "Error: No data extracted."
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    data = get_rates()
    # تم تغيير اسم الملف هنا
    if "Error" not in data:
        with open("ratescur.txt", "w", encoding="utf-8") as f:
            f.write(data)
        print("Success: ratescur.txt updated.")
    else:
        print(data)
