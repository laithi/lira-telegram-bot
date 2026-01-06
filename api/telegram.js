import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET; // optional (not used here)
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// ✅ GitHub RAW rates.json (manual feed compiled by Actions)
const RATES_URL =
  "https://raw.githubusercontent.com/laithi/lira-telegram-bot/main/rates.json";

// --- UI translations ---
const UI = {
  ar: {
    introTitle: "دليل الليرة السورية",
    introBody: "اختر الإعدادات أو أرسل مبلغاً:",
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    inputLine: "• المبلغ المدخل",
    outputLine: "• الصافي المعادل",
    breakdownTitle: "توزيع الفئات النقدية",
    breakdownSubNew: "حسب فئات الإصدار الجديد",
    breakdownSubOld: "حسب فئات الإصدار القديم",
    changeTitle: "ملاحظة الفراطة",
    changeLineOldToNew:
      "بقي *{remaining}* {remUnit}، تدفعها بالقديم (*{payAs}* {payUnit}).",
    changeLineNewToOld:
      "بقي *{remaining}* {remUnit}، تدفعها بالجديد (*{payAs}* {payUnit}).",
    sendAnother: "أرسل مبلغاً آخر للحساب.",
    invalid: "أرسل رقم صحيح فقط 🙏",
    invalidFx: "تعذر جلب أسعار العملات حالياً.",
    fxTitle: "أسعار العملات (وسطي)",
    fxDate: "تاريخ",
    fxTime: "الساعة",
    refreshed: "تم تحديث الأسعار ✅",
    refreshBtn: "🔄 تحديث الأسعار",
  },
  en: {
    introTitle: "Lira Guide",
    introBody: "Choose settings or send an amount:",
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    inputLine: "• Input amount",
    outputLine: "• Equivalent",
    breakdownTitle: "Banknote distribution",
    breakdownSubNew: "Using NEW issuance denominations",
    breakdownSubOld: "Using OLD issuance denominations",
    changeTitle: "Small change",
    changeLineOldToNew:
      "Remaining *{remaining}* {remUnit}, pay in OLD (*{payAs}* {payUnit}).",
    changeLineNewToOld:
      "Remaining *{remaining}* {remUnit}, pay in NEW (*{payAs}* {payUnit}).",
    sendAnother: "Send another amount to recalculate.",
    invalid: "Please send a valid number 🙏",
    invalidFx: "Could not fetch FX rates right now.",
    fxTitle: "FX Rates (mid)",
    fxDate: "Date",
    fxTime: "Time",
    refreshed: "Rates refreshed ✅",
    refreshBtn: "🔄 Refresh rates",
  },
};

// --- denominations ---
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat" }, s: "🌾" },
  { v: 200, n: { ar: "الزيتون", en: "Olive" }, s: "🫒" },
  { v: 100, n: { ar: "القطن", en: "Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "الياسمين", en: "Jasmine" }, s: "🌼" },
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "خمسة آلاف", en: "5000" }, s: "💵" },
  { v: 2000, n: { ar: "ألفين", en: "2000" }, s: "💵" },
  { v: 1000, n: { ar: "ألف", en: "1000" }, s: "💵" },
  { v: 500, n: { ar: "خمسمئة", en: "500" }, s: "💵" },
];

// --- per-user state ---
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, {
      lang: "ar",
      mode: "oldToNew",
      lastAmount: null,
      hasInput: false,
    });
  }
  return userStates.get(id);
}

// ---------- Helpers: digits + formatting ----------
function convertArabicDigits(str) {
  return String(str)
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d)
    .replace(/,/g, "");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDMYHMFromIso(iso) {
  if (!iso) return { dmy: "—", hm: "—" };
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { dmy: "—", hm: "—" };
  const d = pad2(dt.getUTCDate());
  const m = pad2(dt.getUTCMonth() + 1);
  const y = dt.getUTCFullYear();
  const hh = pad2(dt.getUTCHours());
  const mm = pad2(dt.getUTCMinutes());
  return { dmy: `${d}:${m}:${y}`, hm: `${hh}:${mm}` };
}

// ✅ FX: flags + custom order (as you requested)
const FX_FLAGS = {
  USD: "🇺🇸",
  AED: "🇦🇪",
  SAR: "🇸🇦",
  EUR: "🇪🇺",
  KWD: "🇰🇼",
  SEK: "🇸🇪",
  GBP: "🇬🇧",
  JOD: "🇯🇴",
};

const FX_ORDER = ["USD", "AED", "SAR", "EUR", "KWD", "SEK", "GBP", "JOD"];

// ✅ FX numbers always in English and clean (2 decimals), no commas
function fmtFxNumber(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(n);
}

// ---------- FX fetch (with cache) ----------
let fxCache = { at: 0, data: null };
const FX_CACHE_MS = 60 * 1000; // 1 min

