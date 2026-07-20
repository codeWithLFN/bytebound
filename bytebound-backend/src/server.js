import { buildApp } from './app.js';

const app = buildApp();

try {
    await app.listen({
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
    });

    app.log.info('Server running');
} catch (err) {
    app.log.error(err);
    process.exit(1);
}