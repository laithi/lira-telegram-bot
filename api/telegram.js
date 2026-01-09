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
  return String(str).replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] ?? d).replace(/,/g, "").trim();
}
function parseAmount(text) {
  const cleaned = normalizeDigits(text);
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return (Number.isFinite(n) && n > 0) ? n : null;
}
function nf(lang, val) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 }).format(val);
}
function pad2(n) { return String(n).padStart(2, "0"); }

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function padLeft(str, width) {
  str = String(str);
  return str.length >= width ? str : " ".repeat(width - str.length) + str;
}
function padRight(str, width) {
  str = String(str);
  return str.length >= width ? str : str + " ".repeat(width - str.length);
}

// RTL mark
const RLM = "\u200F";

function preBlock(lines) {
  const out = lines.map((l) => `${RLM}${l}`).join("\n");
  return `<pre>${escHtml(out)}</pre>`;
}

// key/value table inside pre
function kvTableBlock(emoji, title, rows) {
  const keyW = Math.max(1, ...rows.map((r) => String(r.k).length));
  const lines = [];
  lines.push(`${emoji} ${title}`);
  for (const r of rows) {
    const k = padRight(r.k, keyW);
    lines.push(`${k}  |  ${r.v}`);
  }
  return preBlock(lines);
}

// simple text block inside pre
function textBlock(emoji, title, texts) {
  const lines = [];
  lines.push(`${emoji} ${title}`);
  for (const t of texts) lines.push(t);
  return preBlock(lines);
}

/**
 * Get Dynamic Syria Time (GMT+3)
 */
function getSyriaTime() {
  const nowUTC = new Date();
  const syriaTime = new Date(nowUTC.getTime() + (3 * 60 * 60 * 1000));
  return {
    date: `${pad2(syriaTime.getUTCDate())}:${pad2(syriaTime.getUTCMonth()+1)}:${syriaTime.getUTCFullYear()}`,
    time: `${pad2(syriaTime.getUTCHours())}:${pad2(syriaTime.getUTCMinutes())}`
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
  } catch (e) { return RATES_CACHE.data; }
}

// --- Dynamic FX & Rates Combined Message (RTL pre blocks) ---
function buildFxAndRatesMessage(lang, s, ratesJson) {
  const t = TRANSLATIONS[lang];
  const rates = ratesJson?.rates || {};
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const { date, time } = getSyriaTime();

  const originalAmount = s.lastAmount;
  const isCurrentlyOld = s.mode === "oldToNew";
  const unitLabel = isCurrentlyOld ? t.oldUnit : t.newUnit;

  const blocks = [];

  blocks.push(
    kvTableBlock("🟦", t.fxCalcTitle, [
      { k: t.dateLabel, v: date },
      { k: t.timeLabel, v: time },
      { k: t.fxInputLabel, v: `${nf(lang, originalAmount)} ${unitLabel}` },
    ])
  );

  const preLines = [];
  let printed = 0;

  // widths for nicer alignment
  const mids = ORDERED_CODES
    .map((c) => ({ c, mid: rates?.[c]?.mid }))
    .filter((x) => x.mid && x.mid > 0);

  const midW = Math.max(1, ...mids.map((x) => nfEN.format(x.mid).length));
  // compute result widths based on current amount
  const resNewArr = mids.map((x) => nfEN.format(originalAmount / x.mid));
  const resOldArr = mids.map((x) => nfEN.format(originalAmount / (x.mid * RATE)));
  const resNewW = Math.max(1, ...resNewArr.map((s) => s.length));
  const resOldW = Math.max(1, ...resOldArr.map((s) => s.length));

  for (const codeC of ORDERED_CODES) {
    const mid = rates?.[codeC]?.mid;
    if (!mid || mid <= 0) continue;

    const flag = FLAG_BY_CODE[codeC] || "🏳️";
    const resultAsNew = nfEN.format(originalAmount / mid);
    const resultAsOld = nfEN.format(originalAmount / (mid * RATE));
    const midStr = padLeft(nfEN.format(mid), midW);
    const newStr = padLeft(resultAsNew, resNewW);
    const oldStr = padLeft(resultAsOld, resOldW);

    preLines.push(`${flag}  ${codeC}  |  السعر ${midStr}`);
    preLines.push(`${t.fxDualNew}  |  ${newStr}`);
    preLines.push(`${t.fxDualOld}  |  ${oldStr}`);
    preLines.push("");
    printed++;
  }

  if (!printed) {
    blocks.push(textBlock("🟨", t.fxTitle, [t.fxNoRatesNow]));
  } else {
    blocks.push(preBlock([`🟨 ${t.fxTitle}`, ...preLines].filter(Boolean)));
  }

  return blocks.join("\n\n").trim();
}

// --- Dynamic Rate Only Block (RTL pre blocks) ---
function formatRatesOnly(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const { date, time } = getSyriaTime();

  const blocks = [];

  blocks.push(
    kvTableBlock("🟦", t.fxTitle, [
      { k: t.dateLabel, v: date },
      { k: t.timeLabel, v: time },
    ])
  );

  const rates = ratesJson?.rates || {};
  const preLines = [];
  let printed = 0;

  const mids = ORDERED_CODES
    .map((c) => ({ c, mid: rates?.[c]?.mid }))
    .filter((x) => x.mid && x.mid > 0);

  const midW = Math.max(1, ...mids.map((x) => nfEN.format(x.mid).length));

  for (const c of ORDERED_CODES) {
    const mid = rates?.[c]?.mid;
    if (!mid || mid <= 0) continue;
    const midStr = padLeft(nfEN.format(mid), midW);
    preLines.push(`${FLAG_BY_CODE[c] || "🏳️"}  ${c}  |  ${midStr}`);
    printed++;
  }

  if (!printed) blocks.push(textBlock("🟨", t.fxTitle, [t.noRates]));
  else blocks.push(preBlock([`🟨 ${t.fxTitle}`, ...preLines]));

  return blocks.join("\n\n").trim();
}

