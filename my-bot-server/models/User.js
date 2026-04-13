import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    pcName: String,
    cpuUsage: Number,
    ramFree: Number,
    lastUpdate: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);