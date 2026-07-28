import * as Sentry from '@sentry/node';

// Initialise Sentry only when a DSN is configured. No-op otherwise.
export default async function sentryPlugin(app) {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
        app.log.info('SENTRY_DSN not set — error tracking disabled');
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    });

    // Report unexpected errors to Sentry, then let Fastify's default handling continue.
    app.setErrorHandler((error, request, reply) => {
        const statusCode = error.statusCode || 500;

        // Only report server errors (5xx) and unknown errors — not client 4xx.
        if (statusCode >= 500) {
            Sentry.withScope((scope) => {
                scope.setTag('route', request.routeOptions?.url || request.url);
                scope.setExtra('query', request.query);
                scope.setExtra('params', request.params);
                Sentry.captureException(error);
            });
        }

        reply.status(statusCode).send({
            error: error.name || 'Internal Server Error',
            message: statusCode >= 500 ? 'An unexpected error occurred' : error.message,
            statusCode,
        });
    });
}
