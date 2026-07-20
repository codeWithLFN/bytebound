import { buildApp } from './app.js';

const app = buildApp();

await app.listen({
  port: process.env.PORT || 3000,
  host: '0.0.0.0',
});