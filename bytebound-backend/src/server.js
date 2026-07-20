import { buildApp } from './app.js';

const app = buildApp();

const start = async () => {
    try {
        await app.listen({
            port: process.env.PORT || 3000,
            host: process.env.HOST || '0.0.0.0',
        });

        app.log.info(`Server running`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();