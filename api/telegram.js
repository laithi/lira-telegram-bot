// api/telegram.js
import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

const bot = new Telegraf(BOT_TOKEN);
const RATE = 100;

// ================== DATA ==================
const DENOMS_NEW = [
  { v: 500, n: { ar: "سنابل القمح", en: "Wheat" }, s: "🌾" },
  { v: 200, n: { ar: "الزيتون", en: "Olive" }, s: "🫒" },
  { v: 100, n: { ar: "القطن", en: "Cotton" }, s: "☁️" },
  { v: 50, n: { ar: "الحمضيات", en: "Citrus" }, s: "🍊" },
  { v: 25, n: { ar: "العنب", en: "Grapes" }, s: "🍇" },
  { v: 10, n: { ar: "الياسمين", en: "Jasmine" }, s: "🌼" },
];

const DENOMS_OLD = [
  { v: 5000, n: { ar: "5000", en: "5000" }, s: "💵" },
  { v: 2000, n: { ar: "2000", en: "2000" }, s: "💵" },
  { v: 1000, n: { ar: "1000", en: "1000" }, s: "💵" },
  { v: 500, n: { ar: "500", en: "500" }, s: "💵" },
];

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

const TRANSLATIONS = {
  ar: {
    title: "دليل الليرة",
    subtitle: "دليل العملة السورية الجديدة",
    input: "المبلغ المدخل",
    eq: "الصافي المعادل",
    old: "ل.س قديمة",
    neu: "ليرة جديدة",
    dist: "توزيع الفئات النقدية",
    distNew: "حسب فئات الإصدار الجديد",
    distOld: "حسب فئات الإصدار القديم",
    change: "ملاحظة الفراطة",
    fx: "تحويل للعملات الأجنبية",
    send: "أرسل مبلغاً آخر للحساب.",
  },
  en: {
    title: "Lira Guide",
    subtitle: "Syrian New Currency Guide",
    input: "Input amount",
    eq: "Equivalent",
    old: "Old SYP",
    neu: "New Lira",
    dist: "Banknote distribution",
    distNew: "Using NEW issuance",
    distOld: "Using OLD issuance",
    change: "Small change",
    fx: "Converted to FX",
    send: "Send another amount.",
  },
};

// ================== STATE ==================
const userState = new Map();
const getUS = (id) => {
  if (!userState.has(id))
    userState.set(id, { lang: "ar", mode: "oldToNew" });
  return userState.get(id);
};

// ================== UTILS ==================
const normalize = (t) =>
  t
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
    .replace(/,/g, "");

const nf = (l) =>
  new Intl.NumberFormat(l === "ar" ? "ar-SY" : "en-US", {
    maximumFractionDigits: 2,
  });

async function loadRates() {
  const r = await fetch(
    "https://raw.githubusercontent.com/laithi/lira-telegram-bot/main/rates.json"
  );
  return r.json();
}

// ================== CORE ==================
function calculate(mode, amount) {
  const oldToNew = mode === "oldToNew";
  const res = oldToNew ? amount / RATE : amount * RATE;
  const denoms = oldToNew ? DENOMS_NEW : DENOMS_OLD;

  let rem = res;
  const dist = [];
  for (const d of denoms) {
    const c = Math.floor(rem / d.v);
    if (c > 0) {
      dist.push({ ...d, c });
      rem = Math.round((rem - c * d.v) * 100) / 100;
    }
  }
  return { res, rem, oldToNew, dist };
}

// === FIXED FX LOGIC ===
// always convert via NEW lira (zeros removed)
function fxFromNew(newAmount, rates) {
  const out = [];
  for (const c of FX_ORDER) {
    const midOld = rates?.rates?.[c]?.mid;
    if (!midOld) continue;
    const midNew = midOld / 100; // remove cancelled zeros
    out.push({
      c,
      v: newAmount / midNew,
    });
  }
  return out;
}

// ================== BOT ==================
bot.start((ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];
  ctx.replyWithMarkdown(`*${t.title}*\n${t.subtitle}`);
});

bot.on("text", async (ctx) => {
  const s = getUS(ctx.from.id);
  const t = TRANSLATIONS[s.lang];
  const amount = Number(normalize(ctx.message.text));
  if (!amount) return;

  const calc = calculate(s.mode, amount);

  // NEW lira base for FX
  const newBase = calc.oldToNew ? calc.res : amount;

  const rates = await loadRates();
  const fx = fxFromNew(newBase, rates);

  let msg = `*${t.title}*\n${t.subtitle}\n\n`;
  msg += `• ${t.input}: *${nf(s.lang).format(amount)}* ${
    calc.oldToNew ? t.old : t.neu
  }\n`;
  msg += `• ${t.eq}: *${nf(s.lang).format(calc.res)}* ${
    calc.oldToNew ? t.neu : t.old
  }\n\n`;

  msg += `*${t.dist}*\n${
    calc.oldToNew ? t.distNew : t.distOld
  }\n\n`;
  calc.dist.forEach((d) => {
    msg += `${d.s} ${d.v} - ${d.n[s.lang]} × ${d.c}\n`;
  });

  if (calc.rem > 0) {
    msg += `\n*${t.change}*\n`;
    if (calc.oldToNew)
      msg += `بقي ${nf(s.lang).format(calc.rem)} ${t.neu}\n`;
    else msg += `Remaining ${nf(s.lang).format(calc.rem)} ${t.old}\n`;
  }

  msg += `\n*${t.fx}*\n\n`;
  fx.forEach((f) => {
    msg += `${FX_FLAGS[f.c]} ${f.c} ${f.v.toFixed(2)}\n`;
  });

  msg += `\n${t.send}`;

  ctx.replyWithMarkdown(msg);
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    return res.status(200).send("ok");
  }
  res.status(200).send("ok");
    }
