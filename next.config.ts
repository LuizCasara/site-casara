import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    // Environment variables that will be available at runtime
    env: {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        TELEGRAM_THREAD_ID: process.env.TELEGRAM_THREAD_ID,
    }
};

export default nextConfig;
