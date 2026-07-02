import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export default async function swaggerPlugin(app) {
    await app.register(swagger, {
        openapi: {
            info: {
                title: 'ByteBound Backend API',
                description: 'Fastify backend API for ByteBound',
                version: '1.0.0',
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Local development server',
                },
            ],
            tags: [
                { name: 'Health', description: 'Health check endpoints' },
                { name: 'Books', description: 'Book search endpoints' },
                { name: 'Links', description: 'Download link endpoints' },
            ],
        },
    });

    await app.register(swaggerUI, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
    });
}