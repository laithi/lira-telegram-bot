import { Telegraf, Markup } from "telegraf";

// تأكد من ضبط هذه القيم في إعدادات Vercel (Environment Variables)
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL; 

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing!");

const bot = new Telegraf(BOT_TOKEN);

// إنشاء زر فتح التطبيق المصغر
const mainKeyboard = Markup.inlineKeyboard([
  [Markup.button.webApp("فتح دليل الليرة 📱", WEBAPP_URL)],
  [Markup.button.url("قناة التحديثات 📢", "https://t.me/SyrianLiraGuide")]
]);

// الاستجابة لأمر البداية
bot.start((ctx) => {
  return ctx.replyWithMarkdown(
    "أهلاً بك في *دليل الليرة السورية الجديد*.\n\nاستخدم التطبيق المصغر للحصول على حسابات دقيقة وتوزيع الفئات النقدية، أو أرسل المبلغ هنا مباشرة.",
    mainKeyboard
  );
});

// معالجة الرسائل النصية لتحويل العملة في الشات مباشرة
bot.on("text", async (ctx) => {
  const input = ctx.message.text.replace(/,/g, "");
  const amount = parseFloat(input);

  if (isNaN(amount)) {
    return ctx.reply("الرجاء إرسال أرقام فقط (مثال: 5000).", mainKeyboard);
  }

  const result = (amount / 100).toLocaleString();
  return ctx.replyWithMarkdown(
    `المبلغ: *${amount.toLocaleString()}* ل.س قديمة\nالمعادل: *${result}* ليرة جديدة`,
    mainKeyboard
  );
});

// تصدير المعالج لبيئة Vercel
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send("OK");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error");
    }
  } else {
    res.status(200).send("Bot server is running.");
  }
}
