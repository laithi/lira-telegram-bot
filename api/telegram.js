import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);

// ---- Denoms ----
const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";

// NEW (الجديد)
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat Ears" }, s: "🌾", img: null },
  { v: 200, n: { ar: "أغصان الزيتون", en: "Olive Branches" }, s: "🫒", img: null },
  { v: 100, n: { ar: "القطن السوري", en: "Syrian Cotton" }, s: "☁️", img: null },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊", img: null },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇", img: null },
  { v: 10, n: { ar: "ياسمين الشام", en: "Damask Jasmine" }, s: null, img: JASMINE_IMG }
];

// OLD (القديم) — حسب قائمتك (مرتبة تنازلياً)
const DENOMS_OLD = [
  { v: 5000, n: { ar: "5000 قديم", en: "5000 Old" }, s: "💴", img: null },
  { v: 2000, n: { ar: "2000 قديم", en: "2000 Old" }, s: "💴", img: null },
  { v: 1000, n: { ar: "1000 قديم", en: "1000 Old" }, s: "💴", img: null },
  { v: 200, n: { ar: "200 قديم", en: "200 Old" }, s: "💴", img: null },
  { v: 100, n: { ar: "100 قديم", en: "100 Old" }, s: "💴", img: null },
  { v: 50, n: { ar: "50 قديم", en: "50 Old" }, s: "💴", img: null }
];

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    oldToNew: "من قديم لجديد",
    newToOld: "من جديد لقديم",
    enterAmount: "أرسل المبلغ",
    result: "الناتج",
    howToPay: "توزيع الفئات النقدية",
    denomsNewLabel: "التوزيع حسب فئات الجديد",
    denomsOldLabel: "التوزيع حسب فئات القديم",
    changeNote: "ملاحظة الفراطة",
    changeDescOldToNew: "بقي {leftover} ليرة جديدة، تدفعها بالقديم: ({other} ل.س).",
    changeDescNewToOld: "بقي {leftover} ل.س قديمة، تدفعها بالجديد: ({other} ليرة جديدة).",
    unitOld: "ل.س قديمة",
    unitNew: "ليرة جديدة",
    help: "اكتب رقم (مثال: 50000 أو ١٠٠٠٠٠٠).",
    invalid: "أرسل رقم صحيح فقط 🙏",
    updated: "تم تحديث الإعدادات ✅"
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    oldToNew: "Old → New",
    newToOld: "New → Old",
    enterAmount: "Send amount",
    result: "Result",
    howToPay: "Banknote distribution",
    denomsNewLabel: "Breakdown (New notes)",
    denomsOldLabel: "Breakdown (Old notes)",
    changeNote: "Small change",
    changeDescOldToNew: "{leftover} New leftover, pay in Old: ({other} SYP).",
    changeDescNewToOld: "{leftover} Old leftover, pay in New: ({other} New).",
    unitOld: "Old SYP",
    unitNew: "New Lira",
    help: "Send a number (e.g., 50000).",
    invalid: "Please send a valid number 🙏",
    updated: "Settings updated ✅"
  }
};

// ---- Simple per-user state (MVP) ----
const userState = new Map(); // userId -> { lang, mode }
function getState(userId) {
  if (!userState.has(userId)) userState.set(userId, { lang: "ar", mode: "oldToNew" });
  return userState.get(userId);
}

// Arabic digit normalization
function convertArabicNumbers(str) {
  const map = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
  return String(str).replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

function parseAmount(text) {
  const cleaned = convertArabicNumbers(text).replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

function nfFor(lang) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 });
}

// معامل التحويل: 100 قديم = 1 جديد
const RATE = 100;

/**
 * mode:
 * - oldToNew: input OLD, output NEW, breakdown in NEW
 * - newToOld: input NEW, output OLD, breakdown in OLD
 */
function calc(mode, inputAmount) {
  const isOldToNew = mode === "oldToNew";

  const outputAmount = isOldToNew ? (inputAmount / RATE) : (inputAmount * RATE);

  // breakdown currency + denoms
  const breakdownDenoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;
  const breakdownAmount = isOldToNew ? outputAmount : outputAmount; // لأن output هو عملة التوزيع بكل وضع

  let current = breakdownAmount;
  const parts = [];

  if (current > 0) {
    for (const d of breakdownDenoms) {
      const count = Math.floor(current / d.v);
      if (count > 0) {
        parts.push({ ...d, count });
        current = Math.round((current - count * d.v) * 100) / 100;
      }
    }
  }

  return {
    isOldToNew,
    inputAmount,
    outputAmount,
    parts,
    leftover: current,
    breakdownDenoms
  };
}

