import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// الفئات الجديدة - بدون أسماء
const DENOMS_NEW = [
  { v: 500, s: "🌾" },
  { v: 200, s: "🫒" },
  { v: 100, s: "☁️" },
  { v: 50,  s: "🍊" },
  { v: 25,  s: "🍇" },
  { v: 10,  s: "🌼" }
];

// الفئات القديمة - بدون أسماء وبشعار محايد
const DENOMS_OLD = [
  { v: 5000, s: "💸" },
  { v: 2000, s: "💸" },
  { v: 1000, s: "💸" },
  { v: 500,  s: "💸" },
  { v: 200,  s: "💸" },
  { v: 100,  s: "💸" }
];

const FLAG_BY_CODE = { 
  USD: "🇺🇸 Dollar (USD)", 
  AED: "🇦🇪 Dirham (AED)", 
  SAR: "🇸🇦 Riyal (SAR)", 
  EUR: "🇪🇺 Euro (EUR)", 
  KWD: "🇰🇼 Dinar (KWD)", 
  SEK: "🇸🇪 Krona (SEK)", 
  GBP: "🇬🇧 Pound (GBP)", 
  JOD: "🇯🇴 Dinar (JOD)" 
};

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "الإصدار الرقمي الموحد",
    sendAmount: "أرسل مبلغاً للحساب أو اختر الإعدادات:",
    inputAmount: "المبلغ",
    equivalent: "المقابل",
    breakdownTitle: "توزيع الفئات",
    changeNote: "الفكة المتبقية",
    sendAnother: "أرسل مبلغاً آخر.",
    invalid: "يرجى إرسال رقم صحيح 🙏",
    oldUnit: "قديم",
    newUnit: "جديد",
    openMiniApp: "📱 التطبيق",
    refreshRates: "🔄 الأسعار",
    fxBtn: "💱 التحويل",
    countLabel: "قطع",
    settingsUpdated: "تم ✅"
  },
  en: {
    title: "Lira Guide",
    subtitle: "Digital Edition",
    sendAmount: "Send amount or choose settings:",
    inputAmount: "Amount",
    equivalent: "Equivalent",
    breakdownTitle: "Breakdown",
    changeNote: "Remaining Change",
    sendAnother: "Send another amount.",
    invalid: "Invalid number 🙏",
    oldUnit: "Old",
    newUnit: "New",
    openMiniApp: "📱 App",
    refreshRates: "🔄 Rates",
    fxBtn: "💱 FX",
    countLabel: "Qty",
    settingsUpdated: "Updated ✅"
  }
};

const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, { lang: "ar", mode: "oldToNew", lastAmount: null });
  }
  return userStates.get(id);
}

function getKeyboard(id) {
  const s = getUS(id);
  const t = TRANSLATIONS[s.lang];
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(s.lang === "ar" ? "✅ العربية" : "AR", "setLang:ar"),
      Markup.button.callback(s.lang !== "ar" ? "✅ EN" : "EN", "setLang:en"),
    ],
    [
      Markup.button.callback(s.mode === "oldToNew" ? "✅ قديم ⬅️ جديد" : "قديم ⬅️ جديد", "setMode:oldToNew"),
      Markup.button.callback(s.mode === "newToOld" ? "✅ جديد ⬅️ قديم" : "جديد ⬅️ قديم", "setMode:newToOld"),
    ],
    [
      Markup.button.callback(t.refreshRates, "refreshRates"),
      Markup.button.callback(t.fxBtn, "showFx"),
    ]
  ]);
}

function calc(mode, amount) {
  const isOldToNew = mode === "oldToNew";
  let targetVal = isOldToNew ? amount / RATE : amount * RATE;
  
  // التقريب لمنع مشاكل الفاصلة العائمة
  targetVal = Math.round(targetVal * 100) / 100;

  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  let remainingForDist = targetVal;
  let dist = [];

  // توزيع الفئات
  for (const d of activeDenoms) {
    const count = Math.floor((remainingForDist + 0.0001) / d.v);
    if (count > 0) {
      dist.push({ ...d, count });
      remainingForDist = Math.round((remainingForDist - count * d.v) * 100) / 100;
    }
  }

  return { targetVal, remaining: remainingForDist, dist };
}

function buildResultMessage(lang, mode, amount) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";
  const res = calc(mode, amount);

  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  let lines = [
    `*${t.title}*`,
    `• ${t.inputAmount}: *${amount}* ${inUnit}`,
    `• ${t.equivalent}: *${res.targetVal}* ${outUnit}`,
    ""
  ];

  lines.push(`*${t.breakdownTitle}*:`);
  if (res.dist.length === 0 && res.remaining === 0) {
    lines.push("—");
  } else {
    for (const p of res.dist) {
      lines.push(`${p.s} فئة ${p.v} : *${p.count}* ${t.countLabel}`);
    }
  }

  if (res.remaining > 0) {
    lines.push("");
    lines.push(`*${t.changeNote}*:`);
    if (isOldToNew) {
      // إذا كنا نحول لجديد، الباقي يظهر بالجديد وقيمته بالقديم
      lines.push(`*${res.remaining}* ${t.newUnit} (تعادل *${Math.round(res.remaining * RATE)}* ${t.oldUnit})`);
    } else {
      // إذا كنا نحول لقديم، الباقي يظهر بالقديم وقيمته بالجديد
      lines.push(`*${res.remaining}* ${t.oldUnit} (تعادل *${(res.remaining / RATE).toFixed(2)}* ${t.newUnit})`);
    }
  }

  lines.push("", t.sendAnother);
  return lines.join("\n");
}

bot.start((ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];
  ctx.replyWithMarkdown(`*${t.title}*\n${t.subtitle}\n\n${t.sendAmount}`, getKeyboard(ctx.from.id));
});

bot.on("text", (ctx) => {
  const s = getUS(ctx.from.id);
  const val = Number(ctx.message.text.replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]).replace(/,/g, ""));
  
  if (isNaN(val) || val <= 0) return ctx.reply(TRANSLATIONS[s.lang].invalid);
  
  s.lastAmount = val;
  ctx.replyWithMarkdown(buildResultMessage(s.lang, s.mode, val), getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1];
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  ctx.editMessageText(TRANSLATIONS[s.lang].sendAmount, getKeyboard(ctx.from.id)).catch(()=>{});
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = ctx.match[1];
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  ctx.editMessageText(TRANSLATIONS[s.lang].sendAmount, getKeyboard(ctx.from.id)).catch(()=>{});
});

bot.action("refreshRates", (ctx) => {
  const s = getUS(ctx.from.id);
  let msg = `*العملات الأجنبية:*\n\n`;
  Object.values(FLAG_BY_CODE).forEach(v => msg += `• ${v}\n`);
  ctx.replyWithMarkdown(msg);
});

bot.action("showFx", (ctx) => {
  const s = getUS(ctx.from.id);
  let msg = `*تحويل العملات:*\n\n`;
  Object.values(FLAG_BY_CODE).forEach(v => msg += `• ${v}\n`);
  ctx.replyWithMarkdown(msg);
});

export default async function handler(req, res) {
  if (req.method === "POST") await bot.handleUpdate(req.body);
  return res.status(200).send("OK");
    }
