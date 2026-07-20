import serverless from 'serverless-http';
import { buildApp } from '../src/app.js';

const app = buildApp({
    logger: false,
});

await app.ready();

export default serverless(app);