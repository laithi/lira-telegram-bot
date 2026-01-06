import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

// عدّل الرابط إذا اختلف اسم اليوزر/الريبو
const RATES_URL =
  "https://raw.githubusercontent.com/laithi/lira-telegram-bot/main/rates.json";

// ---- Data (from your app) ----
const JASMINE_IMG = "https://cdn-icons-png.flaticon.com/512/5075/5075794.png";

const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat Ears" }, s: "🌾", img: null },
  { v: 200, n: { ar: "أغصان الزيتون", en: "Olive Branches" }, s: "🫒", img: null },
  { v: 100, n: { ar: "القطن السوري", en: "Syrian Cotton" }, s: "☁️", img: null },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊", img: null },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇", img: null },
  { v: 10, n: { ar: "ياسمين الشام", en: "Damask Jasmine" }, s: null, img: JASMINE_IMG },
];

// (حسب طلبك للفئات القديمة)
const DENOMS_OLD = [
  { v: 5000, n: { ar: "5000", en: "5000" }, s: "💵", img: null },
  { v: 2000, n: { ar: "2000", en: "2000" }, s: "💵", img: null },
  { v: 1000, n: { ar: "1000", en: "1000" }, s: "💵", img: null },
  { v: 200,  n: { ar: "200",  en: "200"  }, s: "💵", img: null },
  { v: 100,  n: { ar: "100",  en: "100"  }, s: "💵", img: null },
  { v: 50,   n: { ar: "50",   en: "50"   }, s: "💵", img: null },
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
    changeNote: "ملاحظة الفراطة",
    changeDesc: "بقي {leftover} ليرة جديدة، تدفعها بالقديم: ({oldAmount} ل.س).",
    unitOld: "ل.س قديمة",
    unitNew: "ليرة جديدة",
    help:
      "ابعت رقم للحساب.\nمثال: 50000 أو ١٠٠٠٠٠٠\n\n" +
      "وبتقدر تبدّل الوضع (قديم↔جديد) من الأزرار.",
    invalid: "أرسل رقم صحيح فقط 🙏",
    updated: "تم تحديث الإعدادات ✅",
    fxTitle: "أسعار العملات (وسطي)",
    fxDate: "تاريخ النشرة",
    fxUpdated: "آخر تحديث",
    refreshRates: "تحديث الأسعار",
    refreshDone: "تم تحديث الأسعار ✅",
    noRates: "ما قدرت أجيب أسعار العملات حالياً.",
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    oldToNew: "Old → New",
    newToOld: "New → Old",
    enterAmount: "Send amount",
    result: "Result",
    howToPay: "Banknote distribution",
    changeNote: "Small change",
    changeDesc: "{leftover} New leftover, pay in Old: ({oldAmount} SYP).",
    unitOld: "Old SYP",
    unitNew: "New Lira",
    help: "Send a number (e.g., 50000). Use buttons to switch mode.",
    invalid: "Please send a valid number 🙏",
    updated: "Settings updated ✅",
    fxTitle: "FX Rates (mid)",
    fxDate: "Bulletin date",
    fxUpdated: "Last updated",
    refreshRates: "Refresh rates",
    refreshDone: "Rates refreshed ✅",
    noRates: "Could not fetch FX rates right now.",
  },
};

const bot = new Telegraf(BOT_TOKEN);

// ---- State ----
/**
 * userId -> { lang, mode, lastInputAmount, lastResultObj }
 * lastInputAmount = الرقم اللي المستخدم أدخله (بوحدة وضعه الحالي)
 */
const userState = new Map();
function getState(userId) {
  if (!userState.has(userId)) {
    userState.set(userId, {
      lang: "ar",
      mode: "oldToNew",
      lastInputAmount: null,
      lastResultObj: null,
    });
  }
  return userState.get(userId);
}

// ---- Arabic digit normalization ----
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

// ---- Lira calc ----
function calc(mode, inputAmount) {
  const isOldToNew = mode === "oldToNew";

  // conversion ratio: 액 /100
  const currentResult = isOldToNew ? (inputAmount / 100) : (inputAmount * 100);

  // for breakdown:
  // - if oldToNew: breakdown on NEW banknotes (amountInNew = currentResult)
  // - if newToOld: breakdown on OLD banknotes (amountInOld = currentResult)
  const amountInNew = isOldToNew ? currentResult : inputAmount;
  const amountInOld = isOldToNew ? inputAmount : currentResult;

  let current = isOldToNew ? amountInNew : amountInOld;
  const parts = [];

  const denoms = isOldToNew ? DENOMS_NEW : DENOMS_OLD;

  if (current > 0) {
    for (const d of denoms) {
      const count = Math.floor(current / d.v);
      if (count > 0) {
        parts.push({ ...d, count });
        current = Math.round((current - count * d.v) * 100) / 100;
      }
    }
  }

  return {
    currentResult,
    amountInNew,
    amountInOld,
    parts,
    leftover: current,
  };
}

