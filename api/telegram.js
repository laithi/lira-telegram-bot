import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- فئات العملة الجديدة ---
const DENOMS_NEW = [
  { v: 500, s: "🌾", n: { ar: "سنابل القمح", en: "Wheat" } },
  { v: 200, s: "🫒", n: { ar: "أغصان الزيتون", en: "Olive" } },
  { v: 100, s: "☁️", n: { ar: "القطن", en: "Cotton" } },
  { v: 50,  s: "🍊", n: { ar: "الحمضيات", en: "Citrus" } },
  { v: 25,  s: "🍇", n: { ar: "التوت الشامي", en: "Mulberry" } },
  { v: 10,  s: "🌼", n: { ar: "الياسمين", en: "Jasmine" } }
];

// --- فئات العملة القديمة (تم تغيير الشعار إلى 💸 - أوراق نقدية محايدة بدون أي رموز) ---
const DENOMS_OLD = [
  { v: 5000, s: "💸", n: { ar: "خمسة آلاف", en: "5000" } },
  { v: 2000, s: "💸", n: { ar: "ألفين",     en: "2000" } },
  { v: 1000, s: "💸", n: { ar: "ألف",       en: "1000" } },
  { v: 500,  s: "💸", n: { ar: "خمسمئة",    en: "500" } },
  { v: 200,  s: "💸", n: { ar: "مئتان",     en: "200" } },
  { v: 100,  s: "💸", n: { ar: "مئة",       en: "100" } }
];

// --- مسميات العملات الأجنبية الكاملة ---
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
    subtitle: "دليل العملة السورية الجديدة",
    sendAmount: "اختر الإعدادات أو أرسل مبلغاً للحساب:",
    inputAmount: "المبلغ المدخل",
    equivalent: "القيمة المقابلة",
    breakdownTitle: "توزيع الفئات النقدية",
    breakdownSubNew: "حسب فئات الإصدار الجديد",
    breakdownSubOld: "حسب فئات الإصدار القديم",
    changeNote: "ملاحظة الفراطة",
    sendAnother: "أرسل مبلغاً آخر للحساب.",
    invalid: "يرجى إرسال رقم صحيح 🙏",
    oldUnit: "ل.س قديمة",
    newUnit: "ليرة جديدة",
    openMiniApp: "📱 فتح التطبيق المصغر",
    refreshRates: "🔄 تحديث الأسعار",
    fxBtn: "💱 تحويل للعملات",
    settingsUpdated: "تم التحديث ✅",
    langAR: "✅ العربية",
    langEN: "EN",
    modeOldToNewChecked: "✅ من قديم لجديد",
    modeNewToOldChecked: "✅ من جديد لقديم",
    modeOldToNew: "من قديم لجديد",
    modeNewToOld: "من جديد لقديم",
    countLabel: "قطع",
    ratesNote: "💡 لمشاهدة أسعار الصرف، استخدم زر تحويل العملات."
  },
  en: {
    title: "Lira Guide",
    subtitle: "New Syrian Currency Guide",
    sendAmount: "Choose settings or send amount:",
    inputAmount: "Input Amount",
    equivalent: "Equivalent",
    breakdownTitle: "Banknote Breakdown",
    breakdownSubNew: "NEW issuance denominations",
    breakdownSubOld: "OLD denominations",
    changeNote: "Change Note",
    sendAnother: "Send another number.",
    invalid: "Please send a valid number 🙏",
    oldUnit: "Old SYP",
    newUnit: "New Lira",
    openMiniApp: "📱 Open App",
    refreshRates: "🔄 Refresh",
    fxBtn: "💱 FX Conversion",
    settingsUpdated: "Updated ✅",
    langAR: "AR",
    langEN: "✅ EN",
    modeOldToNewChecked: "✅ Old → New",
    modeNewToOldChecked: "✅ New → Old",
    modeOldToNew: "Old → New",
    modeNewToOld: "New → Old",
    countLabel: "Bills",
    ratesNote: "💡 Use FX Conversion to see rates."
  }
};

const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, { lang: "ar", mode: "oldToNew", lastAmount: null, lastResult: null });
  }
  return userStates.get(id);
}

function getKeyboard(id) {
  const s = getUS(id);
  const t = TRANSLATIONS[s.lang];
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(s.lang === "ar" ? t.langAR : "AR", "setLang:ar"),
      Markup.button.callback(s.lang !== "ar" ? t.langEN : "EN", "setLang:en"),
    ],
    [
      Markup.button.callback(s.mode === "oldToNew" ? t.modeOldToNewChecked : t.modeOldToNew, "setMode:oldToNew"),
      Markup.button.callback(s.mode !== "oldToNew" ? t.modeNewToOldChecked : t.modeNewToOld, "setMode:newToOld"),
    ],
    [
      Markup.button.callback(t.refreshRates, "refreshRates"),
      Markup.button.callback(t.fxBtn, "showFx"),
    ],
    [Markup.button.webApp(t.openMiniApp, APP_URL)],
  ]);
}

