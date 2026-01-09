import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.BOT_TOKEN ? process.env.TELEGRAM_SECRET : process.env.TELEGRAM_SECRET;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

const DEFAULT_RATES_URL =
  process.env.RATES_URL ||
  "https://raw.githubusercontent.com/laithi/lira-telegram-bot/main/rates.json";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- Denominations Data ---
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
  USD: "🇺🇸",
  AED: "🇦🇪",
  SAR: "🇸🇦",
  EUR: "🇪🇺",
  KWD: "🇰🇼",
  SEK: "🇸🇪",
  GBP: "🇬🇧",
  JOD: "🇯🇴",
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
    fxCalcTitle: "أسعار الصرف وتحويل المبلغ",
    fxInputLabel: "المبلغ المستخدم للتحويل",
    fxNoLast: "لم يتم إدخال مبلغ بعد 🙏",
    fxNoRatesNow: "خدمة الصرف غير متاحة.",
    fxDualNew: "قيمتها بالليرة الجديدة",
    fxDualOld: "قيمتها بالليرة القديمة",
    askForAmount: "يرجى إدخال المبلغ المراد تحويله الآن:",
    ratesNote: "💡 لرؤية أسعار الصرف، اضغط على *تحديث الأسعار* أو *تحويل للعملات*.",
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
    fxCalcTitle: "Exchange Rates & Conversion",
    fxInputLabel: "Amount Used",
    fxNoLast: "No amount entered yet 🙏",
    fxNoRatesNow: "FX service unavailable.",
    fxDualNew: "Value in NEW Lira",
    fxDualOld: "Value in OLD SYP",
    askForAmount: "Please enter the amount to convert now:",
    ratesNote: "💡 To see FX rates, press *Refresh* or *FX Conversion*.",
  },
};

// --- State Management ---
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, { lang: "ar", mode: "oldToNew", lastAmount: null, lastResult: null });
  }
  return userStates.get(id);
}

// --- Keyboards ---
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

// --- Helpers ---
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
  return Number.isFinite(n) && n > 0 ? n : null;
}
function nf(lang, val) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 }).format(val);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

// --- Time ---
function getSyriaTime() {
  const nowUTC = new Date();
  const syriaTime = new Date(nowUTC.getTime() + 3 * 60 * 60 * 1000);
  return {
    date: `${pad2(syriaTime.getUTCDate())}:${pad2(syriaTime.getUTCMonth() + 1)}:${syriaTime.getUTCFullYear()}`,
    time: `${pad2(syriaTime.getUTCHours())}:${pad2(syriaTime.getUTCMinutes())}`,
  };
}

// --- Fetch Rates ---
let RATES_CACHE = { data: null, fetchedAt: 0 };
async function fetchRates(force = false) {
  const now = Date.now();
  if (!force && RATES_CACHE.data && now - RATES_CACHE.fetchedAt < 60000) return RATES_CACHE.data;
  try {
    const r = await fetch(DEFAULT_RATES_URL, { cache: "no-store" });
    const json = await r.json();
    RATES_CACHE = { data: json, fetchedAt: now };
    return json;
  } catch (e) {
    return RATES_CACHE.data;
  }
}

// --- Card Builders (Markdown, RTL naturally) ---
function cardTitle(title) {
  return `*${title}*`;
}

function buildSummaryCard(lang, mode, amount, res) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";
  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  return [
    cardTitle(t.title),
    t.subtitle,
    "",
    `• ${t.inputAmount}: *${nf(lang, amount)}* ${inUnit}`,
    `• ${t.equivalent}: *${nf(lang, res.resVal)}* ${outUnit}`,
  ].join("\n");
}

function buildChangeCard(lang, mode, res) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";

  let line = lang === "ar" ? "لا يوجد باقي." : "No remaining change.";
  if (res.remaining > 0) {
    line = isOldToNew
      ? `بقي *${nf(lang, res.remaining)}* ${t.newUnit}، تدفعها بالقديم (*${nf(lang, Math.round(res.remaining * RATE))}* ${t.oldUnit}).`
      : `بقي *${nf(lang, res.remaining)}* ${t.oldUnit}، تدفعها بالجديد (*${(res.remaining / RATE).toFixed(2)}* ${t.newUnit}).`;
  }

  return [cardTitle(t.changeNote), "", line].join("\n");
}

function buildBreakdownCard(lang, mode, res) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";
  const sub = isOldToNew ? t.breakdownSubNew : t.breakdownSubOld;

  const lines = [cardTitle(t.breakdownTitle), `(${sub})`, ""];

  if (!res.dist.length) {
    lines.push("—");
    return lines.join("\n");
  }

  // المطلوب: الرمز ثم الفئة ثم كلمة عدد ثم العدد + بنفس نمط الصورة (قيمة × عدد + رمز)
  const countWord = lang === "ar" ? "عدد" : "count";

  for (const p of res.dist) {
    // صيغة قريبة للصورة: 500  ×  3   🌾
    // ومع طلبك: الرمز ثم الفئة ثم كلمة عدد ثم العدد => 🌾  500  عدد  3
    // اخترت الأقرب للصورة مع الحفاظ على الشرط:
    lines.push(`${p.s}   ${p.v}   ${countWord}   ${p.count}`);
  }

  lines.push("", "__________");
  return lines.join("\n");
}

