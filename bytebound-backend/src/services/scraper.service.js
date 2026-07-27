import * as cheerio from 'cheerio';

const BASE_URL = process.env.SOURCE_BASE_URL || 'https://annas-archive.gl';
const USER_AGENT =
    process.env.USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

function normalizeText(value = '') {
    return value.replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(href = '') {
    if (!href) return '';
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    return new URL(href, BASE_URL).toString();
}

function isAnnaArchiveUrl(url = '') {
    try {
        const parsed = new URL(url);
        const base = new URL(BASE_URL);
        return parsed.hostname === base.hostname;
    } catch {
        return false;
    }
}

function looksLikeExternalFile(url = '') {
    return (
        /\.(epub|pdf|mobi|azw3|djvu|fb2|cbz|cbr|zip)(\?|$)/i.test(url) ||
        url.includes('/download/') ||
        url.includes('/d3/') ||
        url.includes('libgen') ||
        url.includes('zlibrary') ||
        url.includes('momot.rs') ||
        url.includes('momot')
    );
}

function isKnownNonDownloadUrl(url = '') {
    try {
        const pathname = new URL(url).pathname.toLowerCase();

        return (
            pathname.endsWith('/biblioservice.php') ||
            pathname.endsWith('/json.php') ||
            pathname.endsWith('/ads.php') ||
            pathname.endsWith('/book.php') ||
            pathname.endsWith('/file.php') ||
            pathname.startsWith('/book/') ||
            pathname.startsWith('/index.php')
        );
    } catch {
        return false;
    }
}

function isDownloadCandidateUrl(url = '') {
    if (!url || isAnnaArchiveUrl(url) || isKnownNonDownloadUrl(url)) {
        return false;
    }

    return looksLikeExternalFile(url);
}

export class UpstreamError extends Error {
    constructor(status, message) {
        super(message || `Upstream request failed with status ${status}`);
        this.name = 'UpstreamError';
        this.statusCode = status;
    }
}

// --- Network Helpers ---

async function fetchHtml(path, options = {}) {
    const url = path.startsWith('http') ? path : new URL(path, BASE_URL).toString();

    const response = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: options.redirect || 'follow',
    });

    if (!response.ok) {
        throw new UpstreamError(response.status);
    }

    return response.text();
}

async function fetchJson(path) {
    const url = path.startsWith('http') ? path : new URL(path, BASE_URL).toString();

    const response = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        return null;
    }

    return response.json();
}

// --- Parsing & Extraction ---