// --- Result Message (ALL sections as RTL pre blocks, no separators) ---
function buildResultMessage(lang, mode, amount, res) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";
  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  const blocks = [];

  // header + summary
  blocks.push(
    kvTableBlock("🟦", `${t.title} — ${t.subtitle}`, [
      { k: t.inputAmount, v: `${nf(lang, amount)} ${inUnit}` },
      { k: t.equivalent, v: `${nf(lang, res.resVal)} ${outUnit}` },
    ])
  );

  // change note
  if (res.remaining > 0) {
    const note =
      isOldToNew
        ? `بقي ${nf(lang, res.remaining)} ${t.newUnit}، تدفعها بالقديم (${nf(lang, Math.round(res.remaining * RATE))} ${t.oldUnit}).`
        : `بقي ${nf(lang, res.remaining)} ${t.oldUnit}، تدفعها بالجديد (${(res.remaining / RATE).toFixed(2)} ${t.newUnit}).`;

    blocks.push(textBlock("🟩", t.changeNote, [note]));
  }

  // breakdown table (requested format: icon then denom then "عدد" then count)
  if (!res.dist.length) {
    blocks.push(textBlock("🟨", `${t.breakdownTitle} (${isOldToNew ? t.breakdownSubNew : t.breakdownSubOld})`, ["—"]));
  } else {
    const denomWidth = Math.max(1, ...res.dist.map((p) => String(p.v).length));
    const countWidth = Math.max(1, ...res.dist.map((p) => String(p.count).length));
    const countWord = lang === "ar" ? "عدد" : "count";

    const lines = [];
    lines.push(`🟨 ${t.breakdownTitle}`);
    lines.push(`(${isOldToNew ? t.breakdownSubNew : t.breakdownSubOld})`);
    lines.push("");

    for (const p of res.dist) {
      const denomStr = padLeft(p.v, denomWidth);
      const countStr = padLeft(p.count, countWidth);
      lines.push(`${p.s}  ${denomStr}  ${countWord}  ${countStr}`);
    }

    blocks.push(preBlock(lines));
  }

  // tips block
  blocks.push(
    textBlock("🟪", t.sendAnother, [
      t.ratesNote,
      "",
      t.sendAnother,
    ])
  );

  return blocks.join("\n\n").trim();
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

// --- Handlers ---
bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];

  const msg = preBlock([
    `🟦 ${t.title}`,
    t.subtitle,
    "",
    t.sendAmount,
  ]);

  return ctx.reply(msg, { parse_mode: "HTML", ...getKeyboard(ctx.from.id) });
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1];
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);

  const t = TRANSLATIONS[s.lang];

  if (s.lastAmount) {
    return ctx.editMessageText(buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult), {
      parse_mode: "HTML",
      ...getKeyboard(ctx.from.id),
    }).catch(()=>{});
  } else {
    const msg = preBlock([`🟦 ${t.title}`, t.subtitle, "", t.sendAmount]);
    return ctx.editMessageText(msg, { parse_mode: "HTML", ...getKeyboard(ctx.from.id) }).catch(()=>{});
  }
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];
  s.mode = ctx.match[1];
  s.lastAmount = null; s.lastResult = null;
  await ctx.answerCbQuery(t.settingsUpdated);

  const modeText = s.mode === "oldToNew" ? t.modeOldToNewChecked : t.modeNewToOldChecked;

  const msg = preBlock([
    `🟦 ${t.title}`,
    t.subtitle,
    "",
    `⚙️ ${modeText}`,
    "",
    t.askForAmount,
  ]);

  return ctx.reply(msg, { parse_mode: "HTML", ...getKeyboard(ctx.from.id) });
});

bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  const rates = await fetchRates(true);
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  return ctx.reply(formatRatesOnly(s.lang, rates), { parse_mode: "HTML", ...getKeyboard(ctx.from.id) });
});

bot.action("showFx", async (ctx) => {
  const s = getUS(ctx.from.id);
  if (!s.lastAmount) return ctx.answerCbQuery(TRANSLATIONS[s.lang].fxNoLast);
  const rates = await fetchRates();
  await ctx.answerCbQuery();
  return ctx.reply(buildFxAndRatesMessage(s.lang, s, rates), { parse_mode: "HTML", ...getKeyboard(ctx.from.id) });
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const amount = parseAmount(ctx.message.text);
  if (!amount) return ctx.reply(TRANSLATIONS[s.lang].invalid);
  s.lastAmount = amount; s.lastResult = calc(s.mode, amount);
  return ctx.reply(buildResultMessage(s.lang, s.mode, amount, s.lastResult), { parse_mode: "HTML", ...getKeyboard(ctx.from.id) });
});

export default async function handler(req, res) {
  if (TELEGRAM_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) return res.status(401).send();
  if (req.method === "POST") await bot.handleUpdate(req.body);
  return res.status(200).send("OK");
}
