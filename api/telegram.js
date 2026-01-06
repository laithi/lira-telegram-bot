import { Telegraf, Markup } from "telegraf";
import fs from "fs";
import path from "path";

const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL || `https://${process.env.VERCEL_URL}`;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// --- البيانات ---
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat" }, s: "🌾" },
  { v: 200, n: { ar: "الزيتون", en: "Olive" }, s: "🫒" },
  { v: 100, n: { ar: "القطن", en: "Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "الياسمين", en: "Jasmine" }, s: "🌼" }
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "خمسة آلاف", en: "5000" }, s: "💵" },
  { v: 2000, n: { ar: "ألفين", en: "2000" }, s: "💵" },
  { v: 1000, n: { ar: "ألف", en: "1000" }, s: "💵" },
  { v: 500, n: { ar: "خمسمئة", en: "500" }, s: "💵" }
];

// --- ترجمات البوت الأساسية ---
const UI = {
  ar: {
    title: "دليل الليرة السورية",
    hint: "اختر الإعدادات أو أرسل مبلغاً:",
    modeNewToOld: "من جديد لقديم",
    modeOldToNew: "من قديم لجديد",
    openMini: "📱 فتح التطبيق المصغر",
    refresh: "🔄 تحديث الأسعار",
    fxTitle: "أسعار العملات (وسطي)",
    fxDate: "تاريخ",
    fxTime: "الساعة",
    sendAnother: "أرسل مبلغاً آخر للحساب."
  },
  en: {
    title: "Lira Guide",
    hint: "Choose settings or send an amount:",
    modeNewToOld: "New → Old",
    modeOldToNew: "Old → New",
    openMini: "📱 Open mini app",
    refresh: "🔄 Refresh rates",
    fxTitle: "FX Rates (mid)",
    fxDate: "Date",
    fxTime: "Time",
    sendAnother: "Send another amount to recalculate."
  }
};

// --- حالة المستخدم ---
const userStates = new Map();
function getUS(id) {
  if (!userStates.has(id)) userStates.set(id, { lang: "ar", mode: "oldToNew" });
  return userStates.get(id);
}

// --- أرقام عربية -> إنجليزية ---
function normalizeNumber(str) {
  return String(str)
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] ?? d)
    .replace(/,/g, "")
    .trim();
}

// --- تحميل rates.json (من الريبو) ---
function loadRatesJson() {
  // على Vercel: ملفات الريبو موجودة ضمن الـ function bundle
  // فـ بنقرأها مباشرة من جذر المشروع
  const filePath = path.join(process.cwd(), "rates.json");
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// --- تنسيق التاريخ والوقت كما طلبت: d:m:y و h:m ---
function fmtDateDMY(isoOrNull) {
  // rates.json عندك فيه generated_at_utc: "2026-01-06T10:15:23..."
  if (!isoOrNull) return null;
  const d = new Date(isoOrNull);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear());
  return `${dd}:${mm}:${yy}`;
}
function fmtTimeHM(isoOrNull) {
  if (!isoOrNull) return null;
  const d = new Date(isoOrNull);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

// --- تنسيق العملات بالشكل المطلوب: العلم ثم الكود ثم القيمة (الأرقام بالإنكليزي) ---
const FX_ORDER = ["USD", "AED", "SAR", "EUR", "KWD", "SEK", "GBP", "JOD"];
const FX_FLAGS = {
  USD: "🇺🇸",
  AED: "🇦🇪",
  SAR: "🇸🇦",
  EUR: "🇪🇺",
  KWD: "🇰🇼",
  SEK: "🇸🇪",
  GBP: "🇬🇧",
  JOD: "🇯🇴"
};

function fmtFxBlock(lang) {
  const t = UI[lang];
  const data = loadRatesJson();
  if (!data?.rates) {
    return lang === "ar"
      ? "\n\n*أسعار العملات*\n(لا يوجد ملف rates.json بعد)\n"
      : "\n\n*FX Rates*\n(rates.json not found yet)\n";
  }

  const dateStr = fmtDateDMY(data.generated_at_utc);
  const timeStr = fmtTimeHM(data.generated_at_utc);

  let out = `\n\n*${t.fxTitle}*\n`;
  if (dateStr) out += `${t.fxDate}: ${dateStr}\n`;
  if (timeStr) out += `${t.fxTime}: ${timeStr}\n\n`;

  for (const code of FX_ORDER) {
    const flag = FX_FLAGS[code] || "🏳️";
    const mid = data.rates?.[code]?.mid;
    if (mid == null) continue; // إذا ناقص لا نعرضه
    // الأرقام بالإنكليزي دائماً
    const val = Number(mid).toFixed(2);
    out += `${flag} ${code}  ${val}\n\n`;
  }

  return out.trimEnd();
}

// --- لوحة المفاتيح ---
function getKeyboard(id) {
  const s = getUS(id);
  const t = UI[s.lang];
  const isAr = s.lang === "ar";
  const isOldToNew = s.mode === "oldToNew";

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(isAr ? "✅ العربية" : "AR", "setLang:ar"),
      Markup.button.callback(!isAr ? "✅ EN" : "EN", "setLang:en"),
      Markup.button.callback(t.refresh, "refreshRates")
    ],
    [
      Markup.button.callback(isOldToNew ? `✅ ${t.modeOldToNew}` : t.modeOldToNew, "setMode:oldToNew"),
      Markup.button.callback(!isOldToNew ? `✅ ${t.modeNewToOld}` : t.modeNewToOld, "setMode:newToOld")
    ],
    [Markup.button.webApp(t.openMini, APP_URL)]
  ]);
}

