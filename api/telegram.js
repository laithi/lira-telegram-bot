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

// --- البيانات ---
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل (500)", en: "Wheat (500)" }, s: "🌾" },
  { v: 200, n: { ar: "زيتون (200)", en: "Olive (200)" }, s: "🫒" },
  { v: 100, n: { ar: "قطن (100)", en: "Cotton (100)" }, s: "☁️" },
  { v: 50, n: { ar: "حمضيات (50)", en: "Citrus (50)" }, s: "🍊" },
  { v: 25, n: { ar: "عنب (25)", en: "Grapes (25)" }, s: "🍇" },
  { v: 10, n: { ar: "ياسمين (10)", en: "Jasmine (10)" }, s: "🌼" },
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "خمسة آلاف", en: "5000" }, s: "💶" },
  { v: 2000, n: { ar: "ألفين", en: "2000" }, s: "💶" },
  { v: 1000, n: { ar: "ألف", en: "1000" }, s: "💵" },
  { v: 500, n: { ar: "خمسمئة", en: "500" }, s: "💵" },
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "حاسبة العملة السورية الجديدة",
    sendAmount: "اختر الإعدادات أو أرسل مبلغاً للحساب:",
    inputAmount: "المبلغ الأساسي",
    equivalent: "القيمة المقابلة",
    breakdownTitle: "💵 كيف تدفعها؟ (التوزيع)",
    breakdownSubNew: "استخدم فئات الإصدار الجديد 👇",
    breakdownSubOld: "استخدم فئات الإصدار القديم 👇",
    changeNote: "⚠️ ماذا أفعل بالفراطة؟",
    keepChangeOld: "احتفظ بـ {amount} ل.س قديمة في جيبك (لا تحولها).",
    keepChangeNew: "احتفظ بـ {amount} ليرة جديدة في جيبك.",
    sendAnother: "أرسل رقماً آخر للحساب.",
    invalid: "يرجى إرسال رقم صحيح (مثال: 5000 أو 200) 🙏",
    oldUnit: "ل.س (قديم)",
    newUnit: "ليرة (جديدة)",
    openMiniApp: "📱 فتح التطبيق",
    refreshRates: "🔄 تحديث",
    fxTitle: "أسعار الصرف (وسطي)",
    dateLabel: "التاريخ",
    noRates: "الأسعار غير متاحة حالياً.",
    settingsUpdated: "تم التحديث ✅",
    langAR: "✅ العربية",
    langEN: "EN",
    // تم إضافة أسهم لتوضيح العملية
    modeOldToNewChecked: "✅ قديم ⬅️ جديد",
    modeNewToOldChecked: "✅ جديد ⬅️ قديم",
    modeOldToNew: "قديم ⬅️ جديد",
    modeNewToOld: "جديد ⬅️ قديم",
    fxBtn: "💱 الدولار والعملات",
    fxCalcTitle: "💱 الحساب مقابل العملات",
    fxCalcHint: "بناءً على آخر مبلغ قمت بإرساله:",
    fxInputLabel: "الأصل",
    fxEqLabel: "المقابل",
    fxNoLast: "لم ترسل مبلغاً بعد. أرسل رقماً (مثلاً 5000) أولاً 🙏",
    fxNoRatesNow: "خدمة الصرف غير متاحة حالياً.",
    directionLabel: "اتجاه التحويل:",
    dirOldToNew: "🔴 من القديم إلى الجديد",
    dirNewToOld: "🟢 من الجديد إلى القديم",
  },
  en: {
    title: "Lira Guide",
    subtitle: "New Syrian Currency Calc",
    sendAmount: "Send any amount to calculate:",
    inputAmount: "Input",
    equivalent: "Value",
    breakdownTitle: "💵 Payment Breakdown",
    breakdownSubNew: "Use NEW denominations 👇",
    breakdownSubOld: "Use OLD denominations 👇",
    changeNote: "⚠️ What about small change?",
    keepChangeOld: "Keep {amount} OLD SYP in your pocket.",
    keepChangeNew: "Keep {amount} NEW Lira in your pocket.",
    sendAnother: "Send another number to recalculate.",
    invalid: "Please send a valid number 🙏",
    oldUnit: "SYP (Old)",
    newUnit: "Lira (New)",
    openMiniApp: "📱 Open App",
    refreshRates: "🔄 Refresh",
    fxTitle: "FX Rates (Mid)",
    dateLabel: "Date",
    noRates: "Rates unavailable.",
    settingsUpdated: "Updated ✅",
    langAR: "AR",
    langEN: "✅ EN",
    modeOldToNewChecked: "✅ Old ➡️ New",
    modeNewToOldChecked: "✅ New ➡️ Old",
    modeOldToNew: "Old ➡️ New",
    modeNewToOld: "New ➡️ Old",
    fxBtn: "💱 FX Rates",
    fxCalcTitle: "💱 FX Conversion",
    fxCalcHint: "Based on your last amount:",
    fxInputLabel: "In",
    fxEqLabel: "Eq",
    fxNoLast: "No amount set. Send a number first 🙏",
    fxNoRatesNow: "FX rates unavailable.",
    directionLabel: "Direction:",
    dirOldToNew: "🔴 Old to New",
    dirNewToOld: "🟢 New to Old",
  },
};

