import Fastify from 'fastify';
import 'dotenv/config';

import corsPlugin from './plugins/cors.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import sentryPlugin from './plugins/sentry.js';
import swaggerPlugin from './plugins/swagger.js';
import sensiblePlugin from './plugins/sensible.js';

import healthRoutes from './routes/health.js';
import booksRoutes from './routes/books.js';
import linksRoutes from './routes/links.js';

export function buildApp(opts = {}) {
    const app = Fastify({
        logger: opts.logger ?? true,
        trustProxy: true, // Vercel is behind a proxy; needed for correct client IPs
    });

    // Plugins
    app.register(sensiblePlugin);
    app.register(sentryPlugin);
    app.register(rateLimitPlugin);
    app.register(corsPlugin);
    app.register(swaggerPlugin);

    // Routes
    app.register(healthRoutes);

    // Versioned API (canonical)
    app.register(booksRoutes, { prefix: '/v1/books' });
    app.register(linksRoutes, { prefix: '/v1/links' });

    // Legacy unversioned routes (kept for backwards compatibility)
    app.register(booksRoutes, { prefix: '/books' });
    app.register(linksRoutes, { prefix: '/links' });

    // Root endpoint
    app.get('/', async () => ({
        name: 'bytebound-backend',
        status: 'ok',
        docs: '/docs',
        v1: {
            books: '/v1/books',
            links: '/v1/links',
        },
    }));

    return app;
}