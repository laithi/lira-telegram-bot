import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// فئات الإصدار الجديد
const DENOMS_NEW = [
  { v: 500, n: { ar: 'سنابل القمح', en: 'Wheat Ears' }, s: '🌾' },
  { v: 200, n: { ar: 'أغصان الزيتون', en: 'Olive Branches' }, s: '🫒' },
  { v: 100, n: { ar: 'القطن السوري', en: 'Syrian Cotton' }, s: '☁️' },
  { v: 50, n: { ar: 'الحمضيات', en: 'Citrus' }, s: '🍊' },
  { v: 25, n: { ar: 'العنب', en: 'Grapes' }, s: '🍇' },
  { v: 10, n: { ar: 'ياسمين الشام', en: 'Damask Jasmine' }, s: '🌼' }
];

const DENOMS_OLD_LIST = [
  { v: 5000, n: { ar: 'فئة الخمسة آلاف', en: '5000 Note' }, s: '💵' },
  { v: 2000, n: { ar: 'فئة الألفين', en: '2000 Note' }, s: '💵' },
  { v: 1000, n: { ar: 'فئة الألف', en: '1000 Note' }, s: '💵' }
];

// إدارة حالة المستخدم البسيطة (لغة ونمط تحويل)
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) userStates.set(id, { lang: 'ar', mode: 'oldToNew' });
  return userStates.get(id);
}

// --- النصوص ---
const strings = {
  ar: {
    welcome: "أهلاً بك في دليل الليرة السورية\n\nيمكنك الحساب مباشرة هنا، أو استخدام التطبيق المصغر عبر الضغط على الزر الأزرق ↘️.\n\nالنمط الحالي: ",
    oldToNew: "من قديم إلى جديد",
    newToOld: "من جديد إلى قديم",
    changeMode: "تغيير نمط التحويل",
    changeLang: "English 🇺🇸",
    openApp: "فتح التطبيق المصغر 📱",
    resultMsg: "المبلغ: ",
    equiv: "يعادل: ",
    distNew: "توزيع الفئات الجديدة:",
    distOld: "توزيع الفئات القديمة:",
    unitNew: "ليرة جديدة",
    unitOld: "ليرة قديمة"
  },
  en: {
    welcome: "Welcome to Syrian Lira Guide\n\nYou can calculate here, or use the Mini App via the blue button ↘️.\n\nCurrent Mode: ",
    oldToNew: "Old to New",
    newToOld: "New to Old",
    changeMode: "Change Conversion Mode",
    changeLang: "العربية 🇸🇾",
    openApp: "Open Mini App 📱",
    resultMsg: "Amount: ",
    equiv: "Equals: ",
    distNew: "New Categories Distribution:",
    distOld: "Old Categories Distribution:",
    unitNew: "New Lira",
    unitOld: "Old Lira"
  }
};

// --- أزرار التحكم ---
function getKeyboard(id) {
  const s = getUS(id);
  const t = strings[s.lang];
  return Markup.inlineKeyboard([
    [Markup.button.callback(t.changeMode, 'toggleMode')],
    [Markup.button.callback(t.changeLang, 'toggleLang')],
    [Markup.button.webApp(t.openApp, `https://${process.env.VERCEL_URL || 'lira-telegram-bot.vercel.app'}`)]
  ]);
}

bot.start((ctx) => {
  const s = getUS(ctx.from.id);
  const t = strings[s.lang];
  return ctx.replyWithMarkdown(`${t.welcome} *${s.mode === 'oldToNew' ? t.oldToNew : t.newToOld}*`, getKeyboard(ctx.from.id));
});

bot.action('toggleMode', (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = s.mode === 'oldToNew' ? 'newToOld' : 'oldToNew';
  const t = strings[s.lang];
  ctx.editMessageText(`${t.welcome} *${s.mode === 'oldToNew' ? t.oldToNew : t.newToOld}*`, { parse_mode: 'Markdown', ...getKeyboard(ctx.from.id) });
});

bot.action('toggleLang', (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = s.lang === 'ar' ? 'en' : 'ar';
  const t = strings[s.lang];
  ctx.editMessageText(`${t.welcome} *${s.mode === 'oldToNew' ? t.oldToNew : t.newToOld}*`, { parse_mode: 'Markdown', ...getKeyboard(ctx.from.id) });
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = strings[s.lang];
  const text = ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d);
  const amount = parseFloat(text);
  if (isNaN(amount)) return;

  const isOld = s.mode === 'oldToNew';
  const resVal = isOld ? (amount / RATE) : (amount * RATE);
  const activeDenoms = isOld ? DENOMS_NEW : DENOMS_OLD_LIST;

  let msg = `• ${t.resultMsg} *${amount.toLocaleString()}*\n`;
  msg += `• ${t.equiv} *${resVal.toLocaleString()}* ${isOld ? t.unitNew : t.unitOld}\n\n`;
  msg += `*${isOld ? t.distNew : t.distOld}*\n`;

  let remaining = resVal;
  activeDenoms.forEach(d => {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      msg += `${d.s} ${d.v} ← *${count}* ${s.lang === 'ar' ? 'قطع' : 'pcs'}\n`;
      remaining = Math.round((remaining - (count * d.v)) * 100) / 100;
    }
  });

  await ctx.replyWithMarkdown(msg);
});

// --- الدالة الأساسية (API Handler) ---
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
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                const swCode = "self.addEventListener('install', e => e.waitUntil(caches.open('v4').then(c => c.addAll(['./'])))); self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));";
                const blob = new Blob([swCode], { type: 'text/javascript' });
                navigator.serviceWorker.register(URL.createObjectURL(blob));
            });
        }
    </script>
    <script type="text/babel">
        const { useState, useEffect } = React;
        const DENOMS_NEW = ${JSON.stringify(DENOMS_NEW)};
        const DENOMS_OLD = ${JSON.stringify(DENOMS_OLD_LIST)};

        function App() {
            const [val, setVal] = useState('');
            const [isOldToNew, setIsOldToNew] = useState(true);
            const [parts, setParts] = useState([]);

            useEffect(() => { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }, []);

            const numVal = parseFloat(val.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d)) || 0;
            const resVal = isOldToNew ? (numVal / 100) : (numVal * 100);

            useEffect(() => {
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
            }, [val, isOldToNew]);

            return (
                <div className="min-h-screen p-4 space-y-4 pb-12">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg">د</div>
                        <h1 className="font-black text-lg uppercase tracking-tighter">دليل الليرة</h1>
                    </div>

                    <div className="flex p-1 bg-black/5 rounded-2xl">
                        <button onClick={() => setIsOldToNew(true)} className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all " + (isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>قديم ← جديد</button>
                        <button onClick={() => setIsOldToNew(false)} className={"flex-1 py-2 rounded-xl text-xs font-bold transition-all " + (!isOldToNew ? "bg-white shadow text-indigo-600" : "opacity-40")}>جديد ← قديم</button>
                    </div>

                    <div className="tg-card rounded-[2rem] p-6 border border-black/5 shadow-sm text-center">
                        <div className="text-[10px] font-black opacity-30 mb-2 uppercase tracking-widest">المبلغ ({isOldToNew ? 'قديم' : 'جديد'})</div>
                        <input type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" className="w-full text-5xl font-black bg-transparent outline-none text-center mb-4" />
                        <div className="pt-4 border-t border-black/5">
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
                                        <div className="text-[10px] font-bold opacity-40">{p.n.ar}</div>
                                    </div>
                                </div>
                                <div className="tg-button px-5 py-1.5 rounded-xl font-black text-lg">×{p.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
    `);
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
