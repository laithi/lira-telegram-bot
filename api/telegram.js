import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// فئات الإصدار الجديد
const DENOMS_NEW = [
  { v: 500, n: 'سنابل القمح', s: '🌾' },
  { v: 200, n: 'أغصان الزيتون', s: '🫒' },
  { v: 100, n: 'القطن السوري', s: '☁️' },
  { v: 50, n: 'الحمضيات', s: '🍊' },
  { v: 25, n: 'العنب', s: '🍇' },
  { v: 10, n: 'ياسمين الشام', s: '🌼' }
];

// فئات الإصدار القديم
const DENOMS_OLD = [
  { v: 5000, n: 'فئة الخمسة آلاف', s: '💵' },
  { v: 2000, n: 'فئة الألفين', s: '💵' },
  { v: 1000, n: 'فئة الألف', s: '💵' },
  { v: 500, n: 'فئة الخمسمئة', s: '💵' }
];

bot.start((ctx) => {
  ctx.replyWithMarkdown("🇸🇾 *دليل الليرة السورية*\n\nاستخدم الزر بالأسفل لفتح التطبيق المصغر والحساب بدقة مع توزيع الفئات.");
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d);
  const amount = parseFloat(text);
  if (isNaN(amount)) return;
  const res = amount / RATE;
  await ctx.reply(`المبلغ بالجديد المعادل: ${res.toLocaleString()} ليرة جديدة.`);
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>دليل الليرة</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Cairo', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background-color: var(--tg-theme-bg-color, #f8fafc); color: var(--tg-theme-text-color, #1e293b); margin: 0; }
        .tg-card { background-color: var(--tg-theme-secondary-bg-color, #ffffff); }
        .tg-button { background-color: var(--tg-theme-button-color, #4f46e5); color: var(--tg-theme-button-text-color, #ffffff); }
    </style>
</head>
<body>
    <div id="root"></div>
    <script>
        // كود الـ Service Worker للعمل بدون إنترنت
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                const swCode = "self.addEventListener('install', e => e.waitUntil(caches.open('v1').then(c => c.addAll(['./'])))); self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));";
                const blob = new Blob([swCode], { type: 'text/javascript' });
                navigator.serviceWorker.register(URL.createObjectURL(blob));
            });
        }
    </script>
    <script type="text/babel">
        const { useState, useEffect } = React;
        const DENOMS_NEW = ${JSON.stringify(DENOMS_NEW)};
        const DENOMS_OLD = ${JSON.stringify(DENOMS_OLD)};

        function App() {
            const [val, setVal] = useState('');
            const [isOldToNew, setIsOldToNew] = useState(true);
            const [parts, setParts] = useState([]);
            const [leftover, setLeftover] = useState(0);

            useEffect(() => { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }, []);

            const numVal = parseFloat(val.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d)) || 0;
            const resVal = isOldToNew ? (numVal / 100) : (numVal * 100);

            useEffect(() => {
                let current = !isOldToNew ? resVal : numVal / 100; 
                // إذا كان التحويل من جديد لقديم -> نوزع حسب فئات القديم
                // إذا كان التحويل من قديم لجديد -> نوزع حسب فئات الجديد
                const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
                let calcAmount = isOldToNew ? (numVal / 100) : (numVal * 100);

                const res = [];
                let remaining = calcAmount;

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
                <div className="min-h-screen p-4 space-y-4 pb-12">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg">د</div>
                        <h1 className="font-black text-lg">دليل الليرة</h1>
                    </div>

                    <div className="flex p-1 bg-black/5 rounded-2xl">
                        <button onClick={() => setIsOldToNew(true)} className={"flex-1 py-2.5 rounded-xl text-xs font-bold transition-all " + (isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>قديم ← جديد</button>
                        <button onClick={() => setIsOldToNew(false)} className={"flex-1 py-2.5 rounded-xl text-xs font-bold transition-all " + (!isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>جديد ← قديم</button>
                    </div>

                    <div className="tg-card rounded-[2rem] p-6 border border-black/5 shadow-sm">
                        <div className="text-[10px] font-black opacity-30 mb-1 uppercase">المبلغ ({isOldToNew ? 'قديم' : 'جديد'})</div>
                        <input type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" className="w-full text-4xl font-black bg-transparent outline-none mb-4" />
                        <div className="pt-4 border-t border-black/5">
                            <div className="text-[10px] font-black opacity-30 mb-1 uppercase text-indigo-400">النتيجة المعادل ({!isOldToNew ? 'قديم' : 'جديد'})</div>
                            <div className="text-3xl font-black text-indigo-500">{resVal.toLocaleString('ar-SY')}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-[10px] font-black opacity-30 px-2 uppercase tracking-widest">توزيع الفئات ({isOldToNew ? 'جديد' : 'قديم'})</h2>
                        {parts.map(p => (
                            <div key={p.v} className="tg-card p-4 rounded-2xl flex items-center justify-between border border-black/5 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl">{p.s}</div>
                                    <div>
                                        <div className="font-black text-lg leading-tight">{p.v.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold opacity-40">{p.n}</div>
                                    </div>
                                </div>
                                <div className="tg-button px-4 py-1.5 rounded-xl font-black text-lg">×{p.count}</div>
                            </div>
                        ))}
                    </div>

                    {leftover > 0 && (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] font-bold leading-relaxed">
                            ⚠️ ملاحظة: بقي {leftover.toLocaleString()} {isOldToNew ? 'ليرة جديدة' : 'ليرة قديمة'} كـ "فراطة".
                        </div>
                    )}
                </div>
            );
        }
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
    `);
  }

  try {
    const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    await bot.handleUpdate(update);
    return res.status(200).send("OK");
  } catch (e) {
    return res.status(500).send("Error");
  }
}
