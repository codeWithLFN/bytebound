import Fastify from 'fastify';
import dotenv from 'dotenv';

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

    app.register(healthRoutes);
    app.register(booksRoutes, { prefix: '/books' });
    app.register(linksRoutes, { prefix: '/links' });

    app.get('/', async () => ({
        name: 'bytebound-backend',
        status: 'ok',
        docs: '/docs',
    }));

    return app;
}