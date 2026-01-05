import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- البيانات (Data) ---
const DENOMS_NEW = [
  { v: 500, n: { ar: 'سنابل القمح', en: 'Wheat Ears' }, s: '🌾' },
  { v: 200, n: { ar: 'أغصان الزيتون', en: 'Olive Branches' }, s: '🫒' },
  { v: 100, n: { ar: 'القطن السوري', en: 'Syrian Cotton' }, s: '☁️' },
  { v: 50, n: { ar: 'الحمضيات', en: 'Citrus' }, s: '🍊' },
  { v: 25, n: { ar: 'العنب', en: 'Grapes' }, s: '🍇' },
  { v: 10, n: { ar: 'ياسمين الشام', en: 'Jasmine' }, s: '🌼' }
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: 'فئة 5000', en: '5000 Note' }, s: '💵' },
  { v: 2000, n: { ar: 'فئة 2000', en: '2000 Note' }, s: '💵' },
  { v: 1000, n: { ar: 'فئة 1000', en: '1000 Note' }, s: '💵' },
  { v: 500, n: { ar: 'فئة 500', en: '500 Note' }, s: '💵' },
  { v: 200, n: { ar: 'فئة 200', en: '200 Note' }, s: '💵' }
];

// --- إدارة الحالة (State) ---
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) userStates.set(id, { lang: 'ar', mode: 'oldToNew' });
  return userStates.get(id);
}

// --- النصوص (Translations) ---
const strings = {
  ar: {
    welcome: "أهلاً بك في دليل الليرة السورية 🇸🇾\n\nيمكنك الحساب مباشرة هنا، أو استخدام التطبيق المصغر (يعمل بدون نت 📡) عبر الزر الأزرق بالأسفل.",
    oldToNew: "من قديم ⬅️ جديد",
    newToOld: "من جديد ⬅️ قديم",
    langBtn: "English 🇺🇸",
    openApp: "فتح التطبيق المصغر 📱",
    input: "المبلغ المدخل:",
    output: "الصافي المعادل:",
    distTitle: "توزيع الفئات النقدية",
    distSub: "حسب فئات الإصدار",
    noteTitle: "ملاحظة الفراطة ⚠️",
    noteBodyOld: "بقي {rem} ليرة جديدة، تدفعها بالقديم: ({val} ل.س).",
    noteBodyNew: "بقي {rem} ل.س قديمة، تدفعها بالجديد: ({val} ليرة).",
    currNew: "ليرة جديدة",
    currOld: "ل.س قديمة",
    sendNum: "أرسل مبلغاً آخر للحساب."
  },
  en: {
    welcome: "Welcome to Syrian Lira Guide 🇸🇾\n\nCalculate here directly, or use the Offline Mini App via the blue button below.",
    oldToNew: "Old ➡️ New",
    newToOld: "New ➡️ Old",
    langBtn: "عربي 🇸🇾",
    openApp: "Open Mini App 📱",
    input: "Input Amount:",
    output: "Equivalent:",
    distTitle: "Banknote Distribution",
    distSub: "Based on issuance",
    noteTitle: "Small Change Note ⚠️",
    noteBodyOld: "{rem} New leftover, pay as ({val} Old SYP).",
    noteBodyNew: "{rem} Old leftover, pay as ({val} New Lira).",
    currNew: "New Lira",
    currOld: "Old SYP",
    sendNum: "Send another number."
  }
};

// --- لوحة المفاتيح (Inline Keyboard) ---
function getKeyboard(id) {
  const s = getUS(id);
  const t = strings[s.lang];
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(s.lang === 'ar' ? "🇺🇸 English" : "🇸🇾 عربي", 'toggleLang'),
      Markup.button.callback(s.mode === 'oldToNew' ? `✅ ${t.oldToNew}` : t.oldToNew, 'setMode:oldToNew')
    ],
    [
      Markup.button.callback(s.mode === 'newToOld' ? `✅ ${t.newToOld}` : t.newToOld, 'setMode:newToOld')
    ],
    [
      Markup.button.webApp(t.openApp, `https://${process.env.VERCEL_URL || 'lira-telegram-bot.vercel.app'}`)
    ]
  ]);
}

// --- معالجات البوت (Handlers) ---
bot.start((ctx) => {
  const s = getUS(ctx.from.id);
  ctx.replyWithMarkdown(strings[s.lang].welcome, getKeyboard(ctx.from.id));
});

bot.action('toggleLang', (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = s.lang === 'ar' ? 'en' : 'ar';
  ctx.editMessageText(strings[s.lang].welcome, { parse_mode: 'Markdown', ...getKeyboard(ctx.from.id) });
});

