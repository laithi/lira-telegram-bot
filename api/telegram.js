import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
// استخدم رابطك المباشر هنا إذا لم يعمل الرابط التلقائي
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

// --- إدارة الحالة ---
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) userStates.set(id, { lang: 'ar', mode: 'oldToNew' });
  return userStates.get(id);
}

// --- النصوص ---
const strings = {
  ar: {
    welcome: "أهلاً بك في دليل الليرة. اختر الإعدادات أو أرسل رقماً للحساب:",
    btnAr: "العربية",
    btnEn: "English",
    btnOldNew: "من قديم لجديد",
    btnNewOld: "من جديد لقديم",
    openApp: "📱 فتح التطبيق المصغر",
    input: "المبلغ المدخل",
    output: "الصافي المعادل",
    distHeader: "توزيع الفئات النقدية",
    distSub: "حسب فئات الإصدار",
    new: "الجديد",
    old: "القديم",
    noteTitle: "ملاحظة الفراطة",
    noteBody: "بقي {rem}، تدفعها بـ: ({val}).",
    currNew: "ليرة جديدة",
    currOld: "ل.س قديمة",
    retry: "أرسل مبلغاً آخر للحساب."
  },
  en: {
    welcome: "Welcome. Choose settings or send a number:",
    btnAr: "Arabic",
    btnEn: "English",
    btnOldNew: "Old to New",
    btnNewOld: "New to Old",
    openApp: "📱 Open Mini App",
    input: "Input Amount",
    output: "Equivalent",
    distHeader: "Banknote Distribution",
    distSub: "Based on issuance",
    new: "New",
    old: "Old",
    noteTitle: "Small Change Note",
    noteBody: "{rem} left, pay as: ({val}).",
    currNew: "New Lira",
    currOld: "Old SYP",
    retry: "Send another number."
  }
};

// --- لوحة المفاتيح (ثابتة الأماكن) ---
function getKeyboard(id) {
  const s = getUS(id);
  const t = strings[s.lang];
  const isAr = s.lang === 'ar';
  const isOldToNew = s.mode === 'oldToNew';
  
  return Markup.inlineKeyboard([
    // صف اللغة: العربية دائماً يمين، الإنجليزية يسار
    [
      Markup.button.callback(isAr ? "✅ العربية" : "العربية", "setLang:ar"),
      Markup.button.callback(!isAr ? "✅ English" : "English", "setLang:en")
    ],
    // صف التحويل: ثابت الأماكن
    [
      Markup.button.callback(isOldToNew ? `✅ ${t.btnOldNew}` : t.btnOldNew, "setMode:oldToNew"),
      Markup.button.callback(!isOldToNew ? `✅ ${t.btnNewOld}` : t.btnNewOld, "setMode:newToOld")
    ],
    // زر التطبيق
    [
      Markup.button.webApp(t.openApp, APP_URL)
    ]
  ]);
}

// --- معالجات البوت ---
bot.start((ctx) => {
  const s = getUS(ctx.from.id);
  ctx.reply(strings[s.lang].welcome, getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1];
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
  const text = ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d).replace(/,/g, '');
  const amount = parseFloat(text);
  
  if (isNaN(amount)) return;

  const isOldToNew = s.mode === 'oldToNew';
  const resVal = isOldToNew ? (amount / RATE) : (amount * RATE);
  
  // منطق التوزيع
  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  // التوزيع دائماً للناتج (العملة التي سيقبضها أو يدفعها الشخص)
  const calcAmount = isOldToNew ? resVal : resVal; 
  
  let remaining = calcAmount;
  let distText = "";
  
  activeDenoms.forEach(d => {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      distText += `${d.v} - ${d.n[s.lang]} × ${count}\n`;
      remaining = Math.round((remaining - (count * d.v)) * 100) / 100;
    }
  });

  const inUnit = isOldToNew ? t.currOld : t.currNew;
  const outUnit = isOldToNew ? t.currNew : t.currOld;

  // بناء الرسالة بدقة حسب الطلب
  let msg = `*${t.title || (s.lang==='ar'?'دليل الليرة':'Lira Guide')}*\n`;
  msg += `_${t.subtitle || (s.lang==='ar'?'دليل العملة السورية الجديدة':'Syrian New Currency Guide')}_\n\n`;
  
  msg += `• ${t.input}: *${amount.toLocaleString()}* ${inUnit}\n`;
  msg += `• ${t.output}: *${resVal.toLocaleString()}* ${outUnit}\n\n`;
  
  msg += `*${t.distHeader}*\n`;
  msg += `_${t.distSub} ${isOldToNew ? t.new : t.old}_\n\n`;
  msg += `${distText || "—"}\n`;
  
  msg += `.\n\n`; // النقطة الفاصلة

  if (remaining > 0) {
    const payAs = isOldToNew ? Math.round(remaining * RATE) : (remaining / RATE).toFixed(2);
    const payUnit = isOldToNew ? t.currOld : t.currNew;
    const remUnit = isOldToNew ? t.currNew : t.currOld;
    
    msg += `*${t.noteTitle}* ⚠️\n`;
    msg += `بقي *${remaining.toLocaleString()}* ${remUnit}، تدفعها بـ: (*${payAs}* ${payUnit}).\n\n`;
  }

  msg += `_${t.retry}_`;

  await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

