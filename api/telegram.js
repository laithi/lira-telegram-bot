import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);

// ---- Denominations (الفئات النقدية) ----
const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";

const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat Ears" }, s: "🌾" },
  { v: 200, n: { ar: "أغصان الزيتون", en: "Olive Branches" }, s: "🫒" },
  { v: 100, n: { ar: "القطن السوري", en: "Syrian Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "ياسمين الشام", en: "Damask Jasmine" }, s: "🌼" }
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "5000 قديم", en: "5000 Old" }, s: "💴" },
  { v: 2000, n: { ar: "2000 قديم", en: "2000 Old" }, s: "💴" },
  { v: 1000, n: { ar: "1000 قديم", en: "1000 Old" }, s: "💴" },
  { v: 500, n: { ar: "500 قديم", en: "500 Old" }, s: "💴" },
  { v: 200, n: { ar: "200 قديم", en: "200 Old" }, s: "💴" },
  { v: 100, n: { ar: "100 قديم", en: "100 Old" }, s: "💴" },
  { v: 50, n: { ar: "50 قديم", en: "50 Old" }, s: "💴" }
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    oldToNew: "من قديم ⬅️ جديد",
    newToOld: "من جديد ⬅️ قديم",
    enterAmount: "المبلغ المرسل",
    result: "النتيجة التقريبية",
    howToPay: "توزيع العملة",
    denomsNewLabel: "الفئات الجديدة المطلوبة",
    denomsOldLabel: "الفئات القديمة المطلوبة",
    changeNote: "الفراطة (باقي المبلغ)",
    unitOld: "ل.س قديمة",
    unitNew: "ليرة جديدة",
    help: "أهلاً بك في دليل الليرة. أرسل أي مبلغ لتحويله (مثال: 50000).",
    invalid: "يرجى إرسال رقم صحيح فقط 🙏",
    updated: "تم التحديث ✅",
    noBreakdown: "— لا يوجد فئات مطابقة لهذا المبلغ"
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    oldToNew: "Old ⬅️ New",
    newToOld: "New ⬅️ Old",
    enterAmount: "Input Amount",
    result: "Converted Result",
    howToPay: "Currency Distribution",
    denomsNewLabel: "Required New Banknotes",
    denomsOldLabel: "Required Old Banknotes",
    changeNote: "Change (Small Leftover)",
    unitOld: "Old SYP",
    unitNew: "New Lira",
    help: "Welcome to Lira Guide. Send any amount to convert (e.g., 50000).",
    invalid: "Please send a valid number 🙏",
    updated: "Updated ✅",
    noBreakdown: "— No matching banknotes for this amount"
  }
};

const RATE = 100; // 1 New = 100 Old
const userState = new Map();

function getState(userId) {
  if (!userState.has(userId)) userState.set(userId, { lang: "ar", mode: "oldToNew" });
  return userState.get(userId);
}

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

function calc(mode, inputAmount) {
  const isOldToNew = mode === "oldToNew";
  let outputAmount, breakdownAmount, breakdownDenoms, leftover;
  const parts = [];

  if (isOldToNew) {
    // التحويل من قديم إلى جديد (100 قديم = 1 جديد)
    outputAmount = inputAmount / RATE; 
    breakdownDenoms = DENOMS_NEW;
    // التوزيع يعتمد على الأوراق الجديدة (نوزع الرقم الصحيح فقط)
    breakdownAmount = Math.floor(outputAmount); 
    
    let current = breakdownAmount;
    for (const d of breakdownDenoms) {
      const count = Math.floor(current / d.v);
      if (count > 0) {
        parts.push({ ...d, count });
        current -= count * d.v;
      }
    }
    // المتبقي (leftover) هو الفكة التي لم تكتمل لورقة نقدية جديدة، محسوبة بالقديم
    leftover = Math.round((current * RATE) + (inputAmount % RATE));
  } else {
    // التحويل من جديد إلى قديم (1 جديد = 100 قديم)
    outputAmount = inputAmount * RATE;
    breakdownDenoms = DENOMS_OLD;
    breakdownAmount = outputAmount;

    let current = breakdownAmount;
    for (const d of breakdownDenoms) {
      const count = Math.floor(current / d.v);
      if (count > 0) {
        parts.push({ ...d, count });
        current -= count * d.v;
      }
    }
    leftover = Math.round(current);
  }

  return { isOldToNew, inputAmount, outputAmount, parts, leftover };
}

