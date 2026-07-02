import { getLinksByMd5 } from '../services/links.service.js';

export default async function linksRoutes(app) {
    app.get('/:md5', {
        schema: {
            tags: ['Links'],
            summary: 'Get download links',
            description: 'Get download links for a book by MD5',
            params: {
                type: 'object',
                properties: {
                    md5: { type: 'string', minLength: 1 },
                },
                required: ['md5'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        md5: { type: 'string' },
                        count: { type: 'number' },
                        links: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    label: { type: 'string' },
                                    url: { type: 'string' },
                                    speed: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        handler: async (request) => {
            const { md5 } = request.params;
            const links = await getLinksByMd5(md5);

            return {
                md5,
                count: links.length,
                links,
            };
        },
    });
}