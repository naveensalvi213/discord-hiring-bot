import express from 'express';
import { JobClassification, GeminiJobClassifier } from './ai/classifier';

export interface ApprovedJobItem {
  id: string;
  job: JobClassification;
  discordUrl: string;
  author: string;
  channelName: string;
  timestamp: string;
}

const jobsList: ApprovedJobItem[] = [];
const logsList: string[] = [];
const MAX_ITEMS = 200;

export function logEvent(message: string) {
  const logEntry = `[${new Date().toISOString()}] ${message}`;
  console.log(logEntry);
  if (logsList.length >= MAX_ITEMS) {
    logsList.shift();
  }
  logsList.push(logEntry);
}

export function addApprovedJob(
  job: JobClassification,
  discordUrl: string,
  author: string,
  channelName: string
) {
  const item: ApprovedJobItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    job,
    discordUrl,
    author,
    channelName,
    timestamp: new Date().toISOString()
  };

  if (jobsList.length >= MAX_ITEMS) {
    jobsList.shift();
  }
  jobsList.unshift(item);
}

const MOBILE_APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Discord Hiring Monitor & Gemini AI</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0f172a">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f17;
      --bg-card: #161e2e;
      --bg-card-hover: #1f293d;
      --accent-purple: #8b5cf6;
      --accent-blue: #3b82f6;
      --accent-green: #10b981;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --border-color: #27354a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background-color: var(--bg-primary); color: var(--text-main); display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    header { background: rgba(22, 30, 46, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-color); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 34px; height: 34px; background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue)); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .brand-title { font-weight: 700; font-size: 16px; letter-spacing: -0.3px; }
    .status-badge { background: rgba(16, 185, 129, 0.15); color: var(--accent-green); border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 7px; height: 7px; background-color: var(--accent-green); border-radius: 50%; box-shadow: 0 0 8px var(--accent-green); animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    main { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; }
    .tab-content { display: none; flex-direction: column; gap: 14px; height: 100%; }
    .tab-content.active { display: flex; }
    .job-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .job-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .job-role { font-size: 16px; font-weight: 700; color: #ffffff; }
    .job-time { font-size: 11px; color: var(--text-muted); }
    .job-meta { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge { background: rgba(139, 92, 246, 0.12); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.25); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; }
    .badge-green { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); }
    .job-summary { font-size: 13px; color: var(--text-muted); line-height: 1.5; }
    .job-contact { font-size: 12px; color: #cbd5e1; background: rgba(15, 23, 42, 0.6); padding: 8px 12px; border-radius: 8px; }
    .btn-discord { background: linear-gradient(135deg, #5865F2, #4752C4); color: white; text-decoration: none; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .chat-container { display: flex; flex-direction: column; height: 100%; }
    .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-bottom: 12px; }
    .message { max-width: 85%; padding: 12px 14px; border-radius: 14px; font-size: 14px; line-height: 1.4; }
    .message-user { align-self: flex-end; background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue)); color: white; border-bottom-right-radius: 4px; }
    .message-bot { align-self: flex-start; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); border-bottom-left-radius: 4px; }
    .chat-input-bar { display: flex; gap: 8px; padding-top: 8px; }
    .chat-input { flex: 1; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px; color: white; font-size: 14px; outline: none; }
    .btn-send { background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue)); border: none; color: white; width: 44px; height: 44px; border-radius: 12px; font-size: 18px; cursor: pointer; }
    .log-terminal { background: #030712; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; font-family: monospace; font-size: 12px; color: #34d399; height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    nav { background: rgba(22, 30, 46, 0.95); backdrop-filter: blur(12px); border-top: 1px solid var(--border-color); display: flex; justify-content: space-around; padding: 8px 0; }
    .nav-btn { background: none; border: none; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; cursor: pointer; width: 33%; }
    .nav-btn.active { color: #a78bfa; }
    .nav-icon { font-size: 20px; }
    .empty-state { text-align: center; color: var(--text-muted); margin: auto 0; padding: 20px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">⚡</div>
      <div class="brand-title">Hiring Monitor</div>
    </div>
    <div class="status-badge">
      <div class="status-dot"></div>
      <span>24/7 Active</span>
    </div>
  </header>
  <main>
    <div id="tab-jobs" class="tab-content active">
      <div id="jobs-container" style="display: flex; flex-direction: column; gap: 12px;">
        <div class="empty-state">
          <p>📡 Listening to 38 Discord channels...</p>
          <p style="font-size: 12px; margin-top: 6px;">New hiring posts will appear here in real-time!</p>
        </div>
      </div>
    </div>
    <div id="tab-chat" class="tab-content">
      <div class="chat-container">
        <div id="chat-messages" class="chat-messages">
          <div class="message message-bot">
            👋 Hi! I am your <b>Gemini AI Assistant</b>. Ask me anything about recent job postings, required skills, or hiring trends!
          </div>
        </div>
        <div class="chat-input-bar">
          <input type="text" id="chat-input" class="chat-input" placeholder="Ask Gemini AI..." onkeypress="handleKeyPress(event)">
          <button class="btn-send" onclick="sendMessage()">➔</button>
        </div>
      </div>
    </div>
    <div id="tab-logs" class="tab-content">
      <div id="log-terminal" class="log-terminal">
        <div>[System] Real-time activity console initialized...</div>
      </div>
    </div>
  </main>
  <nav>
    <button class="nav-btn active" onclick="switchTab('jobs')">
      <span class="nav-icon">📋</span>
      <span>Jobs Feed</span>
    </button>
    <button class="nav-btn" onclick="switchTab('chat')">
      <span class="nav-icon">💬</span>
      <span>Gemini AI</span>
    </button>
    <button class="nav-btn" onclick="switchTab('logs')">
      <span class="nav-icon">🔴</span>
      <span>Console</span>
    </button>
  </nav>
  <script>
    function switchTab(tabName) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(\`tab-\${tabName}\`).classList.add('active');
      event.currentTarget.classList.add('active');
    }
    async function fetchJobs() {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (data.success && data.jobs.length > 0) {
          const container = document.getElementById('jobs-container');
          container.innerHTML = data.jobs.map(item => \`
            <div class="job-card">
              <div class="job-header">
                <div class="job-role">\${escapeHtml(item.job.job_title || 'Hiring Opening')}</div>
                <div class="job-time">\${new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
              <div class="job-meta">
                \${item.job.company_or_project ? \`<span class="badge">🏢 \${escapeHtml(item.job.company_or_project)}</span>\` : ''}
                \${item.job.job_type ? \`<span class="badge">💼 \${escapeHtml(item.job.job_type)}</span>\` : ''}
                \${item.job.salary_budget ? \`<span class="badge badge-green">💰 \${escapeHtml(item.job.salary_budget)}</span>\` : ''}
              </div>
              <div class="job-summary">\${escapeHtml(item.job.summary || 'No summary available.')}</div>
              \${item.job.contact_info ? \`<div class="job-contact">📩 \${escapeHtml(item.job.contact_info)}</div>\` : ''}
              <div class="job-actions">
                <a href="\${item.discordUrl}" target="_blank" class="btn-discord">
                  🚀 Open in Discord App
                </a>
              </div>
            </div>
          \`).join('');
        }
      } catch (err) {}
    }
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        if (data.success && data.logs.length > 0) {
          const terminal = document.getElementById('log-terminal');
          terminal.innerHTML = data.logs.map(log => \`<div>\${escapeHtml(log)}</div>\`).join('');
          terminal.scrollTop = terminal.scrollHeight;
        }
      } catch (err) {}
    }
    async function sendMessage() {
      const input = document.getElementById('chat-input');
      const prompt = input.value.trim();
      if (!prompt) return;
      const chatContainer = document.getElementById('chat-messages');
      const userDiv = document.createElement('div');
      userDiv.className = 'message message-user';
      userDiv.textContent = prompt;
      chatContainer.appendChild(userDiv);
      input.value = '';
      chatContainer.scrollTop = chatContainer.scrollHeight;
      const botDiv = document.createElement('div');
      botDiv.className = 'message message-bot';
      botDiv.textContent = 'Thinking with Gemini AI...';
      chatContainer.appendChild(botDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        if (data.success) { botDiv.textContent = data.answer; }
        else { botDiv.textContent = 'Sorry, could not process query.'; }
      } catch (err) { botDiv.textContent = 'Error connecting to Gemini API.'; }
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    function handleKeyPress(e) { if (e.key === 'Enter') sendMessage(); }
    function escapeHtml(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    setInterval(fetchJobs, 4000);
    setInterval(fetchLogs, 3000);
    fetchJobs();
    fetchLogs();
  </script>
</body>
</html>`;

export function startHealthCheckServer(port: number = 3000) {
  const app = express();
  app.use(express.json());
  const startTime = Date.now();
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const classifier = new GeminiJobClassifier(geminiApiKey);

  // Direct Mobile App HTML rendering
  app.get('/', (req, res) => {
    res.status(200).send(MOBILE_APP_HTML);
  });

  app.get('/app', (req, res) => {
    res.status(200).send(MOBILE_APP_HTML);
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Discord-Gemini-Telegram-Hiring-Bot',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    });
  });

  // Mobile App API: Get Approved Jobs
  app.get('/api/jobs', (req, res) => {
    res.status(200).json({
      success: true,
      count: jobsList.length,
      jobs: jobsList
    });
  });

  // Mobile App API: Get Live Logs
  app.get('/api/logs', (req, res) => {
    res.status(200).json({
      success: true,
      count: logsList.length,
      logs: logsList
    });
  });

  // Mobile App API: Chat with Gemini AI Assistant
  app.post('/api/chat', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
      }

      const systemContext = `You are the AI Assistant for the user's Discord Hiring Bot system.
Current System Stats:
- Monitored Jobs Saved: ${jobsList.length}
- Recent Jobs: ${JSON.stringify(jobsList.slice(0, 5))}

Answer the user's question accurately and helpfully based on these hiring posts and bot activity.`;

      const answer = await classifier.chat(prompt, systemContext);

      return res.status(200).json({
        success: true,
        answer
      });
    } catch (err) {
      console.error('[API Chat] Error:', err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  const server = app.listen(port, () => {
    logEvent(`Server & Mobile App API running on port ${port}`);
  });

  return server;
}