function formatReply(lang, mode, resultObj) {
  const t = TRANSLATIONS[lang];
  const nf = nfFor(lang);
  const isOldToNew = resultObj.isOldToNew;

  const inputUnit = isOldToNew ? t.unitOld : t.unitNew;
  const outputUnit = isOldToNew ? t.unitNew : t.unitOld;

  const lines = [
    `*${t.title}* — _${t.subtitle}_`,
    "",
    `• ${t.enterAmount}: *${nf.format(resultObj.inputAmount)}* ${inputUnit}`,
    `• ${t.result}: *${nf.format(resultObj.outputAmount)}* ${outputUnit}`,
    "",
    `*${t.howToPay}*`,
    `_${isOldToNew ? t.denomsNewLabel : t.denomsOldLabel}_`
  ];

  if (resultObj.parts.length === 0) {
    lines.push(t.noBreakdown);
  } else {
    for (const p of resultObj.parts) {
      const icon = p.s || "💴";
      lines.push(`• *${p.v}* ${icon} — ${p.n[lang]} × *${p.count}*`);
    }
  }

  if (resultObj.leftover > 0) {
    lines.push("");
    lines.push(`*${t.changeNote}*`);
    if (isOldToNew) {
      lines.push(lang === "ar" 
        ? `بقي مبلـغ *${nf.format(resultObj.leftover)}* ل.س قديمة تدفع كفكة.` 
        : `Pay the remaining *${nf.format(resultObj.leftover)}* Old SYP as change.`);
    } else {
      const inNew = resultObj.leftover / RATE;
      lines.push(lang === "ar"
        ? `بقي *${nf.format(resultObj.leftover)}* ل.س قديمة (تعادل ${nf.format(inNew)} جديد).`
        : `Leftover *${nf.format(resultObj.leftover)}* Old SYP (equals ${nf.format(inNew)} New).`);
    }
  }

  lines.push("", lang === "ar" ? "_أرسل مبلغاً آخر للحساب._" : "_Send another amount to calculate._");
  return lines.join("\n");
}

function settingsKeyboard(lang, mode) {
  const t = TRANSLATIONS[lang];
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(lang === "ar" ? "عربي 🇸🇾" : "AR 🇸🇾", "lang:ar"),
      Markup.button.callback(lang === "ar" ? "EN 🇺🇸" : "English 🇺🇸", "lang:en")
    ],
    [
      Markup.button.callback(mode === "oldToNew" ? `✅ ${t.oldToNew}` : t.oldToNew, "mode:oldToNew"),
      Markup.button.callback(mode === "newToOld" ? `✅ ${t.newToOld}` : t.newToOld, "mode:newToOld")
    ]
  ]);
}

bot.start(async (ctx) => {
  const st = getState(ctx.from.id);
  await ctx.reply(TRANSLATIONS[st.lang].help, settingsKeyboard(st.lang, st.mode));
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
  await ctx.editMessageReplyMarkup(settingsKeyboard(st.lang, st.mode).reply_markup);
});

bot.on("text", async (ctx) => {
  const st = getState(ctx.from.id);
  const amount = parseAmount(ctx.message.text);

  if (amount === null || amount <= 0) {
    return ctx.reply(TRANSLATIONS[st.lang].invalid);
  }

  const result = calc(st.mode, amount);
  const response = formatReply(st.lang, st.mode, result);

  await ctx.replyWithMarkdown(response, settingsKeyboard(st.lang, st.mode));
});

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(200).send("Bot is running!");
    
    if (TELEGRAM_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) {
      return res.status(401).send("Unauthorized");
    }

    const body = req.body || JSON.parse(await new Promise((resolve) => {
      let data = "";
      req.on("data", chunk => data += chunk);
      req.on("end", () => resolve(data));
    }));

    await bot.handleUpdate(body);
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Error");
  }
                          }
