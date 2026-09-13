# Discord to Telegram Hiring Alert Bot — Design Document

## 1. Overview
An automated 24/7 service deployed on Render that monitors specified Discord text channels and forum threads in real-time using a Discord User Account Token. When new content is posted, it evaluates the content using Google Gemini AI to determine if it is a **Hiring Job Opening**. Approved hiring posts are instantly formatted and dispatched to a Telegram Chat via a Telegram Bot, complete with extracted job details and a direct deep-link to open the post in the Discord application.

## 2. Tech Stack & Dependencies
- **Runtime**: Node.js (v18+ or v20+) with TypeScript
- **Discord Integration**: `discord.js-selfbot-v13` (supports user tokens, thread monitoring, forum channels)
- **AI Classification**: `@google/genai` (Google Gen AI SDK using `gemini-2.5-flash`)
- **Telegram Dispatcher**: `node-telegram-bot-api`
- **Health Check Web Server**: `express` (presents HTTP `GET /health` endpoint for Render uptime monitoring)
- **Environment Management**: `dotenv`

## 3. System Architecture & Components

```
+------------------------+      +-------------------------+
| Discord Server Channels | ---> | Discord Listener        |
| & Forum Threads        |      | (discord.js-selfbot-v13)|
+------------------------+      +-------------------------+
                                             |
                                             v
                                +-------------------------+
                                | Message Extractor &     |
                                | Deduplication Cache     |
                                +-------------------------+
                                             |
                                             v
                                +-------------------------+
                                | Gemini AI Classifier    |
                                | (@google/genai)         |
                                +-------------------------+
                                             |
                                     (is_hiring == true)
                                             |
                                             v
                                +-------------------------+
                                | Telegram Dispatcher     |
                                | (node-telegram-bot-api) |
                                +-------------------------+
                                             |
                                             v
                                +-------------------------+
                                | Telegram Chat/Channel   |
                                +-------------------------+
```

### Component Details

1. **Discord Listener (`src/discord/listener.ts`)**:
   - Authenticates via `DISCORD_TOKEN` (User Token).
   - Monitors `messageCreate` events across text channels and `threadCreate` events for forum posts.
   - Filters events by checking if `channel.id` or `channel.parentId` matches any ID in `CHANNEL_IDS`.
   - Prevents self-triggering (ignores messages authored by the self-bot's own user ID).

2. **Deduplication Engine (`src/utils/cache.ts`)**:
   - Uses an in-memory LRU cache storing the last 1,000 processed message IDs to prevent duplicate notifications if messages are edited or re-triggered.

3. **Gemini Classifier (`src/ai/classifier.ts`)**:
   - Sends the post content, author info, and channel context to Gemini (`gemini-2.5-flash`).
   - Forces structured JSON response format:
     ```json
     {
       "is_hiring": true,
       "job_title": "Fullstack Developer",
       "company_or_project": "Acme Inc / Stealth Startup",
       "job_type": "Full-time / Part-time / Contract / Freelance",
       "location_remote": "Remote / Worldwide",
       "salary_budget": "$4,000 - $6,000 / month",
       "required_skills": ["Node.js", "TypeScript", "React"],
       "summary": "Looking for a senior fullstack developer to build Discord bots...",
       "contact_info": "DM on Discord or email jobs@example.com"
     }
     ```
   - Uses system instructions to strictly distinguish between **Hiring / Offering a Job** vs **For Hire / Seeking Work** vs General Discussion.

4. **Telegram Dispatcher (`src/telegram/bot.ts`)**:
   - Formats approved job openings into a clean, modern Telegram HTML / MarkdownV2 message.
   - Constructs direct Discord app deep-links: `https://discord.com/channels/{guild_id}/{channel_id}/{message_id}`.
   - Adds an inline keyboard button `[ 🚀 Open in Discord ]`.

5. **Express Health Check Server (`src/server.ts`)**:
   - Binds to `process.env.PORT || 3000`.
   - Serves `GET /health` returning status JSON `{ status: "ok", uptime: seconds, monitoredChannels: count }`.
   - Keeps Render Web Service active and responsive.

## 4. Configuration & Security
- Sensitive credentials (`DISCORD_TOKEN`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) stored strictly in local `.env` and Render Environment Variables.
- `.env` excluded from version control via `.gitignore`.
- `.env.example` provided for reference.

## 5. Deployment Strategy (Render 24/7)
- **Service Type**: Render Web Service
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- `render.yaml` provided for automated Blueprint deployment.
