import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import handler from '../api/index.js';

test('vercel entrypoint exports a request handler', () => {
    assert.equal(typeof handler, 'function');
});

test('vercel entrypoint handles HTTP requests', async () => {
    const server = http.createServer((req, res) => {
        Promise.resolve(handler(req, res)).catch(() => {
            if (!res.headersSent) {
                res.statusCode = 500;
                res.end();
            }
        });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    try {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.status, 'ok');
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
});
