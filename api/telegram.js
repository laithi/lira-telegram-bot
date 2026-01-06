import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

// Optional: override rates url if you want
const DEFAULT_RATES_URL =
  process.env.RATES_URL ||
  "https://raw.githubusercontent.com/laithi/lira-telegram-bot/main/rates.json";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- البيانات ---
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat" }, s: "🌾" },
  { v: 200, n: { ar: "الزيتون", en: "Olive" }, s: "🫒" },
  { v: 100, n: { ar: "القطن", en: "Cotton" }, s: "☁️" },
  { v: 50,  n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25,  n: { ar: "العنب", en: "Grapes" }, s: "🍇" },
  { v: 10,  n: { ar: "الياسمين", en: "Jasmine" }, s: "🌼" },
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "خمسة آلاف", en: "5000" }, s: "💵" },
  { v: 2000, n: { ar: "ألفين", en: "2000" }, s: "💵" },
  { v: 1000, n: { ar: "ألف", en: "1000" }, s: "💵" },
  { v: 500,  n: { ar: "خمسمئة", en: "500" },  s: "💵" },
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    sendAmount: "أرسل مبلغاً للحساب:",
    inputAmount: "المبلغ المدخل",
    equivalent: "الصافي المعادل",
    breakdownTitle: "توزيع الفئات النقدية",
    breakdownSubNew: "حسب فئات الإصدار الجديد",
    breakdownSubOld: "حسب فئات الإصدار القديم",
    changeNote: "ملاحظة الفراطة",
    sendAnother: "أرسل مبلغاً آخر للحساب.",
    invalid: "أرسل رقم صحيح فقط 🙏",
    oldUnit: "ل.س قديمة",
    newUnit: "ليرة جديدة",
    oldToNew: "من قديم لجديد",
    newToOld: "من جديد لقديم",
    openMiniApp: "📱 فتح التطبيق المصغر",
    refreshRates: "🔄 تحديث الأسعار",
    fxTitle: "أسعار العملات (وسطي)",
    dateLabel: "تاريخ",
    timeLabel: "الساعة",
    noRates: "لا توجد أسعار متاحة حالياً.",
    settingsUpdated: "تم تحديث الإعدادات ✅",
    langAR: "✅ العربية",
    langEN: "EN",
    modeOldToNewChecked: "✅ من قديم لجديد",
    modeNewToOldChecked: "✅ من جديد لقديم",
    modeOldToNew: "من قديم لجديد",
    modeNewToOld: "من جديد لقديم",
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    sendAmount: "Send an amount to calculate:",
    inputAmount: "Input amount",
    equivalent: "Equivalent",
    breakdownTitle: "Banknote distribution",
    breakdownSubNew: "Using NEW issuance denominations",
    breakdownSubOld: "Using OLD issuance denominations",
    changeNote: "Small change",
    sendAnother: "Send another amount to recalculate.",
    invalid: "Please send a valid number 🙏",
    oldUnit: "Old SYP",
    newUnit: "New Lira",
    oldToNew: "Old → New",
    newToOld: "New → Old",
    openMiniApp: "📱 Open mini app",
    refreshRates: "🔄 Refresh rates",
    fxTitle: "FX Rates (mid)",
    dateLabel: "Date",
    timeLabel: "Time",
    noRates: "No rates available right now.",
    settingsUpdated: "Settings updated ✅",
    langAR: "AR",
    langEN: "✅ EN",
    modeOldToNewChecked: "✅ Old → New",
    modeNewToOldChecked: "✅ New → Old",
    modeOldToNew: "Old → New",
    modeNewToOld: "New → Old",
  },
};

// --- State ---
/**
 * userStates:
 *  lang: 'ar'|'en'
 *  mode: 'oldToNew'|'newToOld'
 *  lastAmount: number|null  (amount user typed)
 *  lastResult: object|null  (computed)
 */
const userStates = new Map();

function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, { lang: "ar", mode: "oldToNew", lastAmount: null, lastResult: null });
  }
  return userStates.get(id);
}

