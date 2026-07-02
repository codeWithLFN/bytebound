import { buildApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const app = buildApp();

const start = async () => {
    try {
        await app.listen({ port, host });
        app.log.info(`Server running at http://${host}:${port}`);
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

start();