// --- بناء رسالة الـ start (تطلع فيها العملات فوراً) ---
function buildStartMessage(lang) {
  const t = UI[lang];
  let msg = `*${t.title}*\n\n${t.hint}`;
  msg += fmtFxBlock(lang);
  return msg;
}

// --- بناء رسالة التحويل + العملات ضمن نفس الرسالة ---
function buildConversionMessage(lang, mode, amount, resVal, distText, remaining) {
  const t = UI[lang];
  const isOldToNew = mode === "oldToNew";

  const inUnit = isOldToNew ? (lang === "ar" ? "ل.س قديمة" : "Old SYP") : (lang === "ar" ? "ليرة جديدة" : "New Lira");
  const outUnit = isOldToNew ? (lang === "ar" ? "ليرة جديدة" : "New Lira") : (lang === "ar" ? "ل.س قديمة" : "Old SYP");

  let msg = `*${lang === "ar" ? "دليل الليرة" : "Lira Guide"}*\n\n`;
  msg += `${lang === "ar" ? "دليل العملة السورية الجديدة" : "Syrian New Currency Guide"}\n\n`;
  msg += `• ${lang === "ar" ? "المبلغ المدخل" : "Input amount"}: *${amount.toLocaleString("en-US")}* ${inUnit}\n`;
  msg += `• ${lang === "ar" ? "الصافي المعادل" : "Equivalent"}: *${resVal.toLocaleString("en-US")}* ${outUnit}\n\n`;
  msg += `*${lang === "ar" ? "توزيع الفئات النقدية" : "Banknote distribution"}*\n`;
  msg += `${lang === "ar" ? "حسب فئات الإصدار" : "Using"} ${isOldToNew ? (lang === "ar" ? "الجديد" : "NEW issuance") : (lang === "ar" ? "القديم" : "OLD denominations")}\n\n`;
  msg += `${distText || "—"}\n`;

  if (remaining > 0) {
    const payAs = isOldToNew ? Math.round(remaining * RATE) : (remaining / RATE).toFixed(2);
    const payUnit = isOldToNew ? (lang === "ar" ? "ل.س" : "SYP") : (lang === "ar" ? "ليرة جديدة" : "New Lira");
    const remUnit = isOldToNew ? (lang === "ar" ? "ليرة جديدة" : "New Lira") : (lang === "ar" ? "ل.س قديمة" : "Old SYP");
    msg += `\n*${lang === "ar" ? "ملاحظة الفراطة" : "Small change"}*\n`;
    msg += `${lang === "ar" ? "بقي" : "Remaining"} *${Number(remaining).toFixed(2)}* ${remUnit}، `;
    msg += `${lang === "ar" ? "تدفعها بال" : "pay in "} ${isOldToNew ? (lang === "ar" ? "قديم" : "OLD") : (lang === "ar" ? "جديد" : "NEW")} `;
    msg += `(*${payAs.toLocaleString("en-US")}* ${payUnit}).\n`;
  }

  msg += `\n${t.sendAnother}`;
  msg += fmtFxBlock(lang);

  return msg;
}

// --- Handlers ---
bot.start(async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.replyWithMarkdown(buildStartMessage(s.lang), getKeyboard(ctx.from.id));
});

bot.action(/setLang:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  const newLang = ctx.match[1] === "en" ? "en" : "ar";
  s.lang = newLang;

  // مهم: ما نعمل نتيجة تحويل وهمية
  // بس نحدّث نفس الرسالة (start) بقائمة العملات
  await ctx.editMessageText(buildStartMessage(s.lang), { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
});

bot.action(/setMode:(.*)/, async (ctx) => {
  const s = getUS(ctx.from.id);
  s.mode = ctx.match[1] === "newToOld" ? "newToOld" : "oldToNew";

  // نفس الفكرة: نحدّث الرسالة الأساسية فقط، بدون حساب
  await ctx.editMessageText(buildStartMessage(s.lang), { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
});

bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  // يحدث نفس الرسالة (قائمة العملات) فوراً
  await ctx.editMessageText(buildStartMessage(s.lang), { parse_mode: "Markdown", ...getKeyboard(ctx.from.id) });
});

// --- التحويل ---
bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);

  const text = normalizeNumber(ctx.message.text);
  const amount = parseFloat(text);
  if (isNaN(amount)) return;

  const isOldToNew = s.mode === "oldToNew";
  const resVal = isOldToNew ? amount / RATE : amount * RATE;
  const activeDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  let remaining = resVal;
  let distText = "";

  activeDenoms.forEach((d) => {
    const count = Math.floor(remaining / d.v);
    if (count > 0) {
      // رجعنا الشعارات/الإيموجي
      distText += `${d.s}  ${d.v} - ${d.n[s.lang]} × ${count}\n`;
      remaining = Math.round((remaining - count * d.v) * 100) / 100;
    }
  });

  const msg = buildConversionMessage(s.lang, s.mode, amount, resVal, distText, remaining);
  await ctx.replyWithMarkdown(msg, getKeyboard(ctx.from.id));
});

// --- Webhook handler (Vercel) ---
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await bot.handleUpdate(update);
      return res.status(200).send("OK");
    } catch (e) {
      // لا ترجع 500 لتجنب "Wrong response from webhook"
      return res.status(200).send("OK");
    }
  }

  return res.status(200).send("OK");
}
