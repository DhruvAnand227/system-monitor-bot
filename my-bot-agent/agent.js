import si from 'systeminformation';
import axios from 'axios';
import readline from 'readline';
import fs from 'fs';

const CONFIG_FILE = './config.json'; // 👈 Fix 1: Simple path
const BASE_URL = "https://my-system-monitor-api.onrender.com"; // 👈 Fix 2: Sirf main link

const ask = (query) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
};

async function startAgent() {
    let config;

    if (fs.existsSync(CONFIG_FILE)) {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    } else {
        // 👈 Fix 3: Try-Catch lagaya taaki wrong OTP pe crash na ho
        try {
            const otp = await ask("Enter the OTP from bot: ");
            const res = await axios.get(`${BASE_URL}/verify/${otp}`); // Sahi URL
            
            config = { telegramId: res.data.telegramId };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config));
            console.log("✅ PC Paired Successfully!");
        } catch (err) {
            console.log("❌ Galat OTP ya Server Error! Dobara run karo.");
            process.exit(1); // Script band kar do
        }
    }

    setInterval(async () => {
        try {
            const cpu = await si.currentLoad();
            const ram = await si.mem();
            const os = await si.osInfo();

            await axios.post(`${BASE_URL}/update-stats`, { // Sahi URL
                telegramId: config.telegramId,
                pcName: os.hostname,
                cpuUsage: Math.round(cpu.currentLoad),
                ramFree: (ram.free / (1024 ** 3)).toFixed(2)
            });
            console.log("📊 Stats Synced!");
        } catch (err) {
            console.log("❌ Sync Failed:", err.message);
        }
    }, 60000);
}

startAgent();