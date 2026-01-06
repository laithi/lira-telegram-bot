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
  { v: 500, n: { ar: "سنابل", en: "Wheat" }, s: "🌾" },
  { v: 200, n: { ar: "زيتون", en: "Olive" }, s: "🫒" },
  { v: 100, n: { ar: "قطن", en: "Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "حمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "عنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "ياسمين", en: "Jasmine" }, s: "🌼" },
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "خمسة آلاف", en: "5000" }, s: "💵" },
  { v: 2000, n: { ar: "ألفين", en: "2000" }, s: "💵" },
  { v: 1000, n: { ar: "ألف", en: "1000" }, s: "💵" },
  { v: 500, n: { ar: "خمسمئة", en: "500" }, s: "💵" },
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    sendAmount: "اختر الإعدادات أو أرسل مبلغاً:",
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
    fxBtn: "💱 تحويل للعملات",
    fxCalcTitle: "تحويل للعملات الأجنبية",
    fxCalcHint: "سيتم استخدام آخر مبلغ أدخلته.",
    fxInputLabel: "المدخل",
    fxEqLabel: "المعادل",
    fxNoLast: "مافي مبلغ سابق. ابعت رقم أولاً 🙏",
    fxNoRatesNow: "لا يمكن حساب التحويل الآن (أسعار غير متاحة).",
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    sendAmount: "Choose settings or send an amount:",
    inputAmount: "Input amount",
    equivalent: "Equivalent",
    breakdownTitle: "Banknote distribution",
    breakdownSubNew: "Using NEW issuance denominations",
    breakdownSubOld: "Using OLD denominations",
    changeNote: "Small change",
    sendAnother: "Send another amount to recalculate.",
    invalid: "Please send a valid number 🙏",
    oldUnit: "Old SYP",
    newUnit: "New Lira",
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
    fxBtn: "💱 Convert to FX",
    fxCalcTitle: "Converted to FX",
    fxCalcHint: "Using your last entered amount.",
    fxInputLabel: "Input",
    fxEqLabel: "Equivalent",
    fxNoLast: "No previous amount. Send a number first 🙏",
    fxNoRatesNow: "Cannot calculate now (rates not available).",
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
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function nf(lang, val) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 }).format(val);
}

// --- Conversion calc ---
function calc(mode, amount) {
  const isOldToNew = mode === "oldToNew";
  
  // تصحيح: استخدام toFixed لتفادي مشاكل الفاصلة العائمة في جافاسكريبت
  let resVal;
  if (isOldToNew) {
    resVal = amount / RATE;
  } else {
    resVal = amount * RATE;
  }
  // تقريب لأقرب منزلتين عشريتين لضمان دقة الحسابات
  resVal = Math.round(resVal * 100) / 100;

  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  let remaining = resVal;
  let dist = [];

  if (remaining > 0) {
    for (const d of activeDenoms) {
      const count = Math.floor(remaining / d.v);
      if (count > 0) {
        dist.push({ ...d, count });
        // طرح دقيق
        remaining = Math.round((remaining - count * d.v) * 100) / 100;
      }
    }
  }

  return { resVal, remaining, dist, isOldToNew };
}

// --- Rates cache ---
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

// --- FX formatting ---
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
  if (date) lines.push(`${t.dateLabel}: *${date}*`);
  if (time) lines.push(`${t.timeLabel}: *${time}*`);
  lines.push("");

  const rates = ratesJson?.rates || {};
  let printed = 0;

  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (mid == null || !Number.isFinite(Number(mid))) continue;

    const flag = FLAG_BY_CODE[code] || "🏳️";
    lines.push(`${flag}  *${code}* ${nfEN.format(Number(mid))}`);
    printed++;
    lines.push("");
  }

  if (printed === 0) lines.push(t.noRates);

  return lines.join("\n").trim();
}

function buildFxMessageFromLast(lang, mode, lastAmount, lastResult, ratesJson) {
  const t = TRANSLATIONS[lang];
  const nfmt = nf(lang, lastAmount);
  const nfEN = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isOldToNew = mode === "oldToNew";

  const inUnit = isOldToNew ? t.oldUnit : t.newUnit;
  const outUnit = isOldToNew ? t.newUnit : t.oldUnit;

  // المنطق المصحح بناء على طلبك: الأسعار في JSON هي مقابل "الليرة الجديدة"
  // لذلك يجب توحيد المبلغ المدخل ليصبح "ليرة جديدة" قبل القسمة
  let amountInNewLira;
  if (isOldToNew) {
    // المستخدم أدخل قديم، نحوله لجديد (نقسم على 100)
    amountInNewLira = lastAmount / RATE;
  } else {
    // المستخدم أدخل جديد، نستخدمه كما هو
    amountInNewLira = lastAmount;
  }

  const rates = ratesJson?.rates || {};

  const lines = [];
  lines.push(`*${t.fxCalcTitle}*`);
  lines.push(t.fxCalcHint);
  lines.push("");

  // عرض المبلغ الأصلي والمحول
  lines.push(`• ${t.inputAmount}: *${nfmt}* ${inUnit}`);
  lines.push(`• ${t.equivalent}: *${nf(lang, lastResult.resVal)}* ${outUnit}`);
  lines.push("");

  let printed = 0;

  for (const code of ORDERED_CODES) {
    const mid = rates?.[code]?.mid;
    if (mid == null || !Number.isFinite(Number(mid)) || Number(mid) <= 0) continue;

    const flag = FLAG_BY_CODE[code] || "🏳️";

    // المعادلة: المبلغ بالليرة الجديدة تقسيم السعر (لأن السعر مقابل الجديدة)
    const eqFx = amountInNewLira / Number(mid);

    lines.push(`${flag}  *${code}*`);
    // تم إزالة السطر الزائد للمدخلات لتبسيط الرسالة
    lines.push(`${t.fxEqLabel}: ${nfEN.format(eqFx)}`);
    lines.push("");

    printed++;
  }

  if (printed === 0) {
    lines.push(t.fxNoRatesNow);
  }

  return lines.join("\n").trim();
}

