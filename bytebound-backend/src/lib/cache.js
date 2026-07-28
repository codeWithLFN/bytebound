// Simple in-memory TTL cache. Per-serverless-instance, which is fine at small scale.
const store = new Map();

const DEFAULT_TTL_MS = Number(process.env.CACHE_TTL_MS) || 60 * 60 * 1000; // 1h
const MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES) || 500;

export function cacheGet(key) {
    const entry = store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
    }

    return entry.value;
}

export function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
    // Evict oldest entry if at capacity (Map preserves insertion order).
    if (store.size >= MAX_ENTRIES && !store.has(key)) {
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
    }

    store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Convenience wrapper: get-or-compute.
export async function cached(key, compute, ttlMs) {
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;

    const value = await compute();
    cacheSet(key, value, ttlMs);
    return value;
}
