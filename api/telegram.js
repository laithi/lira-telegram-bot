import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

const DEFAULT_RATES_URL =
  process.env.RATES_URL ||
  "https://raw.githubusercontent.com/laithi/lira-telegram-bot/main/rates.json";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- البيانات (الفئات النقدية) ---
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل", en: "Wheat" }, s: "🌾" },
  { v: 200, n: { ar: "زيتون", en: "Olive" }, s: "🫒" },
  { v: 100, n: { ar: "قطن", en: "Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "حمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "عنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "ياسمين", en: "Jasmine" }, s: "🌼" },
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "خمسة آلاف", en: "5000" }, s: "💶" },
  { v: 2000, n: { ar: "ألفين", en: "2000" }, s: "💶" },
  { v: 1000, n: { ar: "ألف", en: "1000" }, s: "💵" },
  { v: 500, n: { ar: "خمسمئة", en: "500" }, s: "💵" },
];

const FLAG_BY_CODE = { 
  USD: "🇺🇸", AED: "🇦🇪", SAR: "🇸🇦", EUR: "🇪🇺", 
  KWD: "🇰🇼", SEK: "🇸🇪", GBP: "🇬🇧", JOD: "🇯🇴" 
};
const ORDERED_CODES = ["USD", "AED", "SAR", "EUR", "KWD", "SEK", "GBP", "JOD"];

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
    fxTitle: "أسعار العملات (وسطي)",
    dateLabel: "التاريخ",
    timeLabel: "الساعة",
    noRates: "الأسعار غير متاحة حالياً.",
    settingsUpdated: "تم التحديث ✅",
    langAR: "✅ العربية",
    langEN: "EN",
    modeOldToNewChecked: "✅ من قديم لجديد",
    modeNewToOldChecked: "✅ من جديد لقديم",
    modeOldToNew: "من قديم لجديد",
    modeNewToOld: "من جديد لقديم",
    fxBtn: "💱 تحويل للعملات",
    fxCalcTitle: "تحويل للعملات الأجنبية",
    fxInputLabel: "الأصل",
    fxEqLabel: "المعادل",
    fxNoLast: "لم يتم إدخال مبلغ بعد 🙏",
    fxNoRatesNow: "خدمة الصرف غير متاحة.",
    fxDualNew: "بـالجديدة تشتري",
    fxDualOld: "بـالقديمة تشتري",
    askForAmount: "يرجى إدخال المبلغ المراد تحويله الآن:"
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
    fxTitle: "FX Rates",
    dateLabel: "Date",
    timeLabel: "Time",
    noRates: "Rates unavailable.",
    settingsUpdated: "Updated ✅",
    langAR: "AR",
    langEN: "✅ EN",
    modeOldToNewChecked: "✅ Old → New",
    modeNewToOldChecked: "✅ New → Old",
    modeOldToNew: "Old → New",
    modeNewToOld: "New → Old",
    fxBtn: "💱 FX Conversion",
    fxCalcTitle: "FX Conversion Result",
    fxInputLabel: "Source",
    fxEqLabel: "Eq",
    fxNoLast: "No amount entered yet 🙏",
    fxNoRatesNow: "FX service unavailable.",
    fxDualNew: "With NEW you buy",
    fxDualOld: "With OLD you buy",
    askForAmount: "Please enter the amount to convert now:"
  },
};

// --- إدارة الحالة ---
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, {
      lang: "ar",
      mode: "oldToNew",
      lastAmount: null,
      lastResult: null,
    });
  }
  return userStates.get(id);
}

// --- لوحات المفاتيح ---
function getKeyboard(id) {
  const s = getUS(id);
  const t = TRANSLATIONS[s.lang];
  const isAr = s.lang === "ar";
  const isOldToNew = s.mode === "oldToNew";

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(isAr ? t.langAR : t.langAR, "setLang:ar"),
      Markup.button.callback(!isAr ? t.langEN : t.langEN, "setLang:en"),
    ],
    [
      Markup.button.callback(isOldToNew ? t.modeOldToNewChecked : t.modeOldToNew, "setMode:oldToNew"),
      Markup.button.callback(!isOldToNew ? t.modeNewToOldChecked : t.modeNewToOld, "setMode:newToOld"),
    ],
    [
      Markup.button.callback(t.refreshRates, "refreshRates"),
      Markup.button.callback(t.fxBtn, "showFx"),
    ],
    [Markup.button.webApp(t.openMiniApp, APP_URL)],
  ]);
}

