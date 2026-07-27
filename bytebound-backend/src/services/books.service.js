import {
    getBookDetailsFromSource,
    searchBooksFromSource,
} from './scraper.service.js';

export async function searchBooks({ q, format, language, page }) {
    if (!q || typeof q !== 'string') {
        throw new Error('A valid search query is required');
    }

    return searchBooksFromSource({ q, format, language, page });
}

export async function getBookDetails(md5) {
    if (!md5 || typeof md5 !== 'string') {
        throw new Error('A valid md5 is required');
    }

    return getBookDetailsFromSource(md5);
}