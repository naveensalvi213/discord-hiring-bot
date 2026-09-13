# Flutter Mobile App — Gemini AI Assistant & Live Job Monitor Design

## 1. Overview
A cross-platform Flutter native mobile application (iOS & Android) that connects to the Discord Hiring Monitor service. It provides a real-time live feed of all detected job postings, an interactive Gemini AI Chat Assistant where you can issue natural language commands to control the system, and a real-time live activity stream showing bot operations in real-time.

## 2. Tech Stack
- **Framework**: Flutter (Dart)
- **State Management**: Provider / Riverpod / Flutter Hooks
- **Backend / Real-time Sync**: Firebase Realtime Database / WebSockets API
- **AI Integration**: Google Gemini API (`google_generative_ai` Flutter SDK)
- **UI Components**: Modern dark-themed Material 3 design system with custom Glassmorphism cards, dynamic status badges, and smooth tab navigation.

## 3. Core Screens & UI Modules

### Screen 1: 💬 Gemini AI Assistant (Interactive Chat)
- Chat interface directly powered by Gemini 2.5 Flash.
- Instruct Gemini:
  * *"Show me all Remote Senior React jobs found today"*
  * *"Filter out low budget jobs under $2,000"*
  * *"Summarize top 5 jobs in Python"*
  * *"Add channel ID 1234567890 to monitoring"*
- Custom system prompt aware of the current job database and bot parameters.

### Screen 2: 📋 Live Hiring Posts Feed
- Infinite scroll card feed of all approved job postings.
- Filter by: Role Type (Full-Time, Contract, Freelance), Remote status, Date.
- Card Details: Job Title, Company/Project, Salary/Budget, Skills Tags, Summary, Posted By, Time.
- Action Buttons:
  * `[ 🚀 Open in Discord App ]` (Deep-links directly to message)
  * `[ 📤 Share to Telegram / WhatsApp ]`
  * `[ ⭐ Save Job ]`

### Screen 3: 🔴 Live Bot Operations & Real-Time Logs
- Real-time WebSocket connection to the Node.js backend.
- Displays live status:
  * 🟢 Bot Status: `ONLINE 24/7`
  * 📡 Monitored Channels: `38 Channels Active`
  * ⏱️ Uptime counter
- Live terminal/log stream:
  * `13:50:01 [Discord] Message received in #hiring`
  * `13:50:02 [Gemini] Evaluating text with Gemini 2.5 Flash...`
  * `13:50:03 [Gemini] ✅ Approved HIRING post`
  * `13:50:03 [Telegram] Alert dispatched`

### Screen 4: ⚙️ Bot Settings & Channels Manager
- List of all 38 monitored Discord channels with toggle switches.
- One-click **"Add New Channel"** dialog.
- Telegram Bot Token & Chat ID verification.

## 4. Backend Integration API

The Node.js backend (`src/server.ts` & `src/index.ts`) will be extended to expose WebSocket / SSE (Server-Sent Events) and REST endpoints:
- `GET /api/jobs`: Returns recent hiring posts JSON.
- `GET /api/logs`: Real-time SSE stream of bot console events.
- `POST /api/settings`: Update target channel IDs dynamically.