function extractTextWithSeparators($) {
    return $('html *')
        .contents()
        .map((_, el) => {
            if (el.type === 'text') return $(el).text();
            return ' ';
        })
        .get()
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractDownloadLinks($detail) {
    const links = [];
    const seen = new Set();

    $detail('a[href]').each((_, el) => {
        const href = $detail(el).attr('href') || '';
        const lower = href.toLowerCase();

        const isSlow = lower.includes('/slow_download/');
        const isFast = lower.includes('/fast_download/');
        if (!isSlow && !isFast) return;

        // Skip modifier links like ?viewer=1 / ?no_redirect=1 / ?short=1
        if (/[?&](viewer|no_redirect|short)=/.test(lower)) return;

        const absoluteUrl = toAbsoluteUrl(href);
        if (!absoluteUrl || seen.has(absoluteUrl)) return;
        seen.add(absoluteUrl);

        const label = normalizeText($detail(el).text());
        const speed = isSlow ? 'slow' : 'fast';

        const parentText = normalizeText($detail(el).parent().text());
        const rowText = normalizeText($detail(el).closest('li, p, div').text());
        const combined = `${label} ${parentText} ${rowText}`.toLowerCase();

        links.push({
            label: label || (isSlow ? 'Slow Partner Server' : 'Fast Partner Server'),
            url: absoluteUrl,
            speed,
            source: absoluteUrl,
            noWaitlist: combined.includes('no waitlist'),
            withWaitlist: combined.includes('with waitlist'),
            recommended: combined.includes('recommended'),
        });
    });

    // Fast first, then by recommendation / waitlist signals
    links.sort((a, b) => {
        if (a.speed !== b.speed) return a.speed === 'fast' ? -1 : 1;
        if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
        if (a.noWaitlist !== b.noWaitlist) return a.noWaitlist ? -1 : 1;
        if (a.withWaitlist !== b.withWaitlist) return a.withWaitlist ? 1 : -1;
        return 0;
    });

    // Strip internal sort keys
    return links.map(({ label, url, speed, source }) => ({
        label,
        url,
        speed,
        source,
    }));
}

// --- Main Exports ---

export async function searchBooksFromSource({ q, format, language, page }) {
    const params = new URLSearchParams({ q });

    if (format) params.set('ext', format);
    if (language) params.set('lang', language);
    if (page && Number(page) > 1) params.set('page', String(Number(page)));

    const html = await fetchHtml(`/search?${params.toString()}`);
    const $ = cheerio.load(html);
    const results = [];
    const seen = new Set();

    $('a[href*="/md5/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = normalizeText($(el).text());
        const md5 = href.split('/md5/')[1]?.split(/[?#/]/)[0] || '';

        if (!md5 || !title || seen.has(md5)) return;
        seen.add(md5);

        const card = $(el).closest('div');
        const cardText = normalizeText(card.text());

        let author = '';
        let fileFormat = format || '';
        let fileLanguage = language || '';

        const formatMatch = cardText.match(/\b(epub|pdf|mobi|azw3|djvu|fb2|cbr|cbz)\b/i);
        const languageMatch = cardText.match(
            /\b(english|french|german|spanish|portuguese|arabic)\b/i
        );

        if (formatMatch) fileFormat = formatMatch[1].toLowerCase();
        if (languageMatch) fileLanguage = languageMatch[1];

        const possibleAuthor = card
            .find('div, span, p')
            .map((__, node) => normalizeText($(node).text()))
            .get()
            .find((text) => text && text !== title && text.length < 120);

        if (possibleAuthor) author = possibleAuthor;

        results.push({
            md5,
            title,
            author,
            format: fileFormat,
            language: fileLanguage,
            detailUrl: toAbsoluteUrl(href),
        });
    });

    return results.slice(0, 25);
}

export async function getDownloadLinksFromSource(md5) {
    // 1. Primary: parse the detail page for fast/slow partner download links.
    try {
        const detailHtml = await fetchHtml(`/md5/${md5}`);
        const $detail = cheerio.load(detailHtml);

        const links = extractDownloadLinks($detail);
        if (links.length > 0) {
            return links;
        }
    } catch {
        // Ignore HTML errors, fall through to JSON bypass
    }

    // 2. Defensive fallback: JSON bypass endpoint (older upstream shape).
    try {
        const info = await fetchJson(`/dyn/md5/inline_info/${md5}`);

        if (info && info.success && Array.isArray(info.downloadUrls)) {
            const links = [];
            for (const link of info.downloadUrls) {
                if (link.url && isDownloadCandidateUrl(link.url)) {
                    links.push({
                        label: link.source || 'Download',
                        url: link.url,
                        speed: link.speed || 'unknown',
                        source: link.source || 'unknown',
                    });
                }
            }
            if (links.length > 0) return links;
        }
    } catch {
        // Ignore API errors
    }

    return [];
}

export async function getBookDetailsFromSource(md5) {
    const html = await fetchHtml(`/md5/${md5}`);
    const $ = cheerio.load(html);

    const title = normalizeText(
        $('div.text-3xl').first().text() ||
        $('h3').first().text() ||
        $('h1').first().text()
    );

    if (!title) {
        throw new UpstreamError(404, `No book found for MD5: ${md5}`);
    }

    const author = normalizeText($('div.italic').first().text());

    const coverSrc =
        $('img[src*="/covers/"]').first().attr('src') ||
        $('img[alt*="cover" i]').first().attr('src') ||
        '';
    const cover = coverSrc ? toAbsoluteUrl(coverSrc) : '';

    const description = normalizeText(
        $('div.js-md5-top-box-description').first().text() ||
        $('div[class*="description"]').first().text()
    );

    const grayText = normalizeText(
        $('div.text-gray-800, div.text-gray-700, div.text-gray-600, div.text-gray-500')
            .map((_, el) => $(el).text())
            .get()
            .join(' ')
    );
    const pageText = extractTextWithSeparators($);

    let publisher = normalizeText($('a[href*="/publisher/"]').first().text());

    const yearMatch =
        grayText.match(/year[:\s]*((?:19|20)\d{2})/i) ||
        grayText.match(/\b((?:19|20)\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : '';

    let format = '';
    let filesize = '';
    const fileMatch = pageText.match(
        /File:\s*([A-Za-z0-9]+)\s*,\s*([\d.]+\s*(?:KB|MB|GB))/i
    );
    if (fileMatch) {
        format = fileMatch[1].toLowerCase();
        filesize = fileMatch[2].replace(/\s+/g, '');
    } else {
        const sizeMatch = pageText.match(/\b([\d.]+\s*(?:KB|MB|GB))\b/i);
        if (sizeMatch) filesize = sizeMatch[1].replace(/\s+/g, '');
        const fmtMatch = pageText.match(/\b(epub|pdf|mobi|azw3|djvu|fb2|cbz|cbr)\b/i);
        if (fmtMatch) format = fmtMatch[1].toLowerCase();
    }

    const isbnMatch = pageText.match(
        /ISBN(?:-1[03])?\s*[:\s]\s*([0-9][0-9Xx-]{8,16}[0-9Xx])/i
    );
    const isbn = isbnMatch ? isbnMatch[1] : '';

    const langMatch =
        pageText.match(/Language:\s*([A-Za-z]+)/i) ||
        grayText.match(
            /\b(English|French|German|Spanish|Portuguese|Arabic|Russian|Italian|Chinese|Japanese)\s*\[/i
        );
    const language = langMatch ? langMatch[1] : '';

    return {
        md5,
        title,
        author,
        publisher,
        year,
        language,
        format,
        filesize,
        isbn,
        description,
        cover,
        detailUrl: toAbsoluteUrl(`/md5/${md5}`),
    };
}