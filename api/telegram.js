import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_SECRET;

const bot = new Telegraf(BOT_TOKEN);

// كود البوت (start, on text, etc.)
bot.start((ctx) => {
  ctx.reply("أهلاً بك! اضغط على الزر لفتح التطبيق:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "فتح دليل الليرة 📱", web_app: { url: "https://lira-telegram-bot.vercel.app/" } }]
      ]
    }
  });
});

// معالج الطلبات (Handler)
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      if (TELEGRAM_SECRET && req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_SECRET) {
        return res.status(401).send("Unauthorized");
      }
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    } catch (err) {
      console.error(err);
      return res.status(500).send("Error");
    }
  } else {
    // في حال تم فتح الرابط الخاص بالـ API عن طريق الخطأ في المتصفح
    res.status(200).send("Bot API is active.");
  }
}