function nf(lang, val) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 }).format(val);
}

function calc(mode, amount) {
  const isOldToNew = mode === "oldToNew";
  let resVal = isOldToNew ? amount / RATE : amount * RATE;
  resVal = Math.round(resVal * 100) / 100;

  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  let currentTotal = resVal;
  let dist = [];

  for (const d of activeDenoms) {
    const count = Math.floor((currentTotal + 0.0001) / d.v);
    if (count > 0) {
      dist.push({ ...d, count });
      currentTotal = Math.round((currentTotal - count * d.v) * 100) / 100;
    }
  }

  return { resVal, remaining: currentTotal, dist };
}

function buildResultMessage(lang, mode, amount, res) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";
  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  const lines = [
    `*${t.title}*`, `${t.subtitle}`, "",
    `• ${t.inputAmount}: *${nf(lang, amount)}* ${inUnit}`,
    `• ${t.equivalent}: *${nf(lang, res.resVal)}* ${outUnit}`,
    ""
  ];

  if (res.remaining > 0) {
    lines.push(`*${t.changeNote}*`);
    if (isOldToNew) {
      lines.push(`بقي *${nf(lang, res.remaining)}* ${t.newUnit}، تُدفع بالقديم (*${Math.round(res.remaining * RATE)}* ${t.oldUnit}).`);
    } else {
      lines.push(`بقي *${nf(lang, res.remaining)}* ${t.oldUnit}، تُدفع بالجديد (*${(res.remaining / RATE).toFixed(2)}* ${t.newUnit}).`);
    }
    lines.push("");
  }

  lines.push(`*${t.breakdownTitle}*`, `_(${isOldToNew ? t.breakdownSubNew : t.breakdownSubOld})_`, "");

  if (!res.dist.length) {
    lines.push("—");
  } else {
    for (const p of res.dist) {
      const name = p.n?.[lang] || p.v;
      lines.push(`${p.s} *${name}* ${p.v} : *${p.count}* ${t.countLabel}`);
    }
  }

  lines.push("", "ــــــــــــــــــــ", "", t.sendAnother);
  return lines.join("\n");
}

bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];
  return ctx.replyWithMarkdown(`*${t.title}*\n${t.subtitle}\n\n${t.sendAmount}`, getKeyboard(ctx.from.id));
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const text = ctx.message.text.replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]).replace(/,/g, "").trim();
  const amount = Number(text);
  if (isNaN(amount) || amount <= 0) return ctx.reply(TRANSLATIONS[s.lang].invalid);
  
  s.lastAmount = amount; 
  s.lastResult = calc(s.mode, amount);
  return ctx.replyWithMarkdown(buildResultMessage(s.lang, s.mode, amount, s.lastResult), getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1];
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  if (s.lastAmount) {
    return ctx.editMessageText(buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult), { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) }).catch(()=>{});
  }
  return ctx.editMessageText(`*${TRANSLATIONS[s.lang].title}*\n${TRANSLATIONS[s.lang].subtitle}\n\n${TRANSLATIONS[s.lang].sendAmount}`, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) }).catch(()=>{});
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = ctx.match[1];
  s.lastAmount = null; s.lastResult = null;
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  const t = TRANSLATIONS[s.lang];
  return ctx.replyWithMarkdown(`*${t.title}*\n${t.subtitle}\n\n⚙️ تم تغيير الوضع\n\nأرسل المبلغ المراد تحويله:`, getKeyboard(ctx.from.id));
});

bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  let fxMsg = `*العملات الأجنبية المتاحة:*\n\n`;
  Object.values(FLAG_BY_CODE).forEach(val => {
    fxMsg += `• ${val}\n`;
  });
  return ctx.replyWithMarkdown(fxMsg);
});

bot.action("showFx", async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.answerCbQuery();
  let fxMsg = `*العملات الأجنبية المدعومة:*\n\n`;
  Object.values(FLAG_BY_CODE).forEach(val => {
    fxMsg += `• ${val}\n`;
  });
  return ctx.replyWithMarkdown(fxMsg);
});

export default async function handler(req, res) {
  if (req.method === "POST") await bot.handleUpdate(req.body);
  return res.status(200).send("OK");
}
