import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- Denominations Data (correct new / old symbols) ---
// الفئات الجديدة (إصدار جديد: سنابل، زيتون، قطن، حمضيات، عنب، ياسمين)
const DENOMS_NEW = [
  { v: 500, s: "🌾", n: { ar: "سنابل القمح", en: "Wheat" } },
  { v: 200, s: "🫒", n: { ar: "أغصان الزيتون", en: "Olive" } },
  { v: 100, s: "☁️", n: { ar: "القطن", en: "Cotton" } },
  { v: 50,  s: "🍊", n: { ar: "الحمضيات", en: "Citrus" } },
  { v: 25,  s: "🍇", n: { ar: "العنب", en: "Grapes" } },
  { v: 10,  s: "🌼", n: { ar: "الياسمين", en: "Jasmine" } }
];

// الفئات القديمة (أوراق نقدية قديمة، كلها برمز مال عام)
const DENOMS_OLD = [
  { v: 5000, s: "💵", n: { ar: "خمسة آلاف", en: "5000" } },
  { v: 2000, s: "💵", n: { ar: "ألفين",     en: "2000" } },
  { v: 1000, s: "💵", n: { ar: "ألف",       en: "1000" } },
  { v: 500,  s: "💵", n: { ar: "خمسمئة",    en: "500" } },
  { v: 200, s: "💵", n: { ar: "مئتان",     en: "200" } },
  { v: 100, s: "💵", n: { ar: "مئة",       en: "100" } }
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    inputAmount: "المبلغ المدخل",
    equivalent: "المعادل",
    breakdownTitle: "توزيع الفئات النقدية",
    changeNote: "ملاحظة الفراطة",
    oldUnit: "ل.س قديمة",
    newUnit: "ليرة جديدة",
    openApp: "📱 فتح التطبيق المصغر",
    invalid: "يرجى إرسال مبلغ صحيح 🙏",
    qty: "عدد"
  },
  en: {
    title: "Lira Guide",
    subtitle: "New Syrian Currency Guide",
    inputAmount: "Input Amount",
    equivalent: "Equivalent",
    breakdownTitle: "Banknote Breakdown",
    changeNote: "Change Note",
    oldUnit: "Old SYP",
    newUnit: "New Lira",
    openApp: "📱 Open Mini App",
    invalid: "Please send a valid amount 🙏",
    qty: "Qty"
  }
};

const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, { lang: "ar", mode: "oldToNew" });
  }
  return userStates.get(id);
}

function calc(mode, amount) {
  const isOldToNew = mode === "oldToNew";
  let resVal = isOldToNew ? amount / RATE : amount * RATE;
  resVal = Math.round(resVal * 100) / 100;

  const denoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  let current = resVal;
  const list = [];

  for (const d of denoms) {
    const count = Math.floor((current + 0.0001) / d.v);
    if (count > 0) {
      list.push({ ...d, count });
      current = Math.round((current - count * d.v) * 100) / 100;
    }
  }
  return { resVal, list, rem: current };
}

function buildMsg(id, amount, res) {
  const s = getUS(id);
  const t = TRANSLATIONS[s.lang];
  const isOldToNew = s.mode === "oldToNew";

  let m = `*${t.title}*\n${t.subtitle}\n\n`;
  m += `• ${t.inputAmount}: *${amount.toLocaleString()}* ${
    isOldToNew ? t.oldUnit : t.newUnit
  }\n`;
  m += `• ${t.equivalent}: *${res.resVal.toLocaleString()}* ${
    isOldToNew ? t.newUnit : t.oldUnit
  }\n\n`;

  if (res.rem > 0) {
    m += `*${t.changeNote}:*\n`;
    if (isOldToNew) {
      m += `بقي *${res.rem}* ${t.newUnit}، تدفع بالقديم (*${Math.round(
        res.rem * RATE
      )}* ${t.oldUnit}).\n\n`;
    } else {
      m += `بقي *${res.rem}* ${t.oldUnit}، تدفع بالجديد (*${(
        res.rem / RATE
      ).toFixed(2)}* ${t.newUnit}).\n\n`;
    }
  }

  m += `*${t.breakdownTitle}:*\n`;
  if (res.list.length === 0) m += "—";
  else {
    res.list.forEach((item) => {
      const n = item.n[s.lang];
      m += `${item.s} *${n}* ${item.v} ⬅️ *${item.count}* ${t.qty}\n`;
    });
  }

  return m;
}

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const raw = ctx.message.text
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
    .replace(/,/g, "");
  const num = parseFloat(raw);

  if (isNaN(num) || num <= 0) return ctx.reply(TRANSLATIONS[s.lang].invalid);

  const res = calc(s.mode, num);
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        s.mode === "oldToNew" ? "✅ قديم ← جديد" : "قديم ← جديد",
        "setMode:oldToNew"
      ),
      Markup.button.callback(
        s.mode === "newToOld" ? "✅ جديد ← قديم" : "جديد ← قديم",
        "setMode:newToOld"
      )
    ],
    [Markup.button.webApp(TRANSLATIONS[s.lang].openApp, APP_URL)]
  ]);

  return ctx.replyWithMarkdown(buildMsg(ctx.from.id, num, res), keyboard);
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = ctx.match[1];
  await ctx.answerCbQuery("تم تغيير الوضع");
  return ctx.reply("تم التغيير. أرسل المبلغ الجديد الآن:");
});

export default async function handler(req, res) {
  if (req.method === "POST") await bot.handleUpdate(req.body);
  return res.status(200).send("OK");
    }
