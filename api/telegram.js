import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
// رابط الـ Mini App هو رابط الاستضافة الخاص بك على Vercel
const WEBAPP_URL = process.env.WEBAPP_URL; 

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN env var");

const bot = new Telegraf(BOT_TOKEN);

// دالة لإنشاء لوحة المفاتيح المدمجة التي تظهر دائماً
const getMainKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.webApp("فتح التطبيق المصغر 📱", WEBAPP_URL)],
    [
      Markup.button.callback("🇸🇾 عربي", "lang_ar"),
      Markup.button.callback("🇺🇸 English", "lang_en")
    ]
  ]);
};

// عند كتابة /start
bot.start((ctx) => {
  return ctx.replyWithMarkdown(
    "أهلاً بك في *دليل الليرة السورية*.\n\nيمكنك استخدام التطبيق المصغر لتجربة حسابية أفضل، أو إرسال أي مبلغ هنا مباشرة.",
    getMainKeyboard()
  );
});

// معالجة المبالغ المرسلة كنص (البوت العادي)
bot.on("text", async (ctx) => {
  const text = ctx.message.text.replace(/,/g, "");
  const amount = parseFloat(text);

  if (isNaN(amount)) {
    return ctx.reply("الرجاء إرسال أرقام فقط (مثال: 50000) 🙏", getMainKeyboard());
  }

  // مثال سريع للحساب (100 قديم = 1 جديد)
  const result = (amount / 100).toFixed(2);
  
  return ctx.replyWithMarkdown(
    `المبلغ: *${amount}* ل.س قديمة\nالمعادل: *${result}* ليرة جديدة`,
    getMainKeyboard()
  );
});

// التعامل مع طلبات Vercel
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
}
