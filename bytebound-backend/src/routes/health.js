import { getHealthStatus } from '../services/health.service.js';

export default async function healthRoutes(app) {
    app.get('/health', {
        schema: {
            tags: ['Health'],
            summary: 'Health check',
            description: 'Returns the health status of the ByteBound backend',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        service: { type: 'string' },
                        timestamp: { type: 'string' },
                    },
                },
            },
        },
        handler: async () => {
            return getHealthStatus();
        },
    });
}