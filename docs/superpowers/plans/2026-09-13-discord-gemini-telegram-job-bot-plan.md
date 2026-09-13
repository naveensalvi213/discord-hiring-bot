# Discord to Telegram Hiring Alert Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js TypeScript application that monitors 38 Discord channels/forum threads 24/7 via a Discord User Token, evaluates posts for hiring opportunities using Google Gemini 2.5 Flash, and dispatches detailed alerts to Telegram with direct deep-links. Ready for Render 24/7 deployment.

**Architecture:** Discord selfbot listener (`discord.js-selfbot-v13`) captures new messages and thread posts, filters by target channel IDs, passes text content to Gemini AI (`@google/genai`), and forwards approved hiring posts to Telegram (`node-telegram-bot-api`). An Express health check server (`GET /health`) runs concurrently for Render uptime monitoring.

**Tech Stack:** Node.js, TypeScript, `discord.js-selfbot-v13`, `@google/genai`, `node-telegram-bot-api`, `express`, `dotenv`, `tsx`.

## Global Constraints
- `DISCORD_TOKEN`: Discord User Account Token (Selfbot).
- `CHANNEL_IDS`: List of target channel/forum IDs to monitor.
- `GEMINI_API_KEY`: API Key for Google Gemini (`gemini-2.5-flash`).
- `TELEGRAM_BOT_TOKEN`: Bot token from @BotFather.
- `TELEGRAM_CHAT_ID`: Destination Telegram chat/channel ID.
- `PORT`: Health check HTTP port (default `3000`).

---

### Task 1: Project Setup & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.env`
- Create: `.gitignore`
- Create: `render.yaml`

**Interfaces:**
- Produces: Base configuration and node dependencies for the project.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "discord-gemini-telegram-job-bot",
  "version": "1.0.0",
  "description": "24/7 Discord hiring job monitor powered by Gemini AI and Telegram",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@google/genai": "^0.1.2",
    "discord.js-selfbot-v13": "^13.15.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "node-telegram-bot-api": "^0.66.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "@types/node-telegram-bot-api": "^0.64.6",
    "typescript": "^5.4.5",
    "tsx": "^4.7.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `.gitignore`, `.env.example`, `.env`, and `render.yaml`**

```gitignore
node_modules
dist
.env
*.log
```

---

### Task 2: Health Check Web Server

**Files:**
- Create: `src/server.ts`

**Interfaces:**
- Produces: `startHealthCheckServer(port: number): ExpressServer`

- [ ] **Step 1: Create `src/server.ts`**

```typescript
import express from 'express';

export function startHealthCheckServer(port: number = 3000) {
  const app = express();
  const startTime = Date.now();

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    });
  });

  const server = app.listen(port, () => {
    console.log(`[HealthCheck] Server running on port ${port}`);
  });

  return server;
}
```

---

### Task 3: In-Memory Deduplication Cache

**Files:**
- Create: `src/utils/cache.ts`

**Interfaces:**
- Produces: `MessageCache` class with `has(id: string): boolean` and `add(id: string): void`.

- [ ] **Step 1: Create `src/utils/cache.ts`**

```typescript
export class MessageCache {
  private cache: Set<string>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Set();
    this.maxSize = maxSize;
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  add(id: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.values().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.add(id);
  }
}
```

---

### Task 4: Gemini AI Hiring Classifier

**Files:**
- Create: `src/ai/classifier.ts`

**Interfaces:**
- Produces: `JobClassification` interface and `classifyJobPost(content: string, author: string, channelName: string): Promise<JobClassification>`

- [ ] **Step 1: Create `src/ai/classifier.ts`**

```typescript
import { GoogleGenAI, Type } from '@google/genai';

export interface JobClassification {
  is_hiring: boolean;
  job_title?: string;
  company_or_project?: string;
  job_type?: string;
  location_remote?: string;
  salary_budget?: string;
  required_skills?: string[];
  summary?: string;
  contact_info?: string;
  reasoning?: string;
}

export class GeminiJobClassifier {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async classify(content: string, author: string, channelName: string): Promise<JobClassification> {
    if (!content || content.trim().length < 10) {
      return { is_hiring: false, reasoning: 'Content too short' };
    }

    const prompt = `
Analyze the following post from Discord channel #${channelName} (author: ${author}).
Determine if this post is an active HIRING opening (an employer/project owner offering work, hiring freelancers, or recruiting employees).

CRITICAL DISTINCTION:
- IS HIRING (is_hiring = true): "Looking for a React developer", "Hiring fullstack engineer", "Need a designer for project", "Paying $50/hr for logo design".
- NOT HIRING (is_hiring = false): "I am looking for work", "For Hire: Fullstack Dev available", "Check out my portfolio", general chatter, self-promotion.