// --- State ---
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) {
    userStates.set(id, {
      lang: "ar",
      mode: "oldToNew",
      lastAmount: null,
      lastResult: null,
      lastMsgId: null,
    });
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
      Markup.button.callback(t.fxBtn, "showFx"),
    ],
    [Markup.button.webApp(t.openMiniApp, APP_URL)],
  ]);
}

// --- Utils ---
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
  // منع الأرقام الصفرية أو السالبة لمنطقية الاستخدام
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function nf(lang, val) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", {
    maximumFractionDigits: 2,
  }).format(val);
}

// --- Conversion Logic (Updated) ---
function calc(mode, amount) {
  const isOldToNew = mode === "oldToNew";
  
  // استخدام دقة عالية ثم تقريب لتجنب مشاكل الفاصلة العائمة
  let resVal;
  if (isOldToNew) {
    resVal = amount / RATE; 
  } else {
    resVal = amount * RATE;
  }
  
  // تصحيح فواصل JavaScript (مثلاً 15.300000004 تصبح 15.3)
  resVal = parseFloat(resVal.toFixed(2));

  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  let remaining = resVal;
  let dist = [];

  if (remaining > 0) {
    for (const d of activeDenoms) {
      const count = Math.floor(remaining / d.v);
      if (count > 0) {
        dist.push({ ...d, count });
        // عملية الطرح الآمنة
        remaining = Number((remaining - count * d.v).toFixed(2));
      }
    }
  }

  return { resVal, remaining, dist, isOldToNew };
}

// --- Rates & Fetching ---
let RATES_CACHE = { data: null, fetchedAt: 0 };
const RATES_TTL_MS = 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDMY_HM(isoOrNull) {
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
    return RATES_CACHE.data;
  }
}

// --- Formatting Helpers ---
const FLAG_BY_CODE = {
  USD: "🇺🇸", AED: "🇦🇪", SAR: "🇸🇦", EUR: "🇪🇺",
  KWD: "🇰🇼", SEK: "🇸🇪", GBP: "🇬🇧", JOD: "🇯🇴",
};
const ORDERED_CODES = ["USD", "AED", "SAR", "EUR", "KWD", "SEK", "GBP", "JOD"];

function formatRatesBlock(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const generatedAt = ratesJson?.generated_at_utc || null;
  const { date, time } = formatDMY_HM(generatedAt);

  const lines = [];
  lines.push(`*${t.fxTitle}*`);
  if (date) lines.push(`${t.dateLabel}: ${date} - ${time}`);
  lines.push("");

  const rates = ratesJson?.rates || {};
  let printed = 0;
  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (mid == null || !Number.isFinite(Number(mid))) continue;
    lines.push(`${FLAG_BY_CODE[code] || "🏳️"} ${code}:  \`${nfEN.format(Number(mid))}\``);
    printed++;
  }
  if (printed === 0) lines.push(t.noRates);
  return lines.join("\n").trim();
}

function buildFxMessageFromLast(lang, mode, lastAmount, lastResult, ratesJson) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";
  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  
  // دائماً نحسب بناء على القيمة "الجديدة" للتوحيد
  const amountInNew = isOldToNew ? (lastAmount / RATE) : lastAmount;
  
  const rates = ratesJson?.rates || {};
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lines = [];
  lines.push(`*${t.fxCalcTitle}*`);
  lines.push(`${t.fxInputLabel}: *${nf(lang, lastAmount)}* ${inUnit}`);
  lines.push("ــــــــــــــــــــ");

  let printed = 0;
  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (mid == null || Number(mid) <= 0) continue;

    // المعادلة: المبلغ بالجديد تقسيم سعر الصرف
    const eqFx = amountInNew / Number(mid);
    lines.push(`${FLAG_BY_CODE[code] || "🏳️"} ${code}:  *${nfEN.format(eqFx)}*`);
    printed++;
  }

  if (printed === 0) lines.push(t.fxNoRatesNow);
  return lines.join("\n").trim();
}

// --- Main Message Builder (Improved UX) ---
function buildStartMessage(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  return [
    `*${t.title}*`,
    `${t.subtitle}`,
    "ــــــــــــــــــــ",
    t.sendAmount,
    "",
    formatRatesBlock(lang, ratesJson),
  ].join("\n");
}