function formatReply(lang, mode, resultObj) {
  const t = TRANSLATIONS[lang];
  const nf = nfFor(lang);

  const inputUnit = resultObj.isOldToNew ? t.unitOld : t.unitNew;
  const outputUnit = resultObj.isOldToNew ? t.unitNew : t.unitOld;

  const lines = [];
  lines.push(`*${t.title}* — _${t.subtitle}_`);
  lines.push("");
  lines.push(`• ${t.enterAmount}: *${nf.format(resultObj.inputAmount)}* ${inputUnit}`);
  lines.push(`• ${t.result}: *${nf.format(resultObj.outputAmount)}* ${outputUnit}`);
  lines.push("");

  lines.push(`*${t.howToPay}*`);
  lines.push(`_${resultObj.isOldToNew ? t.denomsNewLabel : t.denomsOldLabel}_`);

  if (resultObj.outputAmount <= 0 || resultObj.parts.length === 0) {
    lines.push(lang === "ar" ? "— لا يوجد توزيع" : "— No breakdown");
  } else {
    for (const p of resultObj.parts) {
      const icon = p.img ? "🌼" : (p.s ?? "💵");
      lines.push(`• *${p.v}* ${icon} — ${p.n[lang]} × *${p.count}*`);
    }
  }

  // Change note:
  // oldToNew: leftover NEW -> pay in OLD (×RATE)
  // newToOld: leftover OLD -> pay in NEW (÷RATE)
  if (resultObj.leftover > 0 && resultObj.outputAmount > 0) {
    lines.push("");
    lines.push(`*${t.changeNote}*`);

    if (resultObj.isOldToNew) {
      const other = Math.round(resultObj.leftover * RATE);
      lines.push(
        t.changeDescOldToNew
          .replace("{leftover}", nf.format(resultObj.leftover))
          .replace("{other}", nf.format(other))
      );
    } else {
      const other = Math.round((resultObj.leftover / RATE) * 100) / 100;
      lines.push(
        t.changeDescNewToOld
          .replace("{leftover}", nf.format(resultObj.leftover))
          .replace("{other}", nf.format(other))
      );
    }
  }

  lines.push("");
  lines.push(lang === "ar" ? "_أرسل رقم جديد للحساب._" : "_Send another number to recalc._");
  return lines.join("\n");
}

function settingsKeyboard(lang, mode) {
  const t = TRANSLATIONS[lang];
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(lang === "ar" ? "عربي" : "AR", "lang:ar"),
      Markup.button.callback(lang === "ar" ? "EN" : "English", "lang:en")
    ],
    [
      Markup.button.callback(t.oldToNew, "mode:oldToNew"),
      Markup.button.callback(t.newToOld, "mode:newToOld")
    ]
  ]);
}

// ---- Bot handlers ----
bot.start(async (ctx) => {
  const st = getState(ctx.from.id);
  const t = TRANSLATIONS[st.lang];
  await ctx.reply(`${t.help}`, settingsKeyboard(st.lang, st.mode));
});

bot.on("callback_query", async (ctx) => {
  const st = getState(ctx.from.id);
  const data = ctx.callbackQuery?.data || "";

  if (data.startsWith("lang:")) {
    st.lang = data.split(":")[1] === "en" ? "en" : "ar";
    await ctx.answerCbQuery(TRANSLATIONS[st.lang].updated);
    return ctx.editMessageReplyMarkup(settingsKeyboard(st.lang, st.mode).reply_markup);
  }

  if (data.startsWith("mode:")) {
    st.mode = data.split(":")[1] === "newToOld" ? "newToOld" : "oldToNew";
    await ctx.answerCbQuery(TRANSLATIONS[st.lang].updated);
    return ctx.editMessageReplyMarkup(settingsKeyboard(st.lang, st.mode).reply_markup);
  }

  await ctx.answerCbQuery();
});

bot.on("text", async (ctx) => {
  const st = getState(ctx.from.id);
  const t = TRANSLATIONS[st.lang];

  const amount = parseAmount(ctx.message.text);
  if (amount === null) return ctx.reply(t.invalid);

  const resultObj = calc(st.mode, amount);
  const msg = formatReply(st.lang, st.mode, resultObj);

  await ctx.replyWithMarkdown(msg, settingsKeyboard(st.lang, st.mode));
});

// ---- Vercel webhook handler (with secret token + robust body parsing) ----
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;

  try { return JSON.parse(raw); } catch { return null; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(200).send("ok");

    if (TELEGRAM_SECRET) {
      const incoming = req.headers["x-telegram-bot-api-secret-token"];
      if (incoming !== TELEGRAM_SECRET) {
        return res.status(401).send("unauthorized");
      }
    }

    const update = await readJsonBody(req);
    if (!update) return res.status(400).send("bad request");

    await bot.handleUpdate(update);
    return res.status(200).send("ok");
  } catch (e) {
    console.error("WEBHOOK_ERROR:", e);
    return res.status(500).send("error");
  }
    }