// --- Keyboard ---
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
      Markup.button.callback(
        isOldToNew ? t.modeOldToNewChecked : t.modeOldToNew,
        "setMode:oldToNew"
      ),
      Markup.button.callback(
        !isOldToNew ? t.modeNewToOldChecked : t.modeNewToOld,
        "setMode:newToOld"
      ),
    ],
    [
      Markup.button.callback(t.refreshRates, "refreshRates"),
      Markup.button.webApp(t.openMiniApp, APP_URL),
    ],
  ]);
}

// --- Utils: Arabic numbers -> English + parse ---
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
  if (!Number.isFinite(n)) return null;
  return n;
}

function nf(lang) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 });
}

// --- Conversion calc ---
function calc(mode, amount) {
  const isOldToNew = mode === "oldToNew";
  const resVal = isOldToNew ? amount / RATE : amount * RATE;

  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  let remaining = resVal;
  let dist = [];
  if (remaining > 0) {
    for (const d of activeDenoms) {
      const count = Math.floor(remaining / d.v);
      if (count > 0) {
        dist.push({ ...d, count });
        remaining = Math.round((remaining - count * d.v) * 100) / 100;
      }
    }
  }

  return { resVal, remaining, dist, isOldToNew };
}

// --- Rates (cached) ---
let RATES_CACHE = {
  data: null,
  fetchedAt: 0,
};
const RATES_TTL_MS = 60 * 1000; // 1 minute cache

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDMY_HM(isoOrNull) {
  // expect something like "2026-01-06T10:15:23.749373+00:00"
  if (!isoOrNull) return { date: null, time: null };
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return { date: null, time: null };

  const day = pad2(d.getUTCDate());
  const mon = pad2(d.getUTCMonth() + 1);
  const year = d.getUTCFullYear();
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());

  return { date: `${day}:${mon}:${year}`, time: `${hh}:${mm}` };
}

async function fetchRates(force = false) {
  const now = Date.now();
  if (!force && RATES_CACHE.data && now - RATES_CACHE.fetchedAt < RATES_TTL_MS) {
    return RATES_CACHE.data;
  }

  try {
    const r = await fetch(DEFAULT_RATES_URL, { cache: "no-store" });
    if (!r.ok) throw new Error(`Rates fetch failed: ${r.status}`);
    const json = await r.json();

    RATES_CACHE = { data: json, fetchedAt: now };
    return json;
  } catch (e) {
    // keep old cache if exists
    return RATES_CACHE.data;
  }
}

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

function formatRatesBlock(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const generatedAt = ratesJson?.generated_at_utc || null;
  const { date, time } = formatDMY_HM(generatedAt);

  const lines = [];
  lines.push(`*${t.fxTitle}*`);
  if (date) lines.push(`${t.dateLabel}: *${date}*`);
  if (time) lines.push(`${t.timeLabel}: *${time}*`);
  lines.push("");

  const rates = ratesJson?.rates || {};
  let printed = 0;

  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (mid === null || mid === undefined || !Number.isFinite(Number(mid))) continue;

    const flag = FLAG_BY_CODE[code] || "🏳️";
    lines.push(`${flag}  *${code}*  ${nfEN.format(Number(mid))}`);
    printed++;
    lines.push(""); // blank line between each currency (as requested)
  }

  if (printed === 0) {
    lines.push(t.noRates);
  }

  return lines.join("\n").trim();
}

// --- Message builders ---
function buildStartMessage(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  const lines = [];
  lines.push(`*${t.title}*`);
  lines.push(`${t.subtitle}`);
  lines.push("");
  lines.push(t.sendAmount);
  lines.push("");
  lines.push(formatRatesBlock(lang, ratesJson));
  return lines.join("\n");
}

