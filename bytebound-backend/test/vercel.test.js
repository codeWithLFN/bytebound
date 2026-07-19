import test from 'node:test';
import assert from 'node:assert/strict';

import handler from '../api/index.js';

test('vercel entrypoint exports a request handler', () => {
    assert.equal(typeof handler, 'function');
});
