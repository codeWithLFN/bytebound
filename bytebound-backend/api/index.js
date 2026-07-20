import { buildApp } from '../src/app.js';

const app = buildApp({
  logger: false,
});

let appReadyPromise;

async function ensureAppReady() {
  if (!appReadyPromise) {
    appReadyPromise = app.ready();
  }

  await appReadyPromise;
}

export default async function handler(req, res) {
  try {
    await ensureAppReady();
    app.server.emit('request', req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Server initialization failed' }));
    }
  }
}