import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApp } from '../src/app.js';

const SEARCH_HTML = `
<html><body>
  <div>
    <a href="/md5/f1948082094a7b4ef74dec62ff5a0e14">Dune</a>
    <div>Frank Herbert</div>
    <div>English epub</div>
  </div>
</body></html>`;

const DETAIL_HTML = `
<html><body>
  <div class="text-3xl font-bold">Dune</div>
  <div class="italic">Frank Herbert</div>
  <img src="/covers/abc123.jpg" alt="cover" />
  <div class="js-md5-top-box-description">A sci-fi classic about Arrakis.</div>
  <div class="text-gray-800">Ace Books, Year: 1965</div>
  <div class="text-gray-500">English [en] ISBN: 9780441172719 File: EPUB, 1.2MB</div>
</body></html>`;

function mockFetch(captured = {}) {
    const originalFetch = global.fetch;

    global.fetch = async (url) => {
        const href = String(url);
        captured.lastUrl = href;

        if (href.includes('/search')) {
            return { ok: true, status: 200, text: async () => SEARCH_HTML };
        }

        if (href.includes('/md5/f1948082094a7b4ef74dec62ff5a0e14')) {
            return { ok: true, status: 200, text: async () => DETAIL_HTML };
        }

        return { ok: false, status: 404, text: async () => '' };
    };

    return () => {
        global.fetch = originalFetch;
    };
}

function mockBlockedFetch() {
    const originalFetch = global.fetch;

    global.fetch = async () => ({
        ok: false,
        status: 403,
        text: async () => '',
    });

    return () => {
        global.fetch = originalFetch;
    };
}

test('GET /v1/books/search returns results', async () => {
    const restore = mockFetch();
    const app = buildApp({ logger: false });

    try {
        const res = await app.inject({ url: '/v1/books/search?q=dune' });
        assert.equal(res.statusCode, 200);

        const body = res.json();
        assert.equal(body.query, 'dune');
        assert.equal(body.page, 1);
        assert.equal(body.count, 1);
        assert.equal(body.results[0].md5, 'f1948082094a7b4ef74dec62ff5a0e14');
        assert.equal(body.results[0].title, 'Dune');
    } finally {
        await app.close();
        restore();
    }
});

test('GET /v1/books/search forwards page param upstream', async () => {
    const captured = {};
    const restore = mockFetch(captured);
    const app = buildApp({ logger: false });

    try {
        const res = await app.inject({ url: '/v1/books/search?q=dune&page=3' });
        assert.equal(res.statusCode, 200);
        assert.equal(res.json().page, 3);
        assert.match(captured.lastUrl, /page=3/);
    } finally {
        await app.close();
        restore();
    }
});

test('GET /v1/books/search reports upstream blocking as 503', async () => {
    const restore = mockBlockedFetch();
    const app = buildApp({ logger: false });

    try {
        const res = await app.inject({ url: '/v1/books/search?q=dune' });
        assert.equal(res.statusCode, 503);
        assert.equal(res.json().error, 'Service Unavailable');
    } finally {
        await app.close();
        restore();
    }
});

test('legacy GET /books/search still works', async () => {
    const restore = mockFetch();
    const app = buildApp({ logger: false });

    try {
        const res = await app.inject({ url: '/books/search?q=dune' });
        assert.equal(res.statusCode, 200);
        assert.equal(res.json().count, 1);
    } finally {
        await app.close();
        restore();
    }
});

test('GET /v1/books/:md5 returns book details', async () => {
    const restore = mockFetch();
    const app = buildApp({ logger: false });

    try {
        const res = await app.inject({
            url: '/v1/books/f1948082094a7b4ef74dec62ff5a0e14',
        });
        assert.equal(res.statusCode, 200);

        const body = res.json();
        assert.equal(body.title, 'Dune');
        assert.equal(body.author, 'Frank Herbert');
        assert.equal(body.year, '1965');
        assert.equal(body.format, 'epub');
        assert.equal(body.filesize, '1.2MB');
        assert.equal(body.isbn, '9780441172719');
        assert.equal(body.description, 'A sci-fi classic about Arrakis.');
        assert.match(body.cover, /covers\/abc123\.jpg/);
    } finally {
        await app.close();
        restore();
    }
});

test('GET /v1/books/:md5 returns 404 for unknown md5', async () => {
    const restore = mockFetch();
    const app = buildApp({ logger: false });

    try {
        const res = await app.inject({
            url: '/v1/books/00000000000000000000000000000000',
        });
        assert.equal(res.statusCode, 404);
        assert.equal(res.json().error, 'Not Found');
    } finally {
        await app.close();
        restore();
    }
});
