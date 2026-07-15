import { getLinksByMd5 } from '../services/links.service.js';
import { UpstreamError } from '../services/scraper.service.js';

export default async function linksRoutes(app) {
    app.get('/:md5', {
        schema: {
            tags: ['Links'],
            summary: 'Get download links',
            description: 'Get the first slow download link for a book by MD5',
            params: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    md5: { type: 'string', minLength: 1 },
                },
                required: ['md5'],
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        md5: { type: 'string' },
                        count: { type: 'number' },
                        links: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                    label: { type: 'string' },
                                    url: { type: 'string' },
                                    speed: { type: 'string' },
                                    source: { type: 'string' },
                                },
                                required: ['label', 'url', 'speed'],
                            },
                        },
                    },
                    required: ['md5', 'count', 'links'],
                },
                404: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                    required: ['error', 'message'],
                },
            },
        },
        handler: async (request, reply) => {
            const { md5 } = request.params;

            try {
                return await getLinksByMd5(md5);
            } catch (err) {
                if (err instanceof UpstreamError && err.statusCode === 404) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: `No book found for MD5: ${md5}`,
                    });
                }

                throw err;
            }
        },
    });
}