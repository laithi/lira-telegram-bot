import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- البيانات ---
const DENOMS_NEW = [
  { v: 500, n: { ar: 'سنابل القمح', en: 'Wheat' }, s: '🌾' },
  { v: 200, n: { ar: 'الزيتون', en: 'Olive' }, s: '🫒' },
  { v: 100, n: { ar: 'القطن', en: 'Cotton' }, s: '☁️' },
  { v: 50, n: { ar: 'الحمضيات', en: 'Citrus' }, s: '🍊' },
  { v: 25, n: { ar: 'العنب', en: 'Grapes' }, s: '🍇' },
  { v: 10, n: { ar: 'الياسمين', en: 'Jasmine' }, s: '🌼' }
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: 'خمسة آلاف', en: '5000' }, s: '💵' },
  { v: 2000, n: { ar: 'ألفين', en: '2000' }, s: '💵' },
  { v: 1000, n: { ar: 'ألف', en: '1000' }, s: '💵' },
  { v: 500, n: { ar: 'خمسمئة', en: '500' }, s: '💵' }
];

const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) userStates.set(id, { lang: 'ar', mode: 'oldToNew' });
  return userStates.get(id);
}

// --- لوحة المفاتيح (أزرار ثابتة) ---
function getKeyboard(id) {
  const s = getUS(id);
  const isAr = s.lang === 'ar';
  const isOldToNew = s.mode === 'oldToNew';
  
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(isAr ? "✅ العربية" : "ar", "setLang:ar"),
      Markup.button.callback(!isAr ? "✅ EN" : "en", "setLang:en")
    ],
    [
      Markup.button.callback(isOldToNew ? "✅ من جديد لقديم" : "من جديد لقديم", "setMode:newToOld"),
      Markup.button.callback(!isOldToNew ? "✅ من قديم لجديد" : "من قديم لجديد", "setMode:oldToNew")
    ],
    [
      Markup.button.webApp("📱 فتح التطبيق المصغر", APP_URL)
    ]
  ]);
}

bot.start((ctx) => {
  ctx.reply("دليل الليرة السورية\nاختر الإعدادات أو أرسل مبلغاً:", getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1];
  ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
});

bot.action(/setMode:(.*)/, (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = ctx.match[1];
  ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const text = ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d).replace(/,/g, '');
  const amount = parseFloat(text);
  if (isNaN(amount)) return;

  const isOldToNew = s.mode === 'oldToNew';
  const resVal = isOldToNew ? (amount / RATE) : (amount * RATE);
  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  
  let remaining = resVal;
  let distText = "";
  activeDenoms.forEach(d => {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      distText += `${d.v} - ${d.n[s.lang]} × ${count}\n`;
      remaining = Math.round((remaining - (count * d.v)) * 100) / 100;
    }
  });

  const inUnit = isOldToNew ? "ل.س قديمة" : "ليرة جديدة";
  const outUnit = isOldToNew ? "ليرة جديدة" : "ل.س قديمة";

  let msg = `*دليل الليرة*\n\n`;
  msg += `دليل العملة السورية الجديدة\n\n`;
  msg += `• المبلغ المدخل : *${amount.toLocaleString()}* ${inUnit}\n`;
  msg += `• الصافي المعادل: *${resVal.toLocaleString()}* ${outUnit}\n\n`;
  msg += `*توزيع الفئات النقدية*\n`;
  msg += `حسب فئات الإصدار ${isOldToNew ? 'الجديد' : 'القديم'}\n\n`;
  msg += `${distText || "—"}\n.\n\n`;

  if (remaining > 0) {
    const payAs = isOldToNew ? Math.round(remaining * RATE) : (remaining / RATE).toFixed(2);
    const payUnit = isOldToNew ? "ل.س" : "ليرة جديدة";
    const remUnit = isOldToNew ? "ليرة جديدة" : "ل.س قديمة";
    
    msg += `*ملاحظة الفراطة*\n`;
    msg += `بقي *${remaining}* ${remUnit}، تدفعها بال${isOldToNew ? 'قديم' : 'جديد'} (*${payAs}* ${payUnit}).\n\n`;
  }

  msg += `أرسل مبلغاً آخر للحساب.`;

  await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

// --- الواجهة مع دمج المانيفست والخدمة السحابية للأوفلاين ---
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ليرتي</title>
    <!-- دمج المانيفست هنا مباشرة -->
    <link rel="manifest" href='data:application/manifest+json,{"name":"Lira","short_name":"Lira","start_url":".","display":"standalone","background_color":"#fff7ed","theme_color":"#ea580c"}'>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Cairo', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background-color: #fff7ed; color: #431407; margin: 0; overflow-x: hidden; }
    </style>
