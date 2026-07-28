import { cached } from '../lib/cache.js';
import { getDownloadLinksFromSource } from './scraper.service.js';

export async function getLinksByMd5(md5, { type } = {}) {
    if (!md5 || typeof md5 !== 'string') {
        throw new Error('A valid md5 is required');
    }

    let links = await cached(`links:${md5}`, () => getDownloadLinksFromSource(md5));

    if (type && typeof type === 'string') {
        links = links.filter((link) => link.speed === type);
    }

    return {
        md5,
        count: links.length,
        links,
    };
}