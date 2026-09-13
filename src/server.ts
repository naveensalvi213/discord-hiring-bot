import express from 'express';

export function startHealthCheckServer(port: number = 3000) {
  const app = express();
  const startTime = Date.now();

  app.get('/', (req, res) => {
    res.status(200).send('🟢 Discord-Gemini-Telegram Hiring Bot is LIVE and running 24/7!');
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Discord-Gemini-Telegram-Hiring-Bot',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    });
  });

  const server = app.listen(port, () => {
    console.log(`[HealthCheck] Server running on port ${port}`);
  });

  return server;
}