async function fetchFxRates({ force = false } = {}) {
  const now = Date.now();
  if (!force && fxCache.data && now - fxCache.at < FX_CACHE_MS) return fxCache.data;

  const res = await fetch(RATES_URL, {
    headers: { "cache-control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Failed to fetch rates.json: ${res.status}`);
  const data = await res.json();

  fxCache = { at: now, data };
  return data;
}

// ✅ FX block style: FLAG then CODE then VALUE (one line each)
function fxBlockText(lang, fxData) {
  const ui = UI[lang] || UI.ar;

  if (!fxData?.rates) {
    return `*${ui.fxTitle}*\n${ui.invalidFx}`;
  }

  const gen = formatDMYHMFromIso(fxData.generated_at_utc);
  const bulletin = fxData.bulletin_date || gen.dmy;

  let out = `*${ui.fxTitle}*\n`;
  out += `${ui.fxDate}: *${bulletin}*\n`;
  out += `${ui.fxTime}: _${gen.hm}_\n\n`;

  for (const cur of FX_ORDER) {
    const item = fxData.rates[cur];
    const mid = item?.mid;
    if (typeof mid !== "number") continue;

    const flag = FX_FLAGS[cur] || "";
    out += `${flag} ${cur}  ${fmtFxNumber(mid)}\n\n`;
  }

  return out.trimEnd();
}

// --- keyboard ---
function getKeyboard(id) {
  const s = getUS(id);
  const isAr = s.lang === "ar";
  const isOldToNew = s.mode === "oldToNew";
  const ui = UI[s.lang] || UI.ar;

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(isAr ? "✅ العربية" : "AR", "setLang:ar"),
      Markup.button.callback(!isAr ? "✅ EN" : "EN", "setLang:en"),
      Markup.button.callback(ui.refreshBtn, "fx:refresh"),
    ],
    [
      Markup.button.callback(
        isOldToNew
          ? isAr
            ? "✅ من قديم لجديد"
            : "✅ Old → New"
          : isAr
          ? "من قديم لجديد"
          : "Old → New",
        "setMode:oldToNew"
      ),
      Markup.button.callback(
        !isOldToNew
          ? isAr
            ? "✅ من جديد لقديم"
            : "✅ New → Old"
          : isAr
          ? "من جديد لقديم"
          : "New → Old",
        "setMode:newToOld"
      ),
    ],
    [
      Markup.button.webApp(
        isAr ? "📱 فتح التطبيق المصغر" : "📱 Open Mini App",
        APP_URL
      ),
    ],
  ]);
}

// ---------- Main message builder ----------
function buildConversionMessage({
  lang,
  mode,
  amountInput,
  resVal,
  distText,
  remaining,
  fxText,
}) {
  const ui = UI[lang] || UI.ar;
  const isOldToNew = mode === "oldToNew";

  const inUnit = isOldToNew ? (lang === "ar" ? "ل.س قديمة" : "Old SYP") : (lang === "ar" ? "ليرة جديدة" : "New Lira");
  const outUnit = isOldToNew ? (lang === "ar" ? "ليرة جديدة" : "New Lira") : (lang === "ar" ? "ل.س قديمة" : "Old SYP");

  let msg = `*${ui.title}*\n\n`;
  msg += `${ui.subtitle}\n\n`;
  msg += `${ui.inputLine}: *${amountInput.toLocaleString(lang === "ar" ? "ar-SY" : "en-US")}* ${inUnit}\n`;
  msg += `${ui.outputLine}: *${resVal.toLocaleString(lang === "ar" ? "ar-SY" : "en-US")}* ${outUnit}\n\n`;

  msg += `*${ui.breakdownTitle}*\n`;
  msg += `${isOldToNew ? ui.breakdownSubNew : ui.breakdownSubOld}\n\n`;
  msg += `${distText || "—"}\n\n`;

  if (remaining > 0) {
    const remUnit = isOldToNew ? (lang === "ar" ? "ليرة جديدة" : "New Lira") : (lang === "ar" ? "ل.س قديمة" : "Old SYP");
    const payAs = isOldToNew ? Math.round(remaining * RATE) : (remaining / RATE).toFixed(2);
    const payUnit = isOldToNew ? (lang === "ar" ? "ل.س" : "SYP") : (lang === "ar" ? "ليرة جديدة" : "New Lira");

    msg += `*${ui.changeTitle}*\n`;
    msg += (isOldToNew ? ui.changeLineOldToNew : ui.changeLineNewToOld)
      .replace("{remaining}", remaining.toLocaleString(lang === "ar" ? "ar-SY" : "en-US"))
      .replace("{remUnit}", remUnit)
      .replace("{payAs}", String(payAs))
      .replace("{payUnit}", payUnit);
    msg += `\n\n`;
  }

  if (fxText) {
    msg += `${fxText}\n\n`;
  }

  msg += ui.sendAnother;
  return msg;
}

