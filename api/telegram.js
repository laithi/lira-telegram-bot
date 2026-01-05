import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// فئات العملات
const DENOMS_NEW = [
  { v: 500, n: 'سنابل القمح', s: '🌾' }, { v: 200, n: 'أغصان الزيتون', s: '🫒' },
  { v: 100, n: 'القطن السوري', s: '☁️' }, { v: 50, n: 'الحمضيات', s: '🍊' },
  { v: 25, n: 'العنب', s: '🍇' }, { v: 10, n: 'ياسمين الشام', s: '🌼' }
];

const DENOMS_OLD = [
  { v: 5000, n: 'فئة الخمسة آلاف', s: '💵' }, { v: 2000, n: 'فئة الألفين', s: '💵' },
  { v: 1000, n: 'فئة الألف', s: '💵' }, { v: 500, n: 'فئة الخمسمئة', s: '💵' }
];

// --- منطق البوت (الدردشة) ---

bot.start((ctx) => {
  return ctx.replyWithMarkdown(
    "🇸🇾 *أهلاً بك في دليل الليرة السورية*\n\nيمكنك الحساب مباشرة هنا بإرسال المبلغ، أو تجربة الواجهة الرسومية المتطورة عبر الزر بالأسفل (تعمل بدون إنترنت أيضاً).",
    Markup.keyboard([
      [Markup.button.webApp("فتح التطبيق المصغر 📱", `https://${process.env.VERCEL_URL || 'lira-telegram-bot.vercel.app'}`)]
    ]).resize()
  );
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d);
  const amount = parseFloat(text);
  if (isNaN(amount)) return ctx.reply("الرجاء إرسال مبلغ رقمي (مثال: 5000).");

  const res = amount / RATE;
  await ctx.replyWithMarkdown(`• المبلغ بالقديم: *${amount.toLocaleString()}*\n• يعادل بالجديد: *${res.toLocaleString()}* ليرة.\n\n_انصحك باستخدام "التطبيق المصغر" لرؤية توزيع الفئات النقدية بشكل أوضح!_`);
});

// --- الدالة الأساسية لمعالجة الطلبات ---

export default async function handler(req, res) {
  // إذا كان الطلب GET -> عرض واجهة التطبيق
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
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                const swCode = "self.addEventListener('install', e => e.waitUntil(caches.open('v2').then(c => c.addAll(['./'])))); self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));";
                const blob = new Blob([swCode], { type: 'text/javascript' });
                navigator.serviceWorker.register(URL.createObjectURL(blob));
            });
        }
    </script>
    <script type="text/babel">
        const { useState, useEffect } = React;
        function App() {
            const [val, setVal] = useState('');
            const [isOldToNew, setIsOldToNew] = useState(true);
            const [parts, setParts] = useState([]);
            const [leftover, setLeftover] = useState(0);

            useEffect(() => { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }, []);

            const numVal = parseFloat(val.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d)) || 0;
            const resVal = isOldToNew ? (numVal / 100) : (numVal * 100);

            useEffect(() => {
                const activeDenoms = isOldToNew ? ${JSON.stringify(DENOMS_NEW)} : ${JSON.stringify(DENOMS_OLD)};
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
                        <button onClick={() => setIsOldToNew(true)} className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all " + (isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>قديم ← جديد</button>
                        <button onClick={() => setIsOldToNew(false)} className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all " + (!isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>جديد ← قديم</button>
                    </div>
                    <div className="tg-card rounded-[2rem] p-6 border border-black/5 shadow-sm text-center">
                        <div className="text-[10px] font-black opacity-30 mb-2 uppercase tracking-widest">أدخل المبلغ ({isOldToNew ? 'قديم' : 'جديد'})</div>
                        <input type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" className="w-full text-5xl font-black bg-transparent outline-none text-center mb-4" />
                        <div className="pt-4 border-t border-black/5">
                            <div className="text-[10px] font-black opacity-30 mb-1 uppercase text-indigo-400">الصافي المعادل</div>
                            <div className="text-3xl font-black text-indigo-500">{resVal.toLocaleString('ar-SY')}</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {parts.map(p => (
                            <div key={p.v} className="tg-card p-4 rounded-2xl flex items-center justify-between border border-black/5 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl">{p.s}</div>
                                    <div>
                                        <div className="font-black text-lg leading-tight">{p.v.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold opacity-40">{p.n}</div>
                                    </div>
                                </div>
                                <div className="tg-button px-5 py-1.5 rounded-xl font-black text-lg">×{p.count}</div>
                            </div>
                        ))}
                    </div>
                    {leftover > 0 && (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] font-bold">
                            ⚠️ ملاحظة: بقي {leftover.toLocaleString()} {isOldToNew ? 'جديدة' : 'قديمة'} كفراطة.
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

  // إذا كان الطلب POST -> معالجة البوت (Webhook)
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
      return res.status(200).send("OK"); // نرسل 200 دائماً للتلجرام لمنع تكرار المحاولة عند الخطأ
    }
  }

  return res.status(404).send("Not Found");
}