Post content:
"""
${content}
"""
`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_hiring: { type: Type.BOOLEAN, description: 'True ONLY if the poster is offering work/hiring someone' },
              job_title: { type: Type.STRING, description: 'Job title or role name' },
              company_or_project: { type: Type.STRING, description: 'Company or project name if available' },
              job_type: { type: Type.STRING, description: 'Full-time, Part-time, Contract, Freelance, One-time task' },
              location_remote: { type: Type.STRING, description: 'Remote, hybrid, or specific location' },
              salary_budget: { type: Type.STRING, description: 'Salary or budget details' },
              required_skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Extracted key skills/stack' },
              summary: { type: Type.STRING, description: '2-3 sentence clean summary of what the employer needs' },
              contact_info: { type: Type.STRING, description: 'How to apply/contact (Discord DM, email, link)' },
              reasoning: { type: Type.STRING, description: 'Brief explanation of decision' }
            },
            required: ['is_hiring']
          }
        }
      });

      const text = response.text;
      if (!text) {
        return { is_hiring: false, reasoning: 'Empty response from Gemini' };
      }

      return JSON.parse(text) as JobClassification;
    } catch (error) {
      console.error('[Gemini] Error during classification:', error);
      return { is_hiring: false, reasoning: `Gemini error: ${error}` };
    }
  }
}
```

---

### Task 5: Telegram Dispatcher

**Files:**
- Create: `src/telegram/bot.ts`

**Interfaces:**
- Produces: `TelegramNotifier` class with `sendHiringAlert(job: JobClassification, discordUrl: string, author: string, channelName: string): Promise<void>`

- [ ] **Step 1: Create `src/telegram/bot.ts`**

```typescript
import TelegramBot from 'node-telegram-bot-api';
import { JobClassification } from '../ai/classifier';

export class TelegramNotifier {
  private bot: TelegramBot;
  private chatId: string;

  constructor(token: string, chatId: string) {
    this.bot = new TelegramBot(token, { polling: false });
    this.chatId = chatId;
  }

  async sendHiringAlert(
    job: JobClassification,
    discordUrl: string,
    author: string,
    channelName: string
  ): Promise<void> {
    const title = job.job_title || 'New Job Opportunity';
    const company = job.company_or_project ? `\n🏢 <b>Company/Project:</b> ${this.escapeHtml(job.company_or_project)}` : '';
    const jobType = job.job_type ? `\n💼 <b>Role Type:</b> ${this.escapeHtml(job.job_type)}` : '';
    const location = job.location_remote ? `\n🌍 <b>Location:</b> ${this.escapeHtml(job.location_remote)}` : '';
    const salary = job.salary_budget ? `\n💰 <b>Budget/Salary:</b> ${this.escapeHtml(job.salary_budget)}` : '';
    const skills = job.required_skills && job.required_skills.length > 0
      ? `\n⚡ <b>Required Skills:</b> ${job.required_skills.map(s => `<code>${this.escapeHtml(s)}</code>`).join(', ')}`
      : '';
    const summary = job.summary ? `\n\n📝 <b>Summary:</b>\n${this.escapeHtml(job.summary)}` : '';
    const contact = job.contact_info ? `\n\n📩 <b>Contact:</b> ${this.escapeHtml(job.contact_info)}` : '';

    const message = `🚨 <b>NEW HIRING POST APPROVED</b> 🚨\n\n` +
      `📌 <b>Role:</b> ${this.escapeHtml(title)}` +
      `${company}${jobType}${location}${salary}${skills}` +
      `\n👤 <b>Posted By:</b> ${this.escapeHtml(author)} in #${this.escapeHtml(channelName)}` +
      `${summary}${contact}`;

    await this.bot.sendMessage(this.chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Open Post in Discord',
              url: discordUrl
            }
          ]
        ]
      }
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
```

---

### Task 6: Main Entry Point & Discord Listener Orchestrator

**Files:**
- Create: `src/index.ts`

**Interfaces:**
- Orchestrates Discord Client (`discord.js-selfbot-v13`), Gemini Classifier, Telegram Notifier, and Express Health Server.

- [ ] **Step 1: Create `src/index.ts`**

```typescript
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
    // Ignore self messages
    if (message.author.id === client.user?.id) return;

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

    console.log(`[Discord] New message in #${channelName} from ${authorTag}. Evaluating with Gemini...`);

    // AI Classification
    const result = await classifier.classify(content, authorTag, channelName);

    if (result.is_hiring) {
      console.log(`[Gemini] ✅ Approved HIRING post by ${authorTag}! Dispatched to Telegram.`);
      const guildId = message.guild?.id || '@me';
      const discordUrl = `https://discord.com/channels/${guildId}/${channelId}/${message.id}`;
      await telegram.sendHiringAlert(result, discordUrl, authorTag, channelName);
    } else {
      console.log(`[Gemini] ℹ️ Post by ${authorTag} evaluated as NOT hiring (${result.reasoning}). Ignored.`);
    }
  } catch (err) {
    console.error('[Error] Error processing Discord message:', err);
  }
});

client.login(DISCORD_TOKEN).catch(err => {
  console.error('[Discord] Login failed:', err);
});
```

---

### Task 7: Project Building & Verification

- [ ] **Step 1: Install dependencies**
Run `npm install`

- [ ] **Step 2: Build TypeScript**
Run `npm run build`

- [ ] **Step 3: Verify output**
Ensure `dist/index.js` is created clean without compilation errors.
