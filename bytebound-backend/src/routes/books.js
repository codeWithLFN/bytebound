import {
    discoverBooks,
    getBookCover,
    getBookDetails,
    getRecommendations,
    getTopics,
    getTrending,
    searchBooks,
} from '../services/books.service.js';
import { UpstreamError } from '../services/scraper.service.js';

export default async function booksRoutes(app) {
    const isV1 = () => app.prefix?.startsWith('/v1') === true;

    const bookListItem = {
        type: 'object',
        properties: {
            md5: { type: 'string' },
            title: { type: 'string' },
            author: { type: 'string' },
            format: { type: 'string' },
            language: { type: 'string' },
            detailUrl: { type: 'string' },
        },
    };

    const bookListSchema = {
        type: 'object',
        properties: {
            count: { type: 'number' },
            results: { type: 'array', items: bookListItem },
        },
    };

    const discoverQuerystring = {
        type: 'object',
        properties: {
            topics: { type: 'string', description: 'Comma-separated topic ids' },
            format: { type: 'string' },
            language: { type: 'string' },
        },
    };

    app.get('/topics', {
        schema: {
            hide: !isV1(),
            tags: ['Books'],
            summary: 'List interest topics',
            description: 'Interest chips shown during onboarding.',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        topics: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    label: { type: 'string' },
                                    emoji: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        handler: async () => {
            const topics = getTopics();
            return { count: topics.length, topics };
        },
    });

    app.get('/discover', {
        schema: {
            hide: !isV1(),
            tags: ['Books'],
            summary: 'Discover books by topics',
            querystring: { ...discoverQuerystring, required: ['topics'] },
            response: { 200: bookListSchema },
        },
        handler: async (request) => {
            const { topics = '', format, language } = request.query;
            const results = await discoverBooks({
                topics: topics.split(',').filter(Boolean),
                format,
                language,
            });
            return { count: results.length, results };
        },
    });

    app.get('/trending', {
        schema: {
            hide: !isV1(),
            tags: ['Books'],
            summary: 'Trending books',
            description: 'Popular books for the "Trending this week" carousel.',
            querystring: discoverQuerystring,
            response: { 200: bookListSchema },
        },
        handler: async (request) => {
            const { format, language } = request.query;
            const results = await getTrending({ format, language });
            return { count: results.length, results };
        },
    });

    app.get('/recommendations', {
        schema: {
            hide: !isV1(),
            tags: ['Books'],
            summary: 'Recommended books',
            description:
                "Personalised-looking books based on the user's interest topics. Falls back to trending when no topics are given.",
            querystring: discoverQuerystring,
            response: { 200: bookListSchema },
        },
        handler: async (request) => {
            const { topics = '', format, language } = request.query;
            const results = await getRecommendations({
                topics: topics.split(',').filter(Boolean),
                format,
                language,
            });
            return { count: results.length, results };
        },
    });

    app.get('/search', {
        schema: {
            hide: app.prefix?.startsWith('/v1') !== true,
            tags: ['Books'],
            summary: 'Search books',
            description: 'Search for books by query text',
            querystring: {
                type: 'object',
                properties: {
                    q: { type: 'string', minLength: 1 },
                    format: { type: 'string' },
                    language: { type: 'string' },
                    page: { type: 'integer', minimum: 1, default: 1 },
                },
                required: ['q'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        page: { type: 'integer' },
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
            const { q, format, language, page } = request.query;
            const results = await searchBooks({ q, format, language, page });

            return {
                query: q,
                page,
                count: results.length,
                results,
            };
        },
    });

    app.get('/:md5/cover', {
        schema: {
            hide: app.prefix?.startsWith('/v1') !== true,
            tags: ['Books'],
            summary: 'Get book cover',
            description:
                'Proxy the book cover image through the backend. Returns the image bytes with a long cache header.',
            params: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    md5: { type: 'string', minLength: 1 },
                },
                required: ['md5'],
            },
        },
        handler: async (request, reply) => {
            const { md5 } = request.params;

            try {
                const { buffer, contentType } = await getBookCover(md5);

                return reply
                    .header('Content-Type', contentType)
                    .header('Cache-Control', 'public, max-age=86400, immutable')
                    .send(buffer);
            } catch (err) {
                if (err instanceof UpstreamError && err.statusCode === 404) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: `No cover found for MD5: ${md5}`,
                    });
                }

                throw err;
            }
        },
    });

    app.get('/:md5', {
        schema: {
            hide: app.prefix?.startsWith('/v1') !== true,
            tags: ['Books'],
            summary: 'Get book details',
            description:
                'Get full metadata for a book by MD5: description, cover, filesize, year, ISBN, etc.',
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
                    properties: {
                        md5: { type: 'string' },
                        title: { type: 'string' },
                        author: { type: 'string' },
                        publisher: { type: 'string' },
                        year: { type: 'string' },
                        language: { type: 'string' },
                        format: { type: 'string' },
                        filesize: { type: 'string' },
                        isbn: { type: 'string' },
                        description: { type: 'string' },
                        cover: { type: 'string' },
                        detailUrl: { type: 'string' },
                    },
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
                return await getBookDetails(md5);
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