</head>
<body>
    <div id="root"></div>

    <script>
    // تسجيل الـ Service Worker برمجياً من داخل الملف
    if ('serviceWorker' in navigator) {
        const swCode = \`
            const CACHE_NAME = 'lira-offline-v1';
            self.addEventListener('install', (event) => {
                event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['/'])));
            });
            self.addEventListener('fetch', (event) => {
                event.respondWith(
                    caches.match(event.request).then((response) => response || fetch(event.request))
                );
            });
        \`;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        navigator.serviceWorker.register(url);
    }
    </script>

    <script type="text/babel">
        const { useState, useEffect } = React;
        const DENOMS_NEW = [
            { v: 500, n: 'سنابل القمح', s: '🌾' }, { v: 200, n: 'أغصان الزيتون', s: '🫒' },
            { v: 100, n: 'القطن', s: '☁️' }, { v: 50, n: 'الحمضيات', s: '🍊' },
            { v: 25, n: 'العنب', s: '🍇' }, { v: 10, n: 'الياسمين', s: '🌼' }
        ];
        const DENOMS_OLD = [
            { v: 5000, n: '5000', s: '💵' }, { v: 2000, n: '2000', s: '💵' },
            { v: 1000, n: '1000', s: '💵' }, { v: 500, n: '500', s: '💵' }
        ];

        function App() {
            const [val, setVal] = useState('');
            const [isOldToNew, setIsOldToNew] = useState(true);
            const [parts, setParts] = useState([]);
            const [leftover, setLeftover] = useState(0);

            useEffect(() => { 
               if(window.Telegram && window.Telegram.WebApp) {
                   window.Telegram.WebApp.ready(); 
                   window.Telegram.WebApp.expand();
               }
            }, []);

            const cleanNum = (str) => str.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d);
            const numVal = parseFloat(cleanNum(val)) || 0;
            const resVal = isOldToNew ? (numVal / 100) : (numVal * 100);

            useEffect(() => {
                const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
                let remaining = resVal;
                const res = [];
                if (remaining > 0) {
                    activeDenoms.forEach(d => {
                        const count = Math.floor(remaining / d.v);
                        if (count > 0) {
                            res.push({ ...d, count });
                            remaining = Math.round((remaining - (count * d.v)) * 100) / 100;
                        }
                    });
                }
                setParts(res);
                setLeftover(remaining);
            }, [val, isOldToNew]);

            return (
                <div className="min-h-screen p-4 pb-12 select-none">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">ل</div>
                            <h1 className="text-xl font-black text-orange-900">ليرتي</h1>
                        </div>
                        <button onClick={() => setVal('')} className="p-3 bg-white rounded-xl shadow text-orange-400 font-bold">مسح</button>
                    </div>

                    <div className="flex p-1 bg-orange-100 rounded-2xl mb-6">
                        <button onClick={() => setIsOldToNew(true)} className={"flex-1 py-3 rounded-xl text-xs font-black " + (isOldToNew ? "bg-white text-orange-600 shadow" : "text-orange-400")}>من قديم لجديد</button>
                        <button onClick={() => setIsOldToNew(false)} className={"flex-1 py-3 rounded-xl text-xs font-black " + (!isOldToNew ? "bg-white text-orange-600 shadow" : "text-orange-400")}>من جديد لقديم</button>
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-xl p-6 mb-6 relative border-2 border-orange-50">
                        <div className="text-[10px] font-black text-gray-400 mb-2 uppercase">أدخل المبلغ ({isOldToNew ? 'قديم' : 'جديد'})</div>
                        <input type="text" inputMode="decimal" value={val} onChange={e => setVal(e.target.value)} placeholder="0" className="w-full text-5xl font-black bg-transparent outline-none text-gray-800 mb-8" />
                        
                        <button onClick={() => setIsOldToNew(!isOldToNew)} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-600 text-white p-3 rounded-full shadow-lg border-4 border-white active:scale-95 transition-transform">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
                        </button>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="text-[10px] font-black text-gray-400 mb-1 uppercase">الصافي المعادل ({!isOldToNew ? 'قديم' : 'جديد'})</div>
                            <div className="text-4xl font-black text-orange-600">{resVal.toLocaleString('ar-SY')}</div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {parts.map(p => (
                            <div key={p.v} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-orange-50">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{p.s}</span>
                                    <div>
                                        <div className="text-xl font-black text-gray-800">{p.v}</div>
                                        <div className="text-[9px] font-bold text-gray-400">{p.n}</div>
                                    </div>
                                </div>
                                <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-black">×{p.count}</div>
                            </div>
                        ))}
                    </div>

                    {leftover > 0 && (
                        <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-200 text-orange-900 text-xs font-bold shadow-sm">
                            ⚠️ ملاحظة الفراطة: بقي {leftover.toLocaleString()}، تدفعها بال{isOldToNew ? 'قديم' : 'جديد'} ({isOldToNew ? Math.round(leftover * 100).toLocaleString() : (leftover/100).toFixed(2)}).
                        </div>
                    )}
                </div>
            );
        }
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
`;

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(HTML_PAGE);
  }

  if (req.method === "POST") {
    try {
      const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await bot.handleUpdate(update);
      return res.status(200).send("OK");
    } catch (e) {
      return res.status(200).send("OK");
    }
  }
}

