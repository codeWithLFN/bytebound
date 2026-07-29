import { cached } from '../lib/cache.js';
import { TOPICS, TRENDING_QUERIES, resolveTopicQueries } from '../lib/topics.js';
import {
    fetchCover,
    getBookDetailsFromSource,
    searchBooksFromSource,
} from './scraper.service.js';

export async function searchBooks({ q, format, language, page }) {
    if (!q || typeof q !== 'string') {
        throw new Error('A valid search query is required');
    }

    const key = `search:${q}:${format || ''}:${language || ''}:${page || 1}`;
    return cached(key, () => searchBooksFromSource({ q, format, language, page }));
}

export async function getBookDetails(md5) {
    if (!md5 || typeof md5 !== 'string') {
        throw new Error('A valid md5 is required');
    }

    return cached(`details:${md5}`, () => getBookDetailsFromSource(md5));
}

export async function getBookCover(md5) {
    if (!md5 || typeof md5 !== 'string') {
        throw new Error('A valid md5 is required');
    }

    // Covers never change; cache for 24h.
    return cached(`cover:${md5}`, () => fetchCover(md5), 24 * 60 * 60 * 1000);
}

export function getTopics() {
    // Only expose chip metadata, not the internal query.
    return TOPICS.map(({ id, label, emoji }) => ({ id, label, emoji }));
}

// Run searches for multiple queries, merge + dedupe by md5.
async function searchAcrossTopics(queries, { format, language } = {}) {
    const settled = await Promise.allSettled(
        queries.map((q) =>
            cached(`search:${q}:${format || ''}:${language || ''}:1`, () =>
                searchBooksFromSource({ q, format, language })
            )
        )
    );

    const seen = new Set();
    const results = [];
    for (const outcome of settled) {
        if (outcome.status !== 'fulfilled') continue;
        for (const book of outcome.value) {
            if (seen.has(book.md5)) continue;
            seen.add(book.md5);
            results.push(book);
            if (results.length >= 25) return results;
        }
    }
    return results;
}

export async function discoverBooks({ topics, format, language }) {
    const queries = resolveTopicQueries(topics);
    if (queries.length === 0) return [];
    return cached(
        `discover:${queries.join('|')}:${format || ''}:${language || ''}`,
        () => searchAcrossTopics(queries, { format, language })
    );
}

export async function getTrending({ format, language } = {}) {
    return cached(`trending:${format || ''}:${language || ''}`, () =>
        searchAcrossTopics(TRENDING_QUERIES, { format, language })
    );
}

export async function getRecommendations({ topics, format, language }) {
    const queries = resolveTopicQueries(topics);
    if (queries.length === 0) {
        // No interests yet → fall back to trending.
        return getTrending({ format, language });
    }
    return cached(
        `recs:${queries.join('|')}:${format || ''}:${language || ''}`,
        () => searchAcrossTopics(queries, { format, language })
    );
}