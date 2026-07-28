import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

async function rateLimitPlugin(app) {
    await app.register(rateLimit, {
        global: true, // apply to all routes, including those in encapsulated plugins
        max: Number(process.env.RATE_LIMIT_MAX) || 30,
        timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
        // Identify clients by IP (Vercel sets x-forwarded-for; trustProxy is on).
        keyGenerator: (request) =>
            request.headers['x-forwarded-for']?.split(',')[0].trim() ||
            request.ip,
        errorResponseBuilder: () => ({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down and try again shortly.',
            statusCode: 429,
        }),
    });
}

// fp() breaks encapsulation so the limiter applies to sibling route plugins.
export default fp(rateLimitPlugin, { name: 'rate-limit' });
