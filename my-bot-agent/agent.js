import si from 'systeminformation';
import axios from 'axios';
import readline from 'readline';
import fs from 'fs';

const CONFIG_FILE = './config.json';
const BASE_URL = "https://my-system-monitor-api.onrender.com"; // Tera Render URL

const ask = (query) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
};

async function startAgent() {
    let config;

    if (fs.existsSync(CONFIG_FILE)) {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    } else {
        try {
            const otp = await ask("Enter the OTP from bot: ");
            console.log("⏳ Verifying OTP with server...");
            
            const res = await axios.get(`${BASE_URL}/verify/${otp.trim()}`);
            
            config = { telegramId: res.data.telegramId };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            console.log("✅ PC Paired Successfully!");
        } catch (err) {
            console.log("❌ OTP Verification Failed:", err.response?.data?.message || err.message);
            console.log("Press any key to exit...");
            process.stdin.setRawMode?.(true);
            process.stdin.resume();
            process.stdin.on('data', () => process.exit(1));
            return;
        }
    }

    // Pehle immediate sync, phir interval
    await syncStats(config.telegramId);

    setInterval(() => {
        syncStats(config.telegramId);
    }, 60000);
}

async function syncStats(telegramId) {
    try {
        const cpu = await si.currentLoad();
        const ram = await si.mem();
        const os = await si.osInfo();

        await axios.post(`${BASE_URL}/update-stats`, {
            telegramId: telegramId,
            pcName: os.hostname,
            cpuUsage: Math.round(cpu.currentLoad),
            ramFree: (ram.free / (1024 ** 3)).toFixed(2)
        });
        console.log(`[${new Date().toLocaleTimeString()}] 📊 Stats Synced!`);
    } catch (err) {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Sync Failed:`, err.message);
    }
}

// Global Safety Net (Double Click par window immediate close na hone ke liye)
process.on('uncaughtException', (err) => {
    console.error('❌ Agent Fatal Error:', err.message);
    console.log('Press any key to exit...');
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(1));
});

// Async wrapper Execution
startAgent().catch(err => {
    console.error("❌ Startup Error:", err.message);
});