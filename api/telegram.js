import { Telegraf, Markup } from "telegraf";

// --- إعدادات البيئة ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- فئات العملات للنظام النصي (داخل الدردشة) ---
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat Ears" }, s: "🌾" },
  { v: 200, n: { ar: "أغصان الزيتون", en: "Olive Branches" }, s: "🫒" },
  { v: 100, n: { ar: "القطن السوري", en: "Syrian Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "ياسمين الشام", en: "Damask Jasmine" }, s: "🌼" }
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "5000 ل.س", en: "5000 SYP" }, s: "💴" },
  { v: 2000, n: { ar: "2000 ل.س", en: "2000 SYP" }, s: "💴" },
  { v: 1000, n: { ar: "1000 ل.س", en: "1000 SYP" }, s: "💴" }
];

// --- إدارة الحالة البسيطة للمستخدم ---
const userState = new Map();
function getState(userId) {
  if (!userState.has(userId)) userState.set(userId, { lang: "ar", mode: "oldToNew" });
  return userState.get(userId);
}

// --- معالجات نصوص البوت ---
bot.start((ctx) => {
  const st = getState(ctx.from.id);
  return ctx.replyWithMarkdown("🇸🇾 *أهلاً بك في دليل الليرة السورية*\n\nيمكنك إرسال مبالغ هنا أو فتح التطبيق المصغر عبر الزر بالأسفل.", 
    Markup.inlineKeyboard([
      [Markup.button.url("فتح التطبيق المصغر", `https://${process.env.VERCEL_URL || 'lira-telegram-bot.vercel.app'}`)]
    ])
  );
});

bot.on("text", async (ctx) => {
  const st = getState(ctx.from.id);
  const text = ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d);
  const amount = parseFloat(text);
  
  if (isNaN(amount)) return ctx.reply("الرجاء إرسال رقم صحيح.");

  const isOldToNew = st.mode === "oldToNew";
  const result = isOldToNew ? (amount / RATE) : (amount * RATE);
  
  let msg = `• المبلغ: *${amount.toLocaleString()}*\n• النتيجة: *${result.toLocaleString()}* ${isOldToNew ? 'جديد' : 'قديم'}\n\n`;
  msg += `_استخدم الزر بالأسفل لتجربة الواجهة الرسومية الأسهل!_`;
  
  await ctx.replyWithMarkdown(msg);
});

// --- الدالة الأساسية (المسؤولة عن الربط) ---
export default async function handler(req, res) {
  // 1. إذا طلب المستخدم الرابط عبر المتصفح (GET) -> اعرض واجهة التطبيق
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
        body { background-color: var(--tg-theme-bg-color, #f8fafc); color: var(--tg-theme-text-color, #1e293b); margin: 0; overflow-x: hidden; }
        .tg-card { background-color: var(--tg-theme-secondary-bg-color, #ffffff); }
        .tg-button { background-color: var(--tg-theme-button-color, #4f46e5); color: var(--tg-theme-button-text-color, #ffffff); }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;
        const DENOMS = [
            { v: 500, n: 'سنابل القمح', s: '🌾' }, { v: 200, n: 'أغصان الزيتون', s: '🫒' },
            { v: 100, n: 'القطن السوري', s: '☁️' }, { v: 50, n: 'الحمضيات', s: '🍊' },
            { v: 25, n: 'العنب', s: '🍇' }, { v: 10, n: 'ياسمين الشام', s: '🌼' }
        ];

        function App() {
            const [val, setVal] = useState('');
            const [isOldToNew, setIsOldToNew] = useState(true);
            const [parts, setParts] = useState([]);
            const [leftover, setLeftover] = useState(0);

            useEffect(() => {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            }, []);

            const cleanNum = (str) => str.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d);
            const numVal = parseFloat(cleanNum(val)) || 0;
            const resVal = isOldToNew ? (numVal / 100) : (numVal * 100);

            useEffect(() => {
                let current = isOldToNew ? resVal : numVal;
                const res = [];
                if (current > 0) {
                    DENOMS.forEach(d => {
                        const count = Math.floor(current / d.v);
                        if (count > 0) {
                            res.push({ ...d, count });
                            current = Math.round((current - (count * d.v)) * 100) / 100;
                        }
                    });
                }
                setParts(res);
                setLeftover(current);
            }, [val, isOldToNew]);

            return (
                <div className="min-h-screen p-4 space-y-4 pb-12 transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg">د</div>
                            <h1 className="font-black text-lg">دليل الليرة</h1>
                        </div>
                        <div className="text-[10px] font-bold opacity-30">V 2.0</div>
                    </div>

                    <div className="flex p-1 bg-black/5 rounded-2xl">
                        <button onClick={() => setIsOldToNew(true)} className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all " + (isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>قديم ← جديد</button>
                        <button onClick={() => setIsOldToNew(false)} className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all " + (!isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>جديد ← قديم</button>
                    </div>

                    <div className="tg-card rounded-[2.5rem] p-8 border border-black/5 shadow-sm text-center">
                        <div className="text-[10px] font-black opacity-30 mb-2 uppercase tracking-[0.2em]">أدخل المبلغ ({isOldToNew ? 'قديم' : 'جديد'})</div>
                        <input type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" className="w-full text-5xl font-black bg-transparent outline-none text-center mb-6" />
                        <div className="pt-6 border-t border-black/5">
                            <div className="text-[10px] font-black opacity-30 mb-1 uppercase tracking-widest text-indigo-400">الصافي المعادل</div>
                            <div className="text-4xl font-black text-indigo-500">{resVal.toLocaleString('ar-SY')}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-[10px] font-black opacity-30 px-2 uppercase tracking-widest">توزيع الفئات (جديد)</h2>
                        {parts.length > 0 ? parts.map(p => (
                            <div key={p.v} className="tg-card p-4 rounded-2xl flex items-center justify-between border border-black/5 transition-all animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl">{p.s}</div>
                                    <div>
                                        <div className="font-black text-lg leading-tight">{p.v}</div>
                                        <div className="text-[10px] font-bold opacity-40">{p.n}</div>
                                    </div>
                                </div>
                                <div className="tg-button px-5 py-2 rounded-xl font-black text-xl shadow-sm">×{p.count}</div>
                            </div>
                        )) : (
                            <div className="text-center py-8 opacity-20 italic text-sm">أدخل مبلغا للحساب...</div>
                        )}
                    </div>

                    {leftover > 0 && (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] font-bold leading-relaxed">
                            ⚠️ ملاحظة: بقي {leftover} ليرة جديدة، تدفعها بقيمة {Math.round(leftover * 100).toLocaleString()} ل.س قديمة.
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

  // 2. إذا كان الطلب من التلجرام (POST) -> شغل منطق البوت
  try {
    if (TELEGRAM_SECRET) {
      if (req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) {
        return res.status(401).send("Unauthorized");
      }
    }
    const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    await bot.handleUpdate(update);
    return res.status(200).send("OK");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Error");
  }
}
