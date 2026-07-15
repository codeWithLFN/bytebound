import { getDownloadLinksFromSource } from './scraper.service.js';

export async function getLinksByMd5(md5) {
    if (!md5 || typeof md5 !== 'string') {
        throw new Error('A valid md5 is required');
    }

    const links = await getDownloadLinksFromSource(md5);

    return {
        md5,
        count: links.length,
        links,
    };
}