// ---------- Bot handlers ----------
bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  const ui = UI[s.lang] || UI.ar;
  await ctx.reply(`${ui.introTitle}\n${ui.introBody}`, getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const newLang = ctx.match[1] === "en" ? "en" : "ar";
  s.lang = newLang;

  // ✅ IMPORTANT: Do NOT auto-calc on language toggle if no input yet
  await ctx.answerCbQuery();

  // update only the buttons
  try {
    await ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
  } catch (_) {}

  // if user already provided input before, resend last computed message in new language
  if (s.hasInput && typeof s.lastAmount === "number") {
    const amount = s.lastAmount;
    const isOldToNew = s.mode === "oldToNew";
    const resVal = isOldToNew ? amount / RATE : amount * RATE;
    const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

    let remaining = resVal;
    let distText = "";
    for (const d of activeDenoms) {
      const count = Math.floor(remaining / d.v);
      if (count > 0) {
        distText += `${d.s}  ${d.v} - ${d.n[s.lang]} × ${count}\n`;
        remaining = Math.round((remaining - count * d.v) * 100) / 100;
      }
    }

    let fxText = "";
    try {
      const fxData = await fetchFxRates({ force: false });
      fxText = fxBlockText(s.lang, fxData);
    } catch (_) {
      fxText = `*${(UI[s.lang] || UI.ar).fxTitle}*\n${(UI[s.lang] || UI.ar).invalidFx}`;
    }

    const msg = buildConversionMessage({
      lang: s.lang,
      mode: s.mode,
      amountInput: amount,
      resVal,
      distText: distText.trim(),
      remaining,
      fxText,
    });

    await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
  }
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const newMode = ctx.match[1] === "newToOld" ? "newToOld" : "oldToNew";
  s.mode = newMode;

  await ctx.answerCbQuery();

  // update buttons
  try {
    await ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
  } catch (_) {}

  // ✅ IMPORTANT: Do NOT auto-calc on mode toggle if no input yet
  if (!s.hasInput || typeof s.lastAmount !== "number") return;

  // if user already has input, resend computed message with new mode
  const amount = s.lastAmount;
  const isOldToNew = s.mode === "oldToNew";
  const resVal = isOldToNew ? amount / RATE : amount * RATE;
  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  let remaining = resVal;
  let distText = "";
  for (const d of activeDenoms) {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      distText += `${d.s}  ${d.v} - ${d.n[s.lang]} × ${count}\n`;
      remaining = Math.round((remaining - count * d.v) * 100) / 100;
    }
  }

  let fxText = "";
  try {
    const fxData = await fetchFxRates({ force: false });
    fxText = fxBlockText(s.lang, fxData);
  } catch (_) {
    fxText = `*${(UI[s.lang] || UI.ar).fxTitle}*\n${(UI[s.lang] || UI.ar).invalidFx}`;
  }

  const msg = buildConversionMessage({
    lang: s.lang,
    mode: s.mode,
    amountInput: amount,
    resVal,
    distText: distText.trim(),
    remaining,
    fxText,
  });

  await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

bot.action("fx:refresh", async (ctx) => {
  const s = getUS(ctx.from.id);
  const ui = UI[s.lang] || UI.ar;

  try {
    await fetchFxRates({ force: true });
    await ctx.answerCbQuery(ui.refreshed);
  } catch (e) {
    await ctx.answerCbQuery(ui.invalidFx);
  }

  // Only update keyboard (no auto message)
  try {
    await ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
  } catch (_) {}
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const ui = UI[s.lang] || UI.ar;

  const raw = convertArabicDigits(ctx.message.text);
  const amount = parseFloat(raw);
  if (Number.isNaN(amount)) return ctx.reply(ui.invalid, getKeyboard(ctx.from.id));

  s.lastAmount = amount;
  s.hasInput = true;

  const isOldToNew = s.mode === "oldToNew";
  const resVal = isOldToNew ? amount / RATE : amount * RATE;
  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  let remaining = resVal;
  let distText = "";
  for (const d of activeDenoms) {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      // ✅ icons are back (d.s)
      distText += `${d.s}  ${d.v} - ${d.n[s.lang]} × ${count}\n`;
      remaining = Math.round((remaining - count * d.v) * 100) / 100;
    }
  }

  let fxText = "";
  try {
    const fxData = await fetchFxRates({ force: false });
    fxText = fxBlockText(s.lang, fxData);
  } catch (e) {
    fxText = `*${ui.fxTitle}*\n${ui.invalidFx}`;
  }

  const msg = buildConversionMessage({
    lang: s.lang,
    mode: s.mode,
    amountInput: amount,
    resVal,
    distText: distText.trim(),
    remaining,
    fxText,
  });

  await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

// ---------- Webhook handler (Vercel) ----------
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("OK");
  }

  if (req.method === "POST") {
    try {
      const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await bot.handleUpdate(update);
      return res.status(200).send("OK");
    } catch (e) {
      // Important for Telegram webhook: always return 200 quickly
      return res.status(200).send("OK");
    }
  }

  return res.status(405).send("Method Not Allowed");
             }
