import express from 'express';
import mongoose from 'mongoose';
import { Telegraf } from 'telegraf';
import 'dotenv/config';

// Models import karenge (abhi banayenge)
import { User } from './models/User.js';

const app = express();
app.use(express.json()); // JSON data receive karne ke liye

const bot = new Telegraf(process.env.BOT_TOKEN);
// An empty object to store pairing codes
let pairingCodes = {};

// 1. MongoDB Cloud Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Cloud MongoDB Atlas Connected!"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// -----------------------------------------
// 2. API ENDPOINT (Yahan Agent data bhejega)
// -----------------------------------------
app.post('/update-stats', async (req, res) => {
    try {
        const { telegramId, pcName, cpuUsage, ramFree } = req.body;

        // User ka data update karo ya naya banao (Upsert)
        const updatedUser = await User.findOneAndUpdate(
            { telegramId: telegramId },
            {
                pcName,
                cpuUsage,
                ramFree,
                lastUpdate: new Date()
            },
            { upsert: true, new: true }
        );

        console.log(`📊 Data updated for: ${pcName}`);
        res.status(200).send("Success");
    } catch (error) {
        res.status(500).send("Error updating stats");
    }
});

app.get('/verify/:code', (req, res) => {
    const code = req.params.code;
    if (pairingCodes[code]) {
        res.json({ telegramId: pairingCodes[code] });
        delete pairingCodes[code]; // Ek baar use hone ke baad khatam
    } else {
        res.status(400).send("Invalid Code");
    }
});

app.get("/", (req, res) => {
    res.send("Bot is Alive and Kicking! 🚀");
});

// -----------------------------------------
// 3. TELEGRAM BOT (Status check karne ke liye)
// -----------------------------------------
bot.command('status', async (ctx) => {
    const userId = ctx.chat.id.toString();

    // Database se sirf IS USER ka data nikaalo
    const userData = await User.findOne({ telegramId: userId });

    if (!userData) {
        return ctx.reply("Bhai, tera koi PC registered nahi hai. Agent script chalao!");
    }

    const msg = `🖥️ <b>PC Name:</b> ${userData.pcName}\n` +
        `🔥 <b>CPU:</b> ${userData.cpuUsage}%\n` +
        `🧠 <b>RAM Free:</b> ${userData.ramFree} GB\n` +
        `🕒 <b>Last Sync:</b> ${userData.lastUpdate.toLocaleTimeString()}`;

    ctx.reply(msg, { parse_mode: "HTML" }); // Markdown ki jagah HTML!
});

// Bot command code generate karne ke liye
bot.command('add', (ctx) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit random code
    pairingCodes[code] = ctx.chat.id.toString(); // Code ko User ID se link kar diya

    ctx.reply(`Tera Pairing Code hai: ${code}\n\nIsko Agent script mein daal de. Ye 5 min mein expire ho jayega!`);

    // 5 min baad code delete kar do (Security)
    setTimeout(() => { delete pairingCodes[code]; }, 300000);
});

bot.launch();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});