// --- مساعدات ---
function normalizeDigits(str) {
  return String(str)
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] ?? d)
    .replace(/,/g, "")
    .trim();
}

function parseAmount(text) {
  const cleaned = normalizeDigits(text);
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function nf(lang, val) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 }).format(val);
}

function pad2(n) { return String(n).padStart(2, "0"); }
function formatDMY_HM(iso) {
  if (!iso) return { date: null, time: null };
  const d = new Date(iso);
  return { 
    date: `${pad2(d.getUTCDate())}:${pad2(d.getUTCMonth()+1)}:${d.getUTCFullYear()}`, 
    time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}` 
  };
}

// --- العمليات الحسابية ---
function calc(mode, amount) {
  const isOldToNew = mode === "oldToNew";
  let resVal = isOldToNew ? amount / RATE : amount * RATE;
  resVal = Math.round(resVal * 100) / 100;

  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  let remaining = resVal;
  let dist = [];

  for (const d of activeDenoms) {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      dist.push({ ...d, count });
      remaining = Math.round((remaining - count * d.v) * 100) / 100;
    }
  }
  return { resVal, remaining, dist, isOldToNew };
}

// --- جلب الأسعار ---
let RATES_CACHE = { data: null, fetchedAt: 0 };
const RATES_TTL = 60000;

async function fetchRates(force = false) {
  const now = Date.now();
  if (!force && RATES_CACHE.data && now - RATES_CACHE.fetchedAt < RATES_TTL) return RATES_CACHE.data;
  try {
    const r = await fetch(DEFAULT_RATES_URL, { cache: "no-store" });
    const json = await r.json();
    RATES_CACHE = { data: json, fetchedAt: now };
    return json;
  } catch (e) { return RATES_CACHE.data; }
}

// --- منطق تحويل العملات الأجنبية ---
function buildFxMessage(lang, s, ratesJson) {
  const t = TRANSLATIONS[lang];
  const rates = ratesJson?.rates || {};
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const originalAmount = s.lastAmount;
  const isCurrentlyOld = s.mode === "oldToNew";

  const lines = [`*${t.fxCalcTitle}*`, ""];
  lines.push(`💰 ${t.fxInputLabel}: *${nf(lang, originalAmount)}*`);
  lines.push("ــــــــــــــــــــ");

  let printed = 0;
  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (!mid || mid <= 0) continue;

    const flag = FLAG_BY_CODE[code] || "🏳️";
    const resultAsNew = originalAmount / mid;
    const resultAsOld = originalAmount / (mid * RATE);

    lines.push(`${flag}  *${code}*`);
    lines.push(`• ${t.fxDualNew}: *${nfEN.format(resultAsNew)}*`);
    lines.push(`• ${t.fxDualOld}: *${nfEN.format(resultAsOld)}*`);
    lines.push("");
    printed++;
  }

  if (!printed) lines.push(t.fxNoRatesNow);
  return lines.join("\n").trim();
}

// --- بناء الرسائل ---
function formatRatesBlock(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { date, time } = formatDMY_HM(ratesJson?.generated_at_utc);

  const lines = [`*${t.fxTitle}*`];
  if (date) lines.push(`${t.dateLabel}: *${date}* | ${t.timeLabel}: *${time}*`);
  lines.push("");

  const rates = ratesJson?.rates || {};
  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (mid) lines.push(`${FLAG_BY_CODE[code] || "🏳️"} *${code}* ${nfEN.format(mid)}`);
  }
  return lines.join("\n").trim();
}

function buildResultMessage(lang, mode, amount, res, ratesJson) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";
  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  const lines = [
    `*${t.title}*`,
    `${t.subtitle}`,
    "",
    `• ${t.inputAmount}: *${nf(lang, amount)}* ${inUnit}`,
    `• ${t.equivalent}: *${nf(lang, res.resVal)}* ${outUnit}`,
    "",
    `*${t.breakdownTitle}*`,
    `_(${isOldToNew ? t.breakdownSubNew : t.breakdownSubOld})_`,
    ""
  ];

  if (!res.dist.length) lines.push("—");
  else {
    for (const p of res.dist) {
      lines.push(`${p.s}   *${p.v}* ×   ${p.count}`);
    }
  }

  if (res.remaining > 0) {
    lines.push("", `*${t.changeNote}*`);
    if (isOldToNew) {
      lines.push(`بقي *${nf(lang, res.remaining)}* ${t.newUnit}، تدفعها بالقديم (*${nf(lang, Math.round(res.remaining*RATE))}* ${t.oldUnit}).`);
    } else {
      lines.push(`بقي *${nf(lang, res.remaining)}* ${t.oldUnit}، تدفعها بالجديد (*${(res.remaining/RATE).toFixed(2)}* ${t.newUnit}).`);
    }
  }

  lines.push("", "ــــــــــــــــــــ", "", formatRatesBlock(lang, ratesJson), "", t.sendAnother);
  return lines.join("\n");
}

// --- المعالجات ---
bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  const rates = await fetchRates();
  const t = TRANSLATIONS[s.lang];
  const welcome = `*${t.title}*\n${t.subtitle}\n\n${t.sendAmount}\n\n${formatRatesBlock(s.lang, rates)}`;
  return ctx.replyWithMarkdown(welcome, getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1];
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  if (s.lastAmount) {
    const rates = await fetchRates();
    const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
    return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) }).catch(()=>{});
  }
  return ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup).catch(()=>{});
});

// تعديل زر الوضع لمسح البيانات وطلب مبلغ جديد
bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];
  s.mode = ctx.match[1];
  
  // مسح البيانات السابقة
  s.lastAmount = null;
  s.lastResult = null;

  await ctx.answerCbQuery(t.settingsUpdated);
  
  const rates = await fetchRates();
  const modeText = s.mode === "oldToNew" ? t.modeOldToNewChecked : t.modeNewToOldChecked;
  
  const msg = `*${t.title}*\n${t.subtitle}\n\n⚙️ الوضع الحالي: *${modeText}*\n\n${t.askForAmount}\n\n${formatRatesBlock(s.lang, rates)}`;
  
  return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) }).catch(()=>{});
});

bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  const rates = await fetchRates(true);
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  const msg = s.lastAmount 
    ? buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates)
    : `*${TRANSLATIONS[s.lang].title}*\n${TRANSLATIONS[s.lang].subtitle}\n\n${formatRatesBlock(s.lang, rates)}`;
  return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) }).catch(()=>{});
});

bot.action("showFx", async (ctx) => {
  const s = getUS(ctx.from.id);
  if (!s.lastAmount) return ctx.answerCbQuery(TRANSLATIONS[s.lang].fxNoLast);
  const rates = await fetchRates();
  await ctx.answerCbQuery();
  return ctx.replyWithMarkdown(buildFxMessage(s.lang, s, rates), getKeyboard(ctx.from.id));
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const amount = parseAmount(ctx.message.text);
  if (!amount) return ctx.reply(TRANSLATIONS[s.lang].invalid);
  
  s.lastAmount = amount;
  s.lastResult = calc(s.mode, amount);
  const rates = await fetchRates();
  return ctx.replyWithMarkdown(buildResultMessage(s.lang, s.mode, amount, s.lastResult, rates), getKeyboard(ctx.from.id));
});

export default async function handler(req, res) {
  if (TELEGRAM_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) return res.status(401).send();
  if (req.method === "POST") await bot.handleUpdate(req.body);
  return res.status(200).send("OK");
}