function nfFor(lang) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", { maximumFractionDigits: 2 });
}

// ---- FX fetch with cache + manual refresh ----
let fxCache = { at: 0, data: null };
const FX_CACHE_MS = 60 * 1000; // 1 minute

async function fetchFxRates({ force = false } = {}) {
  const now = Date.now();
  if (!force && fxCache.data && now - fxCache.at < FX_CACHE_MS) return fxCache.data;

  const res = await fetch(RATES_URL, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`Failed to fetch rates.json: ${res.status}`);
  const data = await res.json();

  fxCache = { at: now, data };
  return data;
}

function formatFxBlock(lang, fxData) {
  const t = TRANSLATIONS[lang];
  const fmt = nfFor(lang);

  if (!fxData?.rates) return `\n\n*${t.fxTitle}*\n${t.noRates}`;

  const date = fxData.bulletin_date ?? "—";
  const updated = fxData.generated_at_utc ?? "—";
  const order = fxData.ordered_currencies || Object.keys(fxData.rates);

  const lines = [];
  lines.push(`\n\n*${t.fxTitle}*`);
  lines.push(`${t.fxDate}: *${date}*`);
  lines.push(`${t.fxUpdated}: _${updated}_`);
  lines.push("");

  for (const cur of order) {
    const item = fxData.rates[cur];
    if (!item || typeof item.mid !== "number") continue;
    const ch = item.change;
    const sign = typeof ch === "number" && ch > 0 ? "+" : "";
    const chStr = typeof ch === "number" ? `${sign}${fmt.format(ch)}` : "—";
    lines.push(`• *${cur}*: ${fmt.format(item.mid)}  _(${chStr})_`);
  }

  return lines.join("\n");
}

// ---- Reply composer (Lira + FX together) ----
function formatMainReply(lang, mode, inputAmount, resultObj, fxData) {
  const t = TRANSLATIONS[lang];
  const fmt = nfFor(lang);
  const isOldToNew = mode === "oldToNew";

  const inputUnit = isOldToNew ? t.unitOld : t.unitNew;
  const outputUnit = isOldToNew ? t.unitNew : t.unitOld;

  const lines = [];
  lines.push(`*${t.title}* — _${t.subtitle}_`);
  lines.push("");

  lines.push(`• ${t.enterAmount}: *${fmt.format(inputAmount)}* ${inputUnit}`);
  lines.push(`• ${t.result}: *${fmt.format(resultObj.currentResult)}* ${outputUnit}`);
  lines.push("");

  lines.push(`*${t.howToPay}* (${isOldToNew ? "New" : "Old"}):`);
  if (resultObj.parts.length === 0) {
    lines.push(lang === "ar" ? "— لا يوجد توزيع" : "— No breakdown");
  } else {
    for (const p of resultObj.parts) {
      const icon = p.img ? "🌼" : (p.s ?? "💵");
      lines.push(`• *${p.v}* ${icon} — ${p.n[lang]} × *${p.count}*`);
    }
  }

  // leftover note only makes sense in old->new (new leftover pay in old)
  if (isOldToNew && resultObj.leftover > 0 && resultObj.amountInNew > 0) {
    const oldAmount = Math.round(resultObj.leftover * 100);
    lines.push("");
    lines.push(`*${t.changeNote}*`);
    lines.push(
      t.changeDesc
        .replace("{leftover}", fmt.format(resultObj.leftover))
        .replace("{oldAmount}", fmt.format(oldAmount))
    );
  }

  // append FX block
  lines.push(formatFxBlock(lang, fxData));

  lines.push("");
  lines.push(lang === "ar" ? "_أرسل رقم جديد للحساب._" : "_Send another number to recalc._");

  return lines.join("\n");
}

// ---- Keyboard (lang/mode + refresh) ----
function mainKeyboard(lang, mode) {
  const t = TRANSLATIONS[lang];
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(lang === "ar" ? "عربي" : "AR", "lang:ar"),
      Markup.button.callback(lang === "ar" ? "EN" : "English", "lang:en"),
      Markup.button.callback(`🔄 ${t.refreshRates}`, "fx:refresh"),
    ],
    [
      Markup.button.callback(t.oldToNew, "mode:oldToNew"),
      Markup.button.callback(t.newToOld, "mode:newToOld"),
    ],
  ]);
}

