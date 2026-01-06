import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

// رابط rates.json الخام من GitHub
// عدّل اسم المستخدم/الريبو إذا مختلف
const RATES_URL =
  "https://raw.githubusercontent.com/laithi/lira-telegram-bot/main/rates.json";

const bot = new Telegraf(BOT_TOKEN);

// ---------- i18n ----------
const T = {
  ar: {
    welcome:
      "أهلًا 👋\nأنا بوت أسعار مصرف سوريا المركزي (النشرة الرسمية).\n\n" +
      "الأوامر:\n" +
      "• /rates — عرض أسعار اليوم\n" +
      "• اكتب تحويل مثل: 100 USD أو 250 AED\n\n" +
      "ملاحظة: التحويل يعتمد على أسعار mid الموجودة في rates.json.",
    updated: "تم تحديث الإعدادات ✅",
    ratesTitle: "النشرة الرسمية — أسعار حسب وسطي",
    date: "تاريخ النشرة",
    generated: "آخر تحديث",
    usage:
      "اكتب:\n• 100 USD\n• 2500 AED\n• 1 KWD\nوسأحوّلها إلى SYP.",
    invalid: "صيغة غير صحيحة 🙏\nجرّب: 100 USD",
    noRates: "ما قدرت أجيب الأسعار حالياً. جرّب بعد شوي.",
    result: "النتيجة",
    inSyp: "بالليرة السورية (SYP)",
  },
  en: {
    welcome:
      "Hi 👋\nI’m the official bulletin rates bot.\n\n" +
      "Commands:\n" +
      "• /rates — show today’s rates\n" +
      "• Send conversion like: 100 USD or 250 AED\n\n" +
      "Note: conversion uses the mid rates in rates.json.",
    updated: "Settings updated ✅",
    ratesTitle: "Official Bulletin — Mid Rates",
    date: "Bulletin date",
    generated: "Last generated",
    usage:
      "Send:\n• 100 USD\n• 2500 AED\n• 1 KWD\nand I’ll convert to SYP.",
    invalid: "Invalid format 🙏\nTry: 100 USD",
    noRates: "Could not fetch rates right now. Try again later.",
    result: "Result",
    inSyp: "in SYP",
  },
};

// ---------- Simple per-user state ----------
const userState = new Map(); // userId -> { lang }
function getState(userId) {
  if (!userState.has(userId)) userState.set(userId, { lang: "ar" });
  return userState.get(userId);
}

function settingsKeyboard(lang) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(lang === "ar" ? "عربي ✅" : "AR", "lang:ar"),
      Markup.button.callback(lang === "en" ? "English ✅" : "EN", "lang:en"),
    ],
  ]);
}

// ---------- Fetch rates with cache ----------
let cache = { at: 0, data: null };
const CACHE_MS = 60 * 1000; // 1 minute

async function fetchRates() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return cache.data;

  const res = await fetch(RATES_URL, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`Failed to fetch rates: ${res.status}`);
  const data = await res.json();

  cache = { at: now, data };
  return data;
}

function nf(lang) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SY" : "en-US", {
    maximumFractionDigits: 2,
  });
}

function formatChange(ch) {
  if (ch === null || ch === undefined) return "";
  const sign = ch > 0 ? "+" : "";
  return `${sign}${ch}`;
}

// ---------- Parsing conversion messages ----------
/**
 * Accepts:
 *  "100 USD"
 *  "2500 aed"
 *  "1.5 KWD"
 */
function parseConversion(text) {
  const cleaned = text.trim().replace(/,/g, "");
  const m = cleaned.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]{3})$/);
  if (!m) return null;
  return { amount: Number(m[1]), cur: m[2].toUpperCase() };
}

// ---------- Bot commands ----------
bot.start(async (ctx) => {
  const st = getState(ctx.from.id);
  const t = T[st.lang];
  await ctx.reply(t.welcome, settingsKeyboard(st.lang));
});

bot.command("rates", async (ctx) => {
  const st = getState(ctx.from.id);
  const t = T[st.lang];

  try {
    const data = await fetchRates();
    const fmt = nf(st.lang);

    const title = `*${t.ratesTitle}*`;
    const dateLine = `${t.date}: *${data.bulletin_date ?? "—"}*`;
    const genLine = `${t.generated}: *${data.generated_at_utc ?? "—"}*`;

    const lines = [title, dateLine, genLine, ""];

    for (const cur of data.ordered_currencies || Object.keys(data.rates || {})) {
      const item = data.rates?.[cur];
      const mid = item?.mid;
      const ch = item?.change;

      if (typeof mid !== "number") continue;

      const chStr = formatChange(ch);
      lines.push(`• *${cur}*: ${fmt.format(mid)}  _(${chStr})_`);
    }

    lines.push("");
    lines.push(st.lang === "ar" ? "_للتحويل: اكتب 100 USD_" : "_To convert: send 100 USD_");

    await ctx.replyWithMarkdown(lines.join("\n"), settingsKeyboard(st.lang));
  } catch (e) {
    console.error(e);
    await ctx.reply(t.noRates, settingsKeyboard(st.lang));
  }
});

bot.on("callback_query", async (ctx) => {
  const st = getState(ctx.from.id);
  const data = ctx.callbackQuery?.data || "";

  if (data === "lang:ar" || data === "lang:en") {
    st.lang = data.split(":")[1];
    await ctx.answerCbQuery(T[st.lang].updated);
    return ctx.editMessageReplyMarkup(settingsKeyboard(st.lang).reply_markup);
  }

  await ctx.answerCbQuery();
});

bot.on("text", async (ctx) => {
  const st = getState(ctx.from.id);
  const t = T[st.lang];

  const parsed = parseConversion(ctx.message.text);
  if (!parsed) {
    return ctx.reply(t.invalid + "\n\n" + t.usage, settingsKeyboard(st.lang));
  }

  const { amount, cur } = parsed;
  if (!Number.isFinite(amount) || amount <= 0) {
    return ctx.reply(t.invalid, settingsKeyboard(st.lang));
  }

  try {
    const data = await fetchRates();
    const rateObj = data.rates?.[cur];
    const mid = rateObj?.mid;

    if (typeof mid !== "number") {
      return ctx.reply(
        st.lang === "ar"
          ? `العملة غير مدعومة حالياً: ${cur}\nجرّب /rates`
          : `Currency not supported: ${cur}\nTry /rates`,
        settingsKeyboard(st.lang)
      );
    }

    // Interpretation:
    // values are “SYP per 1 unit of currency” (based on your screenshot: USD ~ 111 SYP)
    const syp = amount * mid;

    const fmt = nf(st.lang);
    const reply =
      `*${t.result}*\n` +
      `• ${fmt.format(amount)} *${cur}*\n` +
      `= *${fmt.format(syp)}* ${t.inSyp}\n\n` +
      `${t.date}: *${data.bulletin_date ?? "—"}*`;

    await ctx.replyWithMarkdown(reply, settingsKeyboard(st.lang));
  } catch (e) {
    console.error(e);
    await ctx.reply(t.noRates, settingsKeyboard(st.lang));
  }
});

// ---------- Vercel webhook handler ----------
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
