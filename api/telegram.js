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

// --- Denominations Data (تم إزالة فئات 5 و 2 و 1 بناءً على طلبك) ---
const DENOMS_NEW = [
  { v: 500, s: "🌾", n: { ar: "سنابل القمح", en: "Wheat" } },
  { v: 200, s: "🫒", n: { ar: "أغصان الزيتون", en: "Olive" } },
  { v: 100, s: "☁️", n: { ar: "القطن", en: "Cotton" } },
  { v: 50,  s: "🍊", n: { ar: "الحمضيات", en: "Citrus" } },
  { v: 25,  s: "🍇", n: { ar: "العنب", en: "Grapes" } },
  { v: 10,  s: "🌼", n: { ar: "الياسمين", en: "Jasmine" } }
];

// الفئات القديمة (كلها برمز المال العام 💵)
const DENOMS_OLD = [
  { v: 5000, s: "💵", n: { ar: "خمسة آلاف", en: "5000" } },
  { v: 2000, s: "💵", n: { ar: "ألفين",     en: "2000" } },
  { v: 1000, s: "💵", n: { ar: "ألف",       en: "1000" } },
  { v: 500,  s: "💵", n: { ar: "خمسمئة",    en: "500" } },
  { v: 200,  s: "💵", n: { ar: "مئتان",     en: "200" } },
  { v: 100,  s: "💵", n: { ar: "مئة",       en: "100" } }
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
    fxCalcTitle: "أسعار الصرف وتحويل المبلغ",
    fxInputLabel: "المبلغ المستخدم للتحويل",
    fxNoLast: "لم يتم إدخال مبلغ بعد 🙏",
    fxNoRatesNow: "خدمة الصرف غير متاحة.",
    fxDualNew: "بالجديدة تشتري",
    fxDualOld: "بالقديمة تشتري",
    askForAmount: "يرجى إدخال المبلغ المراد تحويله الآن:",
    ratesNote: "💡 لرؤية أسعار الصرف، اضغط على *تحديث الأسعار* أو *تحويل للعملات*.",
    countLabel: "عدد"
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
    fxDualNew: "With NEW you buy",
    fxDualOld: "With OLD you buy",
    askForAmount: "Please enter the amount to convert now:",
    ratesNote: "💡 To see FX rates, press *Refresh* or *FX Conversion*.",
    countLabel: "Qty"
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

/**
 * ✅ ONLY FIX HERE (no other changes):
 * - When mode is oldToNew, we also "consume" the integer remainder using 5/2/1
 *   so leftover becomes only decimals (e.g. 33333 -> 333.33, leftover becomes 0.33 instead of 8.33)
 */
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

  // ✅ Fix: consume integer remainder with 5/2/1 ONLY for oldToNew
  if (isOldToNew && currentTotal >= 1) {
    const EXTRA = [
      { v: 5, s: "🖐️", n: { ar: "خمسة", en: "Five" } },
      { v: 2, s: "✌️", n: { ar: "ليرتان", en: "Two" } },
      { v: 1, s: "☝️", n: { ar: "ليرة", en: "One" } },
    ];

    for (const d of EXTRA) {
      const count = Math.floor((currentTotal + 0.0001) / d.v);
      if (count > 0) {
        dist.push({ ...d, count });
        currentTotal = Math.round((currentTotal - count * d.v) * 100) / 100;
      }
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
      lines.push(`بقي *${nf(lang, res.remaining)}* ${t.newUnit}، تدفعها بالقديم (*${Math.round(res.remaining * RATE)}* ${t.oldUnit}).`);
    } else {
      lines.push(`بقي *${nf(lang, res.remaining)}* ${t.oldUnit}، تدفعها بالجديد (*${(res.remaining / RATE).toFixed(2)}* ${t.newUnit}).`);
    }
    lines.push("");
  }

  lines.push(`*${t.breakdownTitle}*`, `_(${isOldToNew ? t.breakdownSubNew : t.breakdownSubOld})_`, "");

  if (!res.dist.length) {
    lines.push("—");
  } else {
    for (const p of res.dist) {
      const name = p.n?.[lang] || p.v;
      lines.push(`${p.s}  *${name}* ${p.v}  ⬅️  *${p.count}* ${t.countLabel}`);
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

// وظائف إضافية لتوافق الكود
bot.action("refreshRates", async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.answerCbQuery(TRANSLATIONS[s.lang].settingsUpdated);
  return ctx.replyWithMarkdown(TRANSLATIONS[s.lang].ratesNote);
});

bot.action("showFx", async (ctx) => {
  const s = getUS(ctx.from.id);
  await ctx.answerCbQuery();
  return ctx.replyWithMarkdown(TRANSLATIONS[s.lang].fxCalcTitle);
});

export default async function handler(req, res) {
  if (req.method === "POST") await bot.handleUpdate(req.body);
  return res.status(200).send("OK");
}

شكرا الك، هلق ممكن تشيل الاسهم قبل عدد الفئات بقسم توزيع الفئات
العملة القديمة غير الرمز بشيء اخر لا تظهر اشارة $ فيه.
اكتب اسم العملة الاجنبية بجانبها مع الرمز.
الفئة ٢٥ جديدة هي توت وليس عنب غيرها من فضلك
ارجوك لا تعدل اي شيء غير المطلوب
