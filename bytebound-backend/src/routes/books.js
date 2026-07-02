import { searchBooks } from '../services/books.service.js';

export default async function booksRoutes(app) {
    app.get('/search', {
        schema: {
            tags: ['Books'],
            summary: 'Search books',
            description: 'Search for books by query text',
            querystring: {
                type: 'object',
                properties: {
                    q: { type: 'string', minLength: 1 },
                    format: { type: 'string' },
                    language: { type: 'string' },
                },
                required: ['q'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        count: { type: 'number' },
                        results: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    md5: { type: 'string' },
                                    title: { type: 'string' },
                                    author: { type: 'string' },
                                    format: { type: 'string' },
                                    language: { type: 'string' },
                                    detailUrl: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        handler: async (request) => {
            const { q, format, language } = request.query;
            const results = await searchBooks({ q, format, language });

            return {
                query: q,
                count: results.length,
                results,
            };
        },
    });
}