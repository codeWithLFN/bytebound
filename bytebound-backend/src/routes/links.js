import { getLinksByMd5 } from '../services/links.service.js';
import { UpstreamError } from '../services/scraper.service.js';

export default async function linksRoutes(app) {
    app.get('/:md5', {
        schema: {
            hide: app.prefix?.startsWith('/v1') !== true,
            tags: ['Links'],
            summary: 'Get download links',
            description:
                'Get download links for a book by MD5. Use ?type=ipfs|fast|slow to filter by link type.',
            params: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    md5: { type: 'string', minLength: 1 },
                },
                required: ['md5'],
            },
            querystring: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    type: { type: 'string', enum: ['ipfs', 'fast', 'slow'] },
                },
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
            const { type } = request.query;

            try {
                return await getLinksByMd5(md5, { type });
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