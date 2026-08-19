import * as cheerio from 'cheerio';

const SOURCE_BASE_URLS = (process.env.SOURCE_BASE_URLS || process.env.SOURCE_BASE_URL || 'https://annas-archive.gl')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);
const USER_AGENT =
    process.env.USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 8000;

async function fetchFromSource(path, options = {}) {
    let lastError;

    for (const baseUrl of SOURCE_BASE_URLS) {
        try {
            const response = await fetch(`${baseUrl}${path}`, {
                ...options,
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'text/html,application/xhtml+xml',
                    ...(options.headers || {}),
                },
            });

            if (!response.ok) {
                throw new Error(`Source returned HTTP ${response.status}`);
            }

            return { response, baseUrl };
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('No book source is configured');
}

// Keep the existing parser functions below this point unchanged.