function buildFooterCard(lang) {
  const t = TRANSLATIONS[lang];
  return [starsToPlain(t.ratesNote), "", t.sendAnother].join("\n");
}

function starsToPlain(text) {
  return String(text).replace(/\*/g, "");
}

// --- FX Cards (Markdown, similar layout) ---
function buildFxHeaderCard(lang, s) {
  const t = TRANSLATIONS[lang];
  const { date, time } = getSyriaTime();
  const isCurrentlyOld = s.mode === "oldToNew";
  const unitLabel = isCurrentlyOld ? t.oldUnit : t.newUnit;

  return [
    cardTitle(t.fxCalcTitle),
    "",
    `• ${t.dateLabel}: *${date}*`,
    `• ${t.timeLabel}: *${time}*`,
    `• ${t.fxInputLabel}: *${nf(lang, s.lastAmount)}* ${unitLabel}`,
  ].join("\n");
}

function buildFxBodyCard(lang, s, ratesJson) {
  const t = TRANSLATIONS[lang];
  const rates = ratesJson?.rates || {};
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lines = [cardTitle(t.fxTitle), ""];

  let printed = 0;
  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (!mid || mid <= 0) continue;

    const flag = FLAG_BY_CODE[code] || "🏳️";
    const resultAsNew = s.lastAmount / mid;
    const resultAsOld = s.lastAmount / (mid * RATE);

    lines.push(`${flag}  *${code}* (السعر: *${nfEN.format(mid)}*)`);
    lines.push(`• ${t.fxDualNew}: *${nfEN.format(resultAsNew)}*`);
    lines.push(`• ${t.fxDualOld}: *${nfEN.format(resultAsOld)}*`);
    lines.push("");
    printed++;
  }

  if (!printed) return [cardTitle(t.fxTitle), "", t.fxNoRatesNow].join("\n");
  return lines.join("\n").trim();
}

// --- Rates Cards (Markdown, similar layout) ---
function buildRatesCard(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { date, time } = getSyriaTime();

  const lines = [cardTitle(t.fxTitle), "", `• ${t.dateLabel}: *${date}*`, `• ${t.timeLabel}: *${time}*`, ""];

  const rates = ratesJson?.rates || {};
  let printed = 0;

  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (!mid || mid <= 0) continue;
    lines.push(`${FLAG_BY_CODE[code] || "🏳️"} *${code}* ${nfEN.format(mid)}`);
    printed++;
  }

  if (!printed) return [cardTitle(t.fxTitle), "", t.noRates].join("\n");
  return lines.join("\n").trim();
}

// --- Calc Helper ---
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

// --- Send Cards (NEW messages every time) ---
async function sendCards(ctx, cards) {
  for (let i = 0; i < cards.length; i++) {
    const isLast = i === cards.length - 1;
    if (isLast) {
      await ctx.replyWithMarkdown(cards[i], getKeyboard(ctx.from.id));
    } else {
      await ctx.replyWithMarkdown(cards[i]);
    }
  }
}

// --- Handlers ---
bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];

  const msg = [cardTitle(t.title), t.subtitle, "", t.sendAmount].join("\n");
  return ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1];
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);

  // ارسال رسالة جديدة (بدون تعديل رسائل قديمة)
  const t = TRANSLATIONS[s.lang];
  const msg = [cardTitle(t.title), t.subtitle, "", t.sendAmount].join("\n");
  return ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];

  s.mode = ctx.match[1];
  s.lastAmount = null;
  s.lastResult = null;

  await ctx.answerCbQuery(t.settingsUpdated);

  const modeText = s.mode === "oldToNew" ? t.modeOldToNewChecked : t.modeNewToOldChecked;

  const msg = [cardTitle(t.title), t.subtitle, "", `⚙️ ${modeText}`, "", t.askForAmount].join("\n");
  return ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  const rates = await fetchRates(true);
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);

  const msg = buildRatesCard(s.lang, rates);
  return ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

bot.action("showFx", async (ctx) => {
  const s = getUS(ctx.from.id);
  if (!s.lastAmount) return ctx.answerCbQuery(TRANSLATIONS[s.lang].fxNoLast);

  const rates = await fetchRates();
  await ctx.answerCbQuery();

  const c1 = buildFxHeaderCard(s.lang, s);
  const c2 = buildFxBodyCard(s.lang, s, rates);

  // FX كـ Cards (رسائل جديدة)
  await sendCards(ctx, [c1, c2]);
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const amount = parseAmount(ctx.message.text);
  if (!amount) return ctx.reply(TRANSLATIONS[s.lang].invalid);

  s.lastAmount = amount;
  s.lastResult = calc(s.mode, amount);

  // ✅ كل رقم جديد => رسائل Cards جديدة، بدون تعديل السابق
  const cards = [
    buildSummaryCard(s.lang, s.mode, amount, s.lastResult),
    buildChangeCard(s.lang, s.mode, s.lastResult),
    buildBreakdownCard(s.lang, s.mode, s.lastResult),
    buildFooterCard(s.lang),
  ];

  await sendCards(ctx, cards);
});

export default async function handler(req, res) {
  if (TELEGRAM_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) return res.status(401).send();
  if (req.method === "POST") await bot.handleUpdate(req.body);
  return res.status(200).send("OK");
}