// ---- Handlers ----
bot.start(async (ctx) => {
  const st = getState(ctx.from.id);
  const t = TRANSLATIONS[st.lang];

  // show help + current FX snapshot in the welcome message
  let fxData = null;
  try { fxData = await fetchFxRates(); } catch (e) { /* ignore */ }

  const msg =
    `${t.help}\n` +
    formatFxBlock(st.lang, fxData);

  await ctx.replyWithMarkdown(msg, mainKeyboard(st.lang, st.mode));
});

bot.on("callback_query", async (ctx) => {
  const st = getState(ctx.from.id);
  const data = ctx.callbackQuery?.data || "";

  // lang switch
  if (data.startsWith("lang:")) {
    st.lang = data.split(":")[1] === "en" ? "en" : "ar";
    await ctx.answerCbQuery(TRANSLATIONS[st.lang].updated);

    // if we have last calc -> edit message to reflect lang
    try {
      let fxData = null;
      try { fxData = await fetchFxRates(); } catch {}
      if (st.lastInputAmount != null && st.lastResultObj != null) {
        const text = formatMainReply(st.lang, st.mode, st.lastInputAmount, st.lastResultObj, fxData);
        return ctx.editMessageText(text, { parse_mode: "Markdown", ...mainKeyboard(st.lang, st.mode) });
      }
      return ctx.editMessageReplyMarkup(mainKeyboard(st.lang, st.mode).reply_markup);
    } catch {
      return;
    }
  }

  // mode switch
  if (data.startsWith("mode:")) {
    st.mode = data.split(":")[1] === "newToOld" ? "newToOld" : "oldToNew";
    await ctx.answerCbQuery(TRANSLATIONS[st.lang].updated);

    // If user already did a calc, re-calc based on same input but new mode
    try {
      let fxData = null;
      try { fxData = await fetchFxRates(); } catch {}
      if (st.lastInputAmount != null) {
        const resultObj = calc(st.mode, st.lastInputAmount);
        st.lastResultObj = resultObj;
        const text = formatMainReply(st.lang, st.mode, st.lastInputAmount, resultObj, fxData);
        return ctx.editMessageText(text, { parse_mode: "Markdown", ...mainKeyboard(st.lang, st.mode) });
      }
      return ctx.editMessageReplyMarkup(mainKeyboard(st.lang, st.mode).reply_markup);
    } catch {
      return;
    }
  }

  // refresh FX (force fetch) and update message
  if (data === "fx:refresh") {
    await ctx.answerCbQuery(TRANSLATIONS[st.lang].refreshDone);

    try {
      const fxData = await fetchFxRates({ force: true });

      // if last calc exists -> update same “main reply”
      if (st.lastInputAmount != null && st.lastResultObj != null) {
        const text = formatMainReply(st.lang, st.mode, st.lastInputAmount, st.lastResultObj, fxData);
        return ctx.editMessageText(text, { parse_mode: "Markdown", ...mainKeyboard(st.lang, st.mode) });
      }

      // otherwise, just show FX block
      const t = TRANSLATIONS[st.lang];
      const msg = `${t.help}\n${formatFxBlock(st.lang, fxData)}`;
      return ctx.editMessageText(msg, { parse_mode: "Markdown", ...mainKeyboard(st.lang, st.mode) });
    } catch (e) {
      console.error(e);
      const t = TRANSLATIONS[st.lang];
      return ctx.reply(t.noRates, mainKeyboard(st.lang, st.mode));
    }
  }

  await ctx.answerCbQuery();
});

bot.on("text", async (ctx) => {
  const st = getState(ctx.from.id);
  const t = TRANSLATIONS[st.lang];

  const amount = parseAmount(ctx.message.text);
  if (amount === null) return ctx.reply(t.invalid, mainKeyboard(st.lang, st.mode));

  const resultObj = calc(st.mode, amount);
  st.lastInputAmount = amount;
  st.lastResultObj = resultObj;

  let fxData = null;
  try { fxData = await fetchFxRates(); } catch (e) { fxData = null; }

  const msg = formatMainReply(st.lang, st.mode, amount, resultObj, fxData);

  await ctx.replyWithMarkdown(msg, mainKeyboard(st.lang, st.mode));
});

// ---- Vercel webhook handler ----
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(200).send("ok");
    await bot.handleUpdate(req.body);
    res.status(200).send("ok");
  } catch (e) {
    console.error(e);
    res.status(500).send("error");
  }
    }