// --- Messages ---
function buildStartMessage(lang, ratesJson) {
  const t = TRANSLATIONS[lang];
  return [
    `*${t.title}*`,
    `${t.subtitle}`,
    "",
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

  lines.push(`*${t.title}*`);
  lines.push(`${t.subtitle}`);
  lines.push("");
  lines.push(`• ${t.inputAmount}: *${nf(lang, amount)}* ${inUnit}`);
  lines.push(`• ${t.equivalent}: *${nf(lang, resultObj.resVal)}* ${outUnit}`);
  lines.push("");

  // Breakdown - تعديل الترتيب والتنسيق
  lines.push(`*${t.breakdownTitle}*`);
  lines.push(isOldToNew ? t.breakdownSubNew : t.breakdownSubOld);
  lines.push("");

  if (!resultObj.dist?.length) {
    lines.push("—");
  } else {
    for (const p of resultObj.dist) {
      // الترتيب المطلوب: الرمز ثم القيمة ثم العدد
      // مثال: 🌾 500 × 3
      lines.push(`${p.s}   *${p.v}* ×   ${p.count}`);
    }
  }

  // Change note
  if (resultObj.remaining > 0) {
    lines.push("");
    lines.push(`*${t.changeNote}*`);

    if (isOldToNew) {
      const payAsOld = Math.round(resultObj.remaining * RATE);
      lines.push(
        lang === "ar"
          ? `بقي *${nf(lang, resultObj.remaining)}* ${t.newUnit}، تدفعها بالقديم (*${nf(lang, payAsOld)}* ${t.oldUnit}).`
          : `Remaining *${nf(lang, resultObj.remaining)}* ${t.newUnit}, pay in OLD (*${nf(lang, payAsOld)}* ${t.oldUnit}).`
      );
    } else {
      const payAsNew = (resultObj.remaining / RATE).toFixed(2);
      lines.push(
        lang === "ar"
          ? `بقي *${nf(lang, resultObj.remaining)}* ${t.oldUnit}، تدفعها بالجديد (*${payAsNew}* ${t.newUnit}).`
          : `Remaining *${nf(lang, resultObj.remaining)}* ${t.oldUnit}, pay in NEW (*${payAsNew}* ${t.newUnit}).`
      );
    }
  }

  lines.push("");
  lines.push(formatRatesBlock(lang, ratesJson));
  lines.push("");
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

  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);

  if (s.lastAmount !== null && s.lastResult && s.lastMsgId) {
    const rates = await fetchRates(false);
    const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
    try {
      return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
    } catch (e) {
      return ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
    }
  }

  return ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const newMode = ctx.match[1] === "newToOld" ? "newToOld" : "oldToNew";
  
  // تحديث فوري إذا تغير الوضع
  if (s.mode !== newMode) {
      s.mode = newMode;
      if (s.lastAmount !== null) {
          // إعادة الحساب بالوضع الجديد
          const resultObj = calc(s.mode, s.lastAmount);
          s.lastResult = resultObj;
          const rates = await fetchRates(false);
          const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, resultObj, rates);
          try {
             return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
          } catch(e) {}
      }
  }
  
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  return ctx.editMessageReplyMarkup(getKeyboard(ctx.from.id).reply_markup);
});

bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.answerCbQuery();

  const rates = await fetchRates(true);

  if (s.lastAmount !== null && s.lastResult) {
    const msg = buildResultMessage(s.lang, s.mode, s.lastAmount, s.lastResult, rates);
    return ctx.editMessageText(msg, { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
  }

  return ctx.editMessageText(buildStartMessage(s.lang, rates), {
    parse_mode: "Markdown",
    ...getKeyboard(ctx.from.id),
  });
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
  if (amount === null) return ctx.reply(TRANSLATIONS[s.lang].invalid);

  const resultObj = calc(s.mode, amount);

  s.lastAmount = amount;
  s.lastResult = resultObj;

  const rates = await fetchRates(false);
  const msg = buildResultMessage(s.lang, s.mode, amount, resultObj, rates);

  const sent = await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));

  if (sent && sent.message_id) {
    s.lastMsgId = sent.message_id;
  }

  return;
});

// --- Vercel handler ---
export default async function handler(req, res) {
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
      console.error("handler error", e);
      return res.status(200).send("OK");
    }
  }

  return res.status(200).send("ok");
        }