// --- كود الواجهة (Mini App HTML) ---
const HTML_PAGE = `
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
        body { background-color: #fff7ed; color: #431407; margin: 0; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;
        const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";
        
        const DENOMS_NEW = [
            { v: 500, n: 'سنابل القمح', s: '🌾' }, { v: 200, n: 'أغصان الزيتون', s: '🫒' },
            { v: 100, n: 'القطن', s: '☁️' }, { v: 50, n: 'الحمضيات', s: '🍊' },
            { v: 25, n: 'العنب', s: '🍇' }, { v: 10, n: 'الياسمين', s: null, img: JASMINE_IMG }
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

            // تحويل الأرقام العربية
            const cleanNum = (str) => str.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d);
            const numVal = parseFloat(cleanNum(val)) || 0;
            const resVal = isOldToNew ? (numVal / 100) : (numVal * 100);

            useEffect(() => {
                const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
                // إذا قديم لجديد -> نوزع الناتج (الجديد)
                // إذا جديد لقديم -> نوزع الناتج (القديم)
                let amountToDistribute = resVal; 
                
                const res = [];
                let remaining = amountToDistribute;
                
                // حساب التوزيع
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
                <div className="min-h-screen p-4 pb-12">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">ل</div>
                            <h1 className="text-xl font-black text-orange-900">ليرتي</h1>
                        </div>
                        <button onClick={() => setVal('')} className="p-3 bg-white rounded-xl shadow text-orange-400 font-bold">مسح</button>
                    </div>

                    {/* Tabs (Fixed Position Concept) */}
                    <div className="flex p-1 bg-orange-100 rounded-2xl mb-6">
                        <button onClick={() => setIsOldToNew(true)} className={"flex-1 py-3 rounded-xl text-xs font-black transition-all " + (isOldToNew ? "bg-white text-orange-600 shadow" : "text-orange-400")}>من قديم لجديد</button>
                        <button onClick={() => setIsOldToNew(false)} className={"flex-1 py-3 rounded-xl text-xs font-black transition-all " + (!isOldToNew ? "bg-white text-orange-600 shadow" : "text-orange-400")}>من جديد لقديم</button>
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-[2rem] shadow-xl p-6 mb-6 relative border-2 border-orange-50">
                        <div className="text-[10px] font-black text-gray-400 mb-2 uppercase">أدخل المبلغ ({isOldToNew ? 'قديم' : 'جديد'})</div>
                        <input type="text" inputMode="decimal" value={val} onChange={e => setVal(e.target.value)} placeholder="0" className="w-full text-5xl font-black bg-transparent outline-none text-gray-800 mb-8" />
                        
                        <button onClick={switchMode} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-600 text-white p-3 rounded-full shadow-lg border-4 border-white">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
                        </button>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="text-[10px] font-black text-gray-400 mb-1 uppercase">الصافي المعادل ({!isOldToNew ? 'قديم' : 'جديد'})</div>
                            <div className="text-4xl font-black text-orange-600">{resVal.toLocaleString('ar-SY')}</div>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-black text-gray-400 px-2">توزيع الفئات ({isOldToNew ? 'بالجديد' : 'بالقديم'})</h2>
                        {parts.map(p => (
                            <div key={p.v} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-orange-50">
                                <div className="flex items-center gap-3">
                                    {p.img ? <img src={p.img} className="w-8 h-8"/> : <span className="text-2xl">{p.s}</span>}
                                    <div>
                                        <div className="text-xl font-black text-gray-800">{p.v}</div>
                                        <div className="text-[9px] font-bold text-gray-400">{p.n.ar}</div>
                                    </div>
                                </div>
                                <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-black">×{p.count}</div>
                            </div>
                        ))}
                    </div>

                    {/* Leftover Note (Fixed) */}
                    {leftover > 0 && (
                        <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-800 text-xs font-bold">
                            ⚠️ ملاحظة الفراطة: بقي {leftover.toLocaleString()}، تدفعها بـ ({isOldToNew ? Math.round(leftover * 100).toLocaleString() : (leftover/100).toFixed(2)}).
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
  // GET: Serve HTML
  if (req.method === "GET") {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(HTML_PAGE);
  }

  // POST: Webhook
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


