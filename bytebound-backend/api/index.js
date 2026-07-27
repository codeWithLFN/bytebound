import { buildApp } from '../src/app.js';

const app = buildApp({
  logger: false,
});

// Cache the ready promise so cold start only happens once.
const ready = app.ready();

export default async function handler(req, res) {
  await ready;
  app.server.emit('request', req, res);
}