function buildResultMessage(lang, mode, amount, resultObj, ratesJson) {
  const t = TRANSLATIONS[lang];
  const nfmt = nf(lang);
  const isOldToNew = mode === "oldToNew";

  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  const lines = [];
  lines.push(`*${t.title}*`);
  lines.push(`${t.subtitle}`);
  lines.push("");
  lines.push(`• ${t.inputAmount}: *${nfmt.format(amount)}* ${inUnit}`);
  lines.push(`• ${t.equivalent}: *${nfmt.format(resultObj.resVal)}* ${outUnit}`);
  lines.push("");
  lines.push(`*${t.breakdownTitle}*`);
  lines.push(isOldToNew ? t.breakdownSubNew : t.breakdownSubOld);
  lines.push("");

  if (!resultObj.dist?.length) {
    lines.push("—");
  } else {
    for (const p of resultObj.dist) {
      // ✅ رجّع الشعارات/الإيموجي مثل قبل
      const icon = p.s || "💵";
      // شكل السطر قريب من طلبك
      lines.push(`${icon}  *${p.v}* - ${p.n[lang]} × *${p.count}*`);
    }
  }

  lines.push("");
  lines.push(".");

  if (resultObj.remaining > 0) {
    // Small change text
    // For oldToNew: remaining is in NEW; payAs is old
    // For newToOld: remaining is in OLD; payAs is new (remaining / RATE)
    lines.push("");
    lines.push(`*${t.changeNote}*`);

    if (isOldToNew) {
      const payAsOld = Math.round(resultObj.remaining * RATE);
      lines.push(
        lang === "ar"
          ? `بقي *${nfmt.format(resultObj.remaining)}* ${t.newUnit}، تدفعها بالقديم (*${nfmt.format(payAsOld)}* ${t.oldUnit}).`
          : `Remaining *${nfmt.format(resultObj.remaining)}* ${t.newUnit}, pay in OLD (*${nfmt.format(payAsOld)}* ${t.oldUnit}).`
      );
    } else {
      const payAsNew = (resultObj.remaining / RATE).toFixed(2);
      lines.push(
        lang === "ar"
          ? `بقي *${nfmt.format(resultObj.remaining)}* ${t.oldUnit}، تدفعها بالجديد (*${payAsNew}* ${t.newUnit}).`
          : `Remaining *${nfmt.format(resultObj.remaining)}* ${t.oldUnit}, pay in NEW (*${payAsNew}* ${t.newUnit}).`
      );
    }
  }

  lines.push("");
  lines.push(formatRatesBlock(lang, ratesJson));
  lines.push("");
  lines.push(t.sendAnother);

  return lines.join("\n");
}

// --- Bot handlers ---
bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  const rates = await fetchRates(false);
  // start always shows rates + prompt
  return ctx.replyWithMarkdown(buildStartMessage(s.lang, rates), getKeyboard(ctx.from.id));
});

// ✅ Language change:
// - if user already has last calculation, update SAME message to the chosen language
// - else only update keyboard (no fake calculation)
bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1] === "en" ? "en" : "ar";

  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);

  // If we have last calculation -> edit current message text to new language
  if (s.lastAmount !== null && s.lastResult) {
    const rates = await fetchRates(false);
    const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
    return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
  }

  // Otherwise: ONLY update markup
  return ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
});

// ✅ Mode change:
// ONLY update keyboard, do not reset message text
bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = ctx.match[1] === "newToOld" ? "newToOld" : "oldToNew";

  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  return ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
});

// ✅ Refresh rates button
bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.answerCbQuery();

  const rates = await fetchRates(true);

  // If we have last calc -> update same result message with fresh rates
  if (s.lastAmount !== null && s.lastResult) {
    const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
    return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
  }

  // else: update start message with fresh rates
  return ctx.editMessageText(buildStartMessage(s.lang, rates), {
    parse_mode: "Markdown",
    ...getKeyboard(ctx.from.id),
  });
});

// On text: compute, store lastAmount/lastResult and reply with rates included
bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const amount = parseAmount(ctx.message.text);

  if (amount === null) {
    return ctx.reply(TRANSLATIONS[s.lang].invalid);
  }

  const resultObj = calc(s.mode, amount);

  // store last
  s.lastAmount = amount;
  s.lastResult = resultObj;

  const rates = await fetchRates(false);
  const msg = buildResultMessage(s.lang, s.mode, amount, resultObj, rates);

  return ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

// --- Serverless handler (Vercel) ---
export default async function handler(req, res) {
  // Optional secret check (recommended)
  if (TELEGRAM_SECRET) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== TELEGRAM_SECRET) return res.status(401).send("unauthorized");
  }

  if (req.method === "POST") {
    try {
      const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await bot.handleUpdate(update);
      return res.status(200).send("OK");
    } catch (e) {
      // Always 200 so Telegram doesn't keep retrying aggressively
      console.error("handler error", e);
      return res.status(200).send("OK");
    }
  }

  // Simple GET health check
  return res.status(200).send("ok");
         }
