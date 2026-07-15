import test from 'node:test';
import assert from 'node:assert/strict';

import { getDownloadLinksFromSource } from '../src/services/scraper.service.js';

function mockFetchOnce(payload) {
    const originalFetch = global.fetch;

    global.fetch = async (url) => {
        const href = String(url);

        if (href.includes('/dyn/md5/inline_info/')) {
            return {
                ok: true,
                status: 200,
                json: async () => payload,
            };
        }

        return {
            ok: false,
            status: 404,
            headers: { get: () => null },
            text: async () => '',
        };
    };

    return () => {
        global.fetch = originalFetch;
    };
}

test('filters libgen listing urls from the JSON bypass', async () => {
    const restoreFetch = mockFetchOnce({
        success: true,
        downloadUrls: [
            {
                url: 'https://libgen.li/biblioservice.php?value=813.6&type=ddc',
                source: 'https://libgen.li/biblioservice.php?value=813.6&type=ddc',
                speed: 'unknown',
            },
            {
                url: 'https://libgen.li/file.php?id=112502274',
                source: 'https://libgen.li/file.php?id=112502274',
                speed: 'unknown',
            },
            {
                url: 'https://libgen.is/json.php?fields=*&ids=2266733',
                source: 'https://libgen.is/json.php?fields=*&ids=2266733',
                speed: 'unknown',
            },
            {
                url: 'https://libgen.li/ads.php?md5=f1948082094a7b4ef74dec62ff5a0e14',
                source: 'https://libgen.li/ads.php?md5=f1948082094a7b4ef74dec62ff5a0e14',
                speed: 'unknown',
            },
            {
                url: 'https://libgen.pw/book/f1948082094a7b4ef74dec62ff5a0e14',
                source: 'https://libgen.pw/book/f1948082094a7b4ef74dec62ff5a0e14',
                speed: 'unknown',
            },
        ],
    });

    try {
        const links = await getDownloadLinksFromSource('f1948082094a7b4ef74dec62ff5a0e14');

        assert.deepEqual(links, []);
    } finally {
        restoreFetch();
    }
});

test('keeps direct file urls from the JSON bypass', async () => {
    const restoreFetch = mockFetchOnce({
        success: true,
        downloadUrls: [
            {
                url: 'https://cdn.example.com/books/example-book.epub',
                source: 'Example CDN',
                speed: 'fast',
            },
            {
                url: 'https://libgen.li/biblioservice.php?value=813.6&type=ddc',
                source: 'https://libgen.li/biblioservice.php?value=813.6&type=ddc',
                speed: 'unknown',
            },
        ],
    });

    try {
        const links = await getDownloadLinksFromSource('f1948082094a7b4ef74dec62ff5a0e14');

        assert.equal(links.length, 1);
        assert.deepEqual(links[0], {
            label: 'Example CDN',
            url: 'https://cdn.example.com/books/example-book.epub',
            speed: 'fast',
            source: 'Example CDN',
        });
    } finally {
        restoreFetch();
    }
});