bot.action(/setMode:(.*)/, (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = ctx.match[1];
  ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = strings[s.lang];
  
  // تنظيف الرقم
  const text = ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d).replace(/,/g, '');
  const amount = parseFloat(text);
  if (isNaN(amount)) return;

  const isOldToNew = s.mode === 'oldToNew';
  const resVal = isOldToNew ? (amount / RATE) : (amount * RATE);
  
  // منطق التوزيع
  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  const calcAmount = isOldToNew ? resVal : resVal; // التوزيع دائماً للناتج
  
  let remaining = calcAmount;
  let distText = "";
  
  activeDenoms.forEach(d => {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      distText += `• *${d.v}* ${d.s} — ${d.n[s.lang]} × *${count}*\n`;
      remaining = Math.round((remaining - (count * d.v)) * 100) / 100;
    }
  });

  // بناء الرسالة
  let msg = `🇸🇾 *${t.title || (s.lang==='ar'?'دليل الليرة':'Lira Guide')}*\n_${t.distSub}_\n\n`;
  msg += `• ${t.input} *${amount.toLocaleString()}* ${isOldToNew ? t.currOld : t.currNew}\n`;
  msg += `• ${t.output} *${resVal.toLocaleString()}* ${isOldToNew ? t.currNew : t.currOld}\n\n`;
  
  msg += `*${t.distTitle}*\n${distText || (s.lang==='ar'?'— لا يوجد أوراق نقدية مناسبة':'— No banknotes')}\n`;

  if (remaining > 0) {
    const otherVal = isOldToNew ? Math.round(remaining * RATE) : (remaining / RATE).toFixed(2);
    const note = isOldToNew ? t.noteBodyOld : t.noteBodyNew;
    msg += `\n*${t.noteTitle}*\n${note.replace('{rem}', remaining).replace('{val}', otherVal)}\n`;
  }

  msg += `\n_${t.sendNum}_`;

  await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

// --- الواجهة (Web App) + Offline Logic ---
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ليرتي</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Cairo', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background-color: #f8fafc; color: #1e293b; margin: 0; user-select: none; }
        .offline-banner { display: none; background: #ef4444; color: white; text-align: center; font-size: 10px; padding: 4px; font-weight: bold; }
        body.is-offline .offline-banner { display: block; }
    </style>
</head>
<body>
    <div class="offline-banner">⚠️ وضع عدم الاتصال (Offline Mode)</div>
    <div id="root"></div>

    <script>
        // --- Service Worker Force Installation ---
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(reg => {
                console.log('SW Registered');
                reg.update(); // Force update check
            }).catch(console.error);
        }
        window.addEventListener('offline', () => document.body.classList.add('is-offline'));
        window.addEventListener('online', () => document.body.classList.remove('is-offline'));
    </script>

    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";
        
        const DENOMS_NEW = [
            { v: 500, n: 'سنابل القمح', s: '🌾' }, { v: 200, n: 'أغصان الزيتون', s: '🫒' },
            { v: 100, n: 'القطن السوري', s: '☁️' }, { v: 50, n: 'الحمضيات', s: '🍊' },
            { v: 25, n: 'العنب', s: '🍇' }, { v: 10, n: 'ياسمين الشام', s: null, img: JASMINE_IMG }
        ];
        const DENOMS_OLD = [
            { v: 5000, n: 'فئة 5000', s: '💵' }, { v: 2000, n: 'فئة 2000', s: '💵' },
            { v: 1000, n: 'فئة 1000', s: '💵' }, { v: 500, n: 'فئة 500', s: '💵' }
        ];

        function App() {
            const [val, setVal] = useState('');
            const [isOldToNew, setIsOldToNew] = useState(true);
            const [parts, setParts] = useState([]);
            const [leftover, setLeftover] = useState(0);
            const inputRef = useRef(null);

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
                let calcAmount = isOldToNew ? resVal : numVal / 100; // منطق: توزيع الجديد دائماً للناتج إذا كان التحويل لقديم، وللمدخل إذا كان العكس.. لحظة!
                // التصحيح حسب الصور:
                // قديم لجديد (مثال 50,000 -> 500) -> التوزيع للفئات الجديدة (500)
                // جديد لقديم (مثال 500 -> 50,000) -> التوزيع للفئات القديمة (50,000)
                
                let amountToDistribute = isOldToNew ? resVal : resVal; 
                
                const res = [];
                let remaining = amountToDistribute;
                
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

            const switchMode = () => {
                if(val) setVal(resVal.toString());
                setIsOldToNew(!isOldToNew);
            };

            return (
                <div className="min-h-screen p-4 pb-20 font-sans">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-b-4 border-orange-700">ل</div>
                            <div>
                                <h1 className="text-xl font-black text-slate-800">ليرتي</h1>
                                <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">حسبتك أسهل بكتير</p>
                            </div>
                        </div>
                        <button onClick={() => setVal('')} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-6">
                        <button onClick={() => setIsOldToNew(true)} className={"flex-1 py-3 rounded-xl text-xs font-black transition-all " + (isOldToNew ? "bg-white text-orange-600 shadow-md" : "text-slate-500")}>من قديم لجديد</button>
                        <button onClick={() => setIsOldToNew(false)} className={"flex-1 py-3 rounded-xl text-xs font-black transition-all " + (!isOldToNew ? "bg-white text-orange-600 shadow-md" : "text-slate-500")}>من جديد لقديم</button>
                    </div>

                    {/* Main Card */}
                    <div className="relative bg-white rounded-[2.5rem] shadow-xl p-6 border border-slate-50 mb-6">
                        <div className="mb-8">
                            <div className="text-[10px] font-black text-slate-400 mb-2 uppercase">أدخل المبلغ ({isOldToNew ? 'قديم' : 'جديد'})</div>
                            <input 
                                type="text" inputMode="decimal" value={val} 
                                onChange={e => setVal(e.target.value)} 
                                placeholder="0.00" 
                                className="w-full text-5xl font-black bg-transparent outline-none text-slate-800 placeholder-slate-100"
                            />
                        </div>

                        {/* Toggle Button */}
                        <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 z-20">
                            <button onClick={switchMode} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg border-4 border-white active:scale-95 transition-transform">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
                            </button>
                        </div>

                        <div className="pt-6 border-t border-slate-50">
                            <div className="text-[10px] font-black text-slate-400 mb-1 uppercase">الصافي المعادل ({!isOldToNew ? 'قديم' : 'جديد'})</div>
                            <div className="text-4xl font-black text-orange-600">{resVal.toLocaleString('ar-SY')}</div>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-slate-50">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-xl">👛</span>
                            <h2 className="text-xs font-black text-slate-800 uppercase">شلون بدي ادفعهن؟ ({isOldToNew ? 'بالجديد' : 'بالقديم'})</h2>
                        </div>

                        {amountInNew > 0 ? (
                            <div className="grid gap-3">
                                {parts.map(p => (
                                    <div key={p.v} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            {p.img ? <img src={p.img} className="w-8 h-8"/> : <span className="text-2xl">{p.s}</span>}
                                            <div>
                                                <div className="text-xl font-black text-slate-800">{p.v}</div>
                                                <div className="text-[9px] font-bold text-slate-400">{p.n.ar}</div>
                                            </div>
                                        </div>
                                        <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg font-black">×{p.count}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-30 text-xs font-black italic">بانتظار الرقم...</div>
                        )}

                        {/* Leftover Note */}
                        {leftover > 0 && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <div className="text-[10px] font-black text-amber-800 uppercase mb-1">ملاحظة الفراطة</div>
                                    <div className="text-xs text-amber-900 font-bold leading-relaxed">
                                        بقي {leftover.toLocaleString()} {isOldToNew ? 'ليرة جديدة' : 'ليرة قديمة'}، 
                                        تدفعها بال{isOldToNew ? 'قديم' : 'جديد'}: ({isOldToNew ? Math.round(leftover * 100) : (leftover/100).toFixed(2)}).
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
`;

// --- Service Worker File (للعمل بدون نت) ---
const SW_SCRIPT = `
const CACHE_NAME = 'lira-offline-v5';
const URLS = ['./', 'https://cdn.tailwindcss.com', 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(URLS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
    // استراتيجية Cache First للسرعة والعمل أوفلاين
    e.respondWith(
        caches.match(e.request).then(resp => {
            return resp || fetch(e.request).then(response => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(e.request, response.clone());
                    return response;
                });
            });
        }).catch(() => caches.match('./')) // Fallback to index if offline
    );
});
`;

export default async function handler(req, res) {
  // 1. طلب ملف الـ Service Worker
  if (req.url.includes('sw.js')) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.status(200).send(SW_SCRIPT);
  }

  // 2. طلب واجهة التطبيق (GET)
  if (req.method === "GET") {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(HTML_TEMPLATE);
  }

  // 3. طلبات البوت (Webhook)
  if (req.method === "POST") {
    try {
      if (TELEGRAM_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) {
        return res.status(401).send("Unauthorized");
      }
      const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await bot.handleUpdate(update);
      return res.status(200).send("OK");
    } catch (e) {
      console.error(e);
      return res.status(200).send("OK");
    }
  }
}
