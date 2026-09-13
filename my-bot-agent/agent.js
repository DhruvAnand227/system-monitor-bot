const si = require('systeminformation');
const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(process.cwd(), 'config.json');
const BASE_URL = "https://my-system-monitor-api.onrender.com";

const ask = (query) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
};

async function startAgent() {
    let config;

    if (fs.existsSync(CONFIG_FILE)) {
        try {
            config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        } catch (e) {
            console.log("⚠️ Corrupted config detected. Removing...");
            fs.unlinkSync(CONFIG_FILE);
        }
    }

    if (!config) {
        try {
            const otp = await ask("Enter the OTP from bot: ");
            console.log("⏳ Verifying OTP with server...");
            
            const res = await axios.get(`${BASE_URL}/verify/${otp.trim()}`);
            
            config = { telegramId: res.data.telegramId };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            console.log("✅ PC Paired Successfully!");
        } catch (err) {
            console.log("❌ OTP Verification Failed:", err.response?.data?.message || err.message);
            pauseAndExit();
            return;
        }
    }

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

function pauseAndExit() {
    console.log("Press any key to exit...");
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(1));
}

process.on('uncaughtException', (err) => {
    console.error('❌ Agent Fatal Error:', err.message);
    pauseAndExit();
});

startAgent().catch(err => {
    console.error("❌ Startup Error:", err.message);
    pauseAndExit();
});