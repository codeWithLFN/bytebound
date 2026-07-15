import Fastify from 'fastify';
import dotenv from 'dotenv';
import serverless from 'serverless-http';

import corsPlugin from './plugins/cors.js';
import swaggerPlugin from './plugins/swagger.js';
import sensiblePlugin from './plugins/sensible.js';

import healthRoutes from './routes/health.js';
import booksRoutes from './routes/books.js';
import linksRoutes from './routes/links.js';

dotenv.config();

export function buildApp(opts = {}) {
    const app = Fastify({
        logger: true,
        ...opts,
    });

    app.register(sensiblePlugin);
    app.register(corsPlugin);
    app.register(swaggerPlugin);

    app.register(healthRoutes, { prefix: '/' });
    app.register(booksRoutes, { prefix: '/books' });
    app.register(linksRoutes, { prefix: '/links' });

    app.get('/', async () => {
        return {
            name: 'bytebound-backend',
            status: 'ok',
            docs: '/docs',
        };
    });

    return app;
}

// Vercel serverless handler — wraps the Fastify app for serverless environments
const app = buildApp({ logger: false });
await app.ready();
export default serverless(app);