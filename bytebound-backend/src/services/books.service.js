import { cached } from '../lib/cache.js';
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