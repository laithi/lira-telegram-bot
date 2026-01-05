import { Telegraf, Markup } from "telegraf";

// إعدادات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);

// ---- العملات والفئات ----
const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";
const RATE = 100; // 100 قديم = 1 جديد

// فئات الإصدار الجديد
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat Ears" }, s: "🌾" },
  { v: 200, n: { ar: "أغصان الزيتون", en: "Olive Branches" }, s: "🫒" },
  { v: 100, n: { ar: "القطن السوري", en: "Syrian Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "ياسمين الشام", en: "Damask Jasmine" }, s: "🌼" }
];

// فئات الإصدار القديم (للتوزيع عند التحويل لليرا القديمة)
const DENOMS_OLD = [
  { v: 5000, n: { ar: "5000 ل.س", en: "5000 SYP" }, s: "💴" },
  { v: 2000, n: { ar: "2000 ل.س", en: "2000 SYP" }, s: "💴" },
  { v: 1000, n: { ar: "1000 ل.س", en: "1000 SYP" }, s: "💴" },
  { v: 500, n: { ar: "500 ل.س", en: "500 SYP" }, s: "💴" },
  { v: 200, n: { ar: "200 ل.س", en: "200 SYP" }, s: "💴" },
  { v: 100, n: { ar: "100 ل.س", en: "100 SYP" }, s: "💴" },
  { v: 50, n: { ar: "50 ل.س", en: "50 SYP" }, s: "💴" }
];

const TRANSLATIONS = {
  ar: {
    title: "🇸🇾 دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    oldToNew: "🔄 من قديم لجديد",
    newToOld: "🔄 من جديد لقديم",
    enterAmount: "المبلغ المدخل",
    result: "الصافي المعادل",
    howToPay: "توزيع الفئات النقدية",
    denomsNewLabel: "حسب فئات الإصدار الجديد",
    denomsOldLabel: "حسب فئات الإصدار القديم",
    changeNote: "ملاحظة الفراطة",
    changeDescOldToNew: "بقي {leftover} ليرة جديدة، تدفعها بالقديم: ({other} ل.س).",
    changeDescNewToOld: "بقي {leftover} ل.س قديمة، تدفعها بالجديد: ({other} ليرة جديدة).",
    unitOld: "ل.س قديمة",
    unitNew: "ليرة جديدة",
    help: "أهلاً بك في بوت دليل الليرة. أرسل أي مبلغ وسأقوم بحسابه لك فوراً.",
    invalid: "الرجاء إرسال أرقام فقط (مثال: 50000) 🙏",
    updated: "تم تحديث الإعدادات ✅",
    retry: "أرسل مبلغاً آخر للحساب."
  },
  en: {
    title: "🇸🇾 Lira Guide",
    subtitle: "Syrian New Currency Guide",
    oldToNew: "🔄 Old to New",
    newToOld: "🔄 New to Old",
    enterAmount: "Entered Amount",
    result: "Equivalent Result",
    howToPay: "Banknote Distribution",
    denomsNewLabel: "Based on New Issuance",
    denomsOldLabel: "Based on Old Issuance",
    changeNote: "Small Change",
    changeDescOldToNew: "{leftover} New leftover, pay in Old: ({other} SYP).",
    changeDescNewToOld: "{leftover} Old leftover, pay in New: ({other} New).",
    unitOld: "Old SYP",
    unitNew: "New Lira",
    help: "Welcome to Lira Guide Bot. Send any amount to calculate instantly.",
    invalid: "Please send numbers only (e.g., 50000) 🙏",
    updated: "Settings updated ✅",
    retry: "Send another number to recalc."
  }
};

// ---- إدارة حالة المستخدم (User State) ----
const userState = new Map();
function getState(userId) {
  if (!userState.has(userId)) userState.set(userId, { lang: "ar", mode: "oldToNew" });
  return userState.get(userId);
}

// تحويل الأرقام العربية (١٢٣) إلى (123)
function convertArabicNumbers(str) {
  const map = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
  return String(str).replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

function parseAmount(text) {
  const cleaned = convertArabicNumbers(text).replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return (isNaN(n) || !isFinite(n)) ? null : n;
}

function nfFor(lang) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 });
}

