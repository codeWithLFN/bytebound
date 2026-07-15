import { searchBooksFromSource } from './scraper.service.js';

export async function searchBooks({ q, format, language }) {
    if (!q || typeof q !== 'string') {
        throw new Error('A valid search query is required');
    }

    return searchBooksFromSource({ q, format, language });
}