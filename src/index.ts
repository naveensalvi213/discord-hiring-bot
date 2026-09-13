import dotenv from 'dotenv';
dotenv.config();

import { Client } from 'discord.js-selfbot-v13';
import { startHealthCheckServer } from './server';
import { MessageCache } from './utils/cache';
import { GeminiJobClassifier } from './ai/classifier';
import { TelegramNotifier } from './telegram/bot';

// Validate Environment Variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHANNEL_IDS_RAW = process.env.CHANNEL_IDS || '';
const PORT = parseInt(process.env.PORT || '3000', 10);

if (!DISCORD_TOKEN || !GEMINI_API_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('[Error] Missing required environment variables! Check your .env file.');
  process.exit(1);
}

const targetChannelIds = new Set(
  CHANNEL_IDS_RAW.split(',').map(id => id.trim()).filter(id => id.length > 0)
);

console.log(`[Config] Target Monitored Channels Count: ${targetChannelIds.size}`);

// Initialize Services
startHealthCheckServer(PORT);
const cache = new MessageCache(1000);
const classifier = new GeminiJobClassifier(GEMINI_API_KEY);
const telegram = new TelegramNotifier(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
const client = new Client();

client.on('ready', () => {
  console.log(`[Discord] Authenticated as user: ${client.user?.tag} (${client.user?.id})`);
  console.log('[Discord] Real-time hiring post monitor active 24/7!');
});

client.on('messageCreate', async (message) => {
  try {
    const channelId = message.channel.id;
    const parentId = 'parentId' in message.channel ? (message.channel as any).parentId : null;

    // Check if channel or parent forum channel matches target list
    const isTargetChannel = targetChannelIds.has(channelId) || (parentId && targetChannelIds.has(parentId));
    if (!isTargetChannel) return;

    // Deduplication check
    if (cache.has(message.id)) return;
    cache.add(message.id);

    const authorTag = message.author.tag || message.author.username;
    const channelName = 'name' in message.channel ? (message.channel as any).name : 'channel';
    const content = message.content;

    if (!content || content.trim().length === 0) return;

    console.log(`[Discord] New message in #${channelName} from ${authorTag}. Evaluating with Gemini...`);

    // AI Classification
    const result = await classifier.classify(content, authorTag, channelName);

    if (result.is_hiring) {
      console.log(`[Gemini] ✅ Approved HIRING post by ${authorTag}! Dispatched to Telegram.`);
      const guildId = message.guild?.id || '@me';
      const discordUrl = `https://discord.com/channels/${guildId}/${channelId}/${message.id}`;
      await telegram.sendHiringAlert(result, discordUrl, authorTag, channelName);
    } else {
      console.log(`[Gemini] ℹ️ Post by ${authorTag} evaluated as NOT hiring (${result.reasoning || 'No hiring match'}). Ignored.`);
    }
  } catch (err) {
    console.error('[Error] Error processing Discord message:', err);
  }
});

client.login(DISCORD_TOKEN).catch(err => {
  console.error('[Discord] Login failed:', err);
});