function buildResultMessage(lang, mode, amount, resultObj, ratesJson) {
  const t = TRANSLATIONS[lang];
  const isOldToNew = mode === "oldToNew";

  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  const lines = [];

  // 1. العنوان يوضح الاتجاه بوضوح
  lines.push(`*${t.directionLabel}* ${isOldToNew ? t.dirOldToNew : t.dirNewToOld}`);
  lines.push("ــــــــــــــــــــ");

  // 2. النتيجة الرئيسية
  lines.push(`🔢 ${t.inputAmount}: *${nf(lang, amount)}* ${inUnit}`);
  lines.push(`✅ ${t.equivalent}: *${nf(lang, resultObj.resVal)}* ${outUnit}`);
  lines.push("");

  // 3. التوزيع (الفاتورة)
  lines.push(`*${t.breakdownTitle}*`);
  lines.push(`_(${isOldToNew ? t.breakdownSubNew : t.breakdownSubOld})_`);
  
  if (!resultObj.dist?.length) {
     // حالة خاصة: المبلغ صغير جداً وليس له فئات
     lines.push("—");
  } else {
    for (const p of resultObj.dist) {
      lines.push(`${p.s} *${p.count}* × ${p.n[lang]}`);
    }
  }

  // 4. معالجة الفراطة بأسلوب "تعليمات" بدلاً من "رياضيات"
  if (resultObj.remaining > 0) {
    lines.push("");
    lines.push(`*${t.changeNote}*`);
    
    if (isOldToNew) {
      // التحويل من قديم لجديد: الفراطة هي بالليرة الجديدة
      // نعيد تحويلها للقديم لنقول للمستخدم "خليها بجيبك"
      const keepInOld = Math.round(resultObj.remaining * RATE);
      const msg = t.keepChangeOld.replace("{amount}", nf(lang, keepInOld));
      lines.push(`👌 ${msg}`);
    } else {
      // التحويل من جديد لقديم: الفراطة هي بالليرة القديمة
      // غالباً لن تحدث لأن الجديد فئاته صغيرة، لكن للاحتياط
      const msg = t.keepChangeNew.replace("{amount}", nf(lang, resultObj.remaining));
      lines.push(`👌 ${msg}`);
    }
  }

  lines.push("ــــــــــــــــــــ");
  lines.push(t.sendAnother);

  return lines.join("\n");
}

// --- Handlers ---
bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  const rates = await fetchRates(false);
  return ctx.replyWithMarkdown(buildStartMessage(s.lang, rates), getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.lang = ctx.match[1] === "en" ? "en" : "ar";
  
  // تحديث الواجهة وتحديث الرسالة السابقة إذا وجدت
  try {
    await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
    
    // إذا كان هناك حساب سابق، أعد عرضه باللغة الجديدة
    if (s.lastAmount !== null && s.lastResult) {
      const rates = await fetchRates(false);
      const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
      await ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
    } else {
      await ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
    }
  } catch (e) { console.log(e); } // تجاهل أخطاء عدم تغيير المحتوى
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const newMode = ctx.match[1] === "newToOld" ? "newToOld" : "oldToNew";
  
  // هل تغير الوضع فعلاً؟
  if (s.mode !== newMode) {
    s.mode = newMode;
    // إعادة الحساب فوراً إذا كان هناك رقم مدخل سابقاً
    if (s.lastAmount !== null) {
      const resultObj = calc(s.mode, s.lastAmount);
      s.lastResult = resultObj;
      const rates = await fetchRates(false);
      const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, resultObj, rates);
      try {
        await ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
      } catch (e) { /* ignore text not modified */ }
    } else {
        // تحديث الأزرار فقط
        try {
            await ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
        } catch (e) {}
    }
  }
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
});

bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.answerCbQuery();
  const rates = await fetchRates(true);

  if (s.lastAmount !== null && s.lastResult) {
    const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
    try {
        return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
    } catch (e) {}
  }
  
  // إذا لم يكن هناك حساب، نعود لرسالة البداية المحدثة
  try {
      return ctx.editMessageText(buildStartMessage(s.lang, rates), {
        parse_mode: "Markdown",
        ...getKeyboard(ctx.from.id),
      });
  } catch(e) {}
});

bot.action("showFx", async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];
  await ctx.answerCbQuery();

  if (s.lastAmount === null || !s.lastResult) {
    return ctx.reply(t.fxNoLast, getKeyboard(ctx.from.id));
  }

  const rates = await fetchRates(false);
  const msg = buildFxMessageFromLast(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
  return ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const amount = parseAmount(ctx.message.text);
  
  if (amount === null) {
      return ctx.reply(TRANSLATIONS[s.lang].invalid);
  }

  const resultObj = calc(s.mode, amount);
  s.lastAmount = amount;
  s.lastResult = resultObj;

  const rates = await fetchRates(false);
  const msg = buildResultMessage(s.lang, s.mode, amount, resultObj, rates);

  const sent = await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
  if (sent && sent.message_id) s.lastMsgId = sent.message_id;
});

// --- Vercel Handler ---
export default async function handler(req, res) {
  if (TELEGRAM_SECRET) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== TELEGRAM_SECRET) return res.status(401).send("unauthorized");
  }
  if (req.method === "POST") {
    try {
      const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await bot.handleUpdate(update);
    } catch (e) {
      console.error("handler error", e);
    }
  }
  return res.status(200).send("OK");
    }