// ---- منطق الحساب والتوزيع ----
function calc(mode, inputAmount) {
  const isOldToNew = mode === "oldToNew";
  const outputAmount = isOldToNew ? (inputAmount / RATE) : (inputAmount * RATE);
  const breakdownDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  let current = outputAmount;
  const parts = [];

  for (const d of breakdownDenoms) {
    const count = Math.floor(current / d.v);
    if (count > 0) {
      parts.push({ ...d, count });
      current = Math.round((current - count * d.v) * 100) / 100;
    }
  }

  return { isOldToNew, inputAmount, outputAmount, parts, leftover: current };
}

// ---- تنسيق الرد ----
function formatReply(lang, mode, resultObj) {
  const t = TRANSLATIONS[lang];
  const nf = nfFor(lang);
  const inputUnit = resultObj.isOldToNew ? t.unitOld : t.unitNew;
  const outputUnit = resultObj.isOldToNew ? t.unitNew : t.unitOld;

  let msg = `*${t.title}*\n_${t.subtitle}_\n\n`;
  msg += `• ${t.enterAmount}: *${nf.format(resultObj.inputAmount)}* ${inputUnit}\n`;
  msg += `• ${t.result}: *${nf.format(resultObj.outputAmount)}* ${outputUnit}\n\n`;
  msg += `*${t.howToPay}*\n_${resultObj.isOldToNew ? t.denomsNewLabel : t.denomsOldLabel}_\n`;

  if (resultObj.parts.length === 0) {
    msg += (lang === "ar" ? "— المبلغ صغير جداً للتوزيع" : "— Amount too small for breakdown");
  } else {
    resultObj.parts.forEach(p => {
      msg += `• *${p.v}* ${p.s} — ${p.n[lang]} × *${p.count}*\n`;
    });
  }

  if (resultObj.leftover > 0) {
    msg += `\n⚠️ *${t.changeNote}*\n`;
    if (resultObj.isOldToNew) {
      const other = Math.round(resultObj.leftover * RATE);
      msg += t.changeDescOldToNew.replace("{leftover}", nf.format(resultObj.leftover)).replace("{other}", nf.format(other));
    } else {
      const other = (resultObj.leftover / RATE).toFixed(2);
      msg += t.changeDescNewToOld.replace("{leftover}", nf.format(resultObj.leftover)).replace("{other}", nf.format(other));
    }
  }

  msg += `\n\n_${t.retry}_`;
  return msg;
}

function settingsKeyboard(lang, mode) {
  const t = TRANSLATIONS[lang];
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(lang === "ar" ? "🇸🇾 عربي" : "AR", "lang:ar"),
      Markup.button.callback(lang === "ar" ? "EN" : "🇺🇸 English", "lang:en")
    ],
    [
      Markup.button.callback(mode === "oldToNew" ? `✅ ${t.oldToNew}` : t.oldToNew, "mode:oldToNew"),
      Markup.button.callback(mode === "newToOld" ? `✅ ${t.newToOld}` : t.newToOld, "mode:newToOld")
    ]
  ]);
}

// ---- معالجات البوت ----
bot.start((ctx) => {
  const st = getState(ctx.from.id);
  const t = TRANSLATIONS[st.lang];
  return ctx.replyWithMarkdown(`${t.help}\n\n*الإعدادات الحالية:*`, settingsKeyboard(st.lang, st.mode));
});

bot.on("callback_query", async (ctx) => {
  const st = getState(ctx.from.id);
  const data = ctx.callbackQuery.data;

  if (data.startsWith("lang:")) {
    st.lang = data.split(":")[1];
  } else if (data.startsWith("mode:")) {
    st.mode = data.split(":")[1];
  }

  await ctx.answerCbQuery(TRANSLATIONS[st.lang].updated);
  return ctx.editMessageReplyMarkup(settingsKeyboard(st.lang, st.mode).reply_markup);
});

bot.on("text", async (ctx) => {
  const st = getState(ctx.from.id);
  const t = TRANSLATIONS[st.lang];
  const amount = parseAmount(ctx.message.text);

  if (amount === null) return ctx.reply(t.invalid);

  const resultObj = calc(st.mode, amount);
  const msg = formatReply(st.lang, st.mode, resultObj);

  return ctx.replyWithMarkdown(msg, settingsKeyboard(st.lang, st.mode));
});

// ---- Vercel Webhook Handler ----
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  if (TELEGRAM_SECRET) {
    if (req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) {
      return res.status(401).send("Unauthorized");
    }
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    await bot.handleUpdate(body);
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
}

