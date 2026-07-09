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

async function resolveSlowPageToFile(slowUrl, fallbackLabel = 'Slow Partner Server') {
    try {
        const html = await fetchHtml(slowUrl);
        const $ = cheerio.load(html);

        let directLink = null;

        $('a[href]').each((_, el) => {
            if (directLink) return;

            const href = $(el).attr('href') || '';
            const label = normalizeText($(el).text());
            const absoluteUrl = toAbsoluteUrl(href);

            if (!href || !absoluteUrl) return;
            if (isAnnaArchiveUrl(absoluteUrl)) return;

            const isDownloadNow = label.toLowerCase().includes('download now');

            if (isDownloadNow || isDownloadCandidateUrl(absoluteUrl)) {
                directLink = {
                    label: label || 'Download now',
                    url: absoluteUrl,
                    speed: 'slow',
                    source: slowUrl,
                };
            }
        });

        if (directLink) {
            return directLink;
        }

        // Fallback parsing logic...
        const pageHtml = $.html();
        const pageText = $.root().text();
        const separatedText = extractTextWithSeparators($);

        const markdownMatch = pageHtml.match(/\[[^\]]*?\]\((https?:\/\/[^)\s]+)\)/i);
        if (markdownMatch?.[1]) {
            const url = markdownMatch[1].replace(/[)\]}>,.;]+$/, '');
            if (isDownloadCandidateUrl(url)) {
                return {
                    label: 'Download now',
                    url,
                    speed: 'slow',
                    source: slowUrl,
                };
            }
        }

        const htmlUrls = pageHtml.match(/https?:\/\/[^\s"'<>]+/gi) || [];
        for (const candidate of htmlUrls) {
            const url = candidate.replace(/[)\]}>,.;]+$/, '');
            if (isDownloadCandidateUrl(url)) {
                return {
                    label: 'Download now',
                    url,
                    speed: 'slow',
                    source: slowUrl,
                };
            }
        }

        const textUrls = (pageText.match(/https?:\/\/\S+/gi) || [])
            .concat(separatedText.match(/https?:\/\/\S+/gi) || []);

        for (const candidate of textUrls) {
            const url = candidate.replace(/[)\]}>,.;]+$/, '');
            if (isDownloadCandidateUrl(url)) {
                return {
                    label: 'Download now',
                    url,
                    speed: 'slow',
                    source: slowUrl,
                };
            }
        }
    } catch {
        // continue to manual redirect fallback
    }

    try {
        const url = slowUrl;
        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            redirect: 'manual',
        });
        const location = response.headers.get('location');

        if (location) {
            const absoluteLocation = toAbsoluteUrl(location);
            if (!isAnnaArchiveUrl(absoluteLocation)) {
                return {
                    label: 'Download now',
                    url: absoluteLocation,
                    speed: 'slow',
                    source: slowUrl,
                };
            }
        }
    } catch {
        // ignore
    }

    return null;
}

function extractSlowCandidates($detail) {
    const candidates = [];
    const seen = new Set();

    $detail('a[href]').each((_, el) => {
        const href = $detail(el).attr('href') || '';
        const label = normalizeText($detail(el).text());

        if (!href || !label) return;
        if (!href.toLowerCase().includes('/slow_download/')) return;

        const absoluteUrl = toAbsoluteUrl(href);
        if (!absoluteUrl || seen.has(absoluteUrl)) return;
        seen.add(absoluteUrl);

        const parentText = normalizeText($detail(el).parent().text());
        const rowText = normalizeText($detail(el).closest('li, p, div').text());
        const combinedText = `${label} ${parentText} ${rowText}`.toLowerCase();

        const noWaitlist = combinedText.includes('no waitlist');
        const withWaitlist = combinedText.includes('with waitlist');

        candidates.push({
            label,
            url: absoluteUrl,
            speed: 'slow',
            noWaitlist,
            withWaitlist,
        });
    });

    candidates.sort((a, b) => {
        if (a.noWaitlist && !b.noWaitlist) return -1;
        if (!a.noWaitlist && b.noWaitlist) return 1;
        if (a.withWaitlist && !b.withWaitlist) return 1;
        if (!a.withWaitlist && b.withWaitlist) return -1;
        return 0;
    });

    return candidates;
}

// --- Main Exports ---

export async function searchBooksFromSource({ q, format, language }) {
    const params = new URLSearchParams({ q });

    if (format) params.set('ext', format);
    if (language) params.set('lang', language);

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
    // 1. The "Bypass": Try the JSON API endpoint first.
    // This endpoint usually returns data without triggering DDoS Guard challenges.
    try {
        const info = await fetchJson(`/dyn/md5/inline_info/${md5}`);

        if (info && info.success && info.downloadUrls) {
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
        // Ignore API errors, fall through to HTML parsing
    }

    // 2. Fallback: HTML Parsing (The slow/DDG vulnerable way)
    try {
        const detailHtml = await fetchHtml(`/md5/${md5}`);
        const $detail = cheerio.load(detailHtml);

        const slowCandidates = extractSlowCandidates($detail);

        if (slowCandidates.length > 0) {
            for (const candidate of slowCandidates) {
                const resolved = await resolveSlowPageToFile(candidate.url, candidate.label);
                if (resolved) {
                    return [resolved];
                }
            }
        }

        // Look for direct links in HTML if slow_download wasn't found
        const directLinks = [];
        $detail('a[href]').each((_, el) => {
            const href = $detail(el).attr('href') || '';
            const label = normalizeText($detail(el).text());
            const absoluteUrl = toAbsoluteUrl(href);

            if (!href || isAnnaArchiveUrl(absoluteUrl)) return;

            const isDownloadNow = label.toLowerCase().includes('download now');
            if (isDownloadNow || isDownloadCandidateUrl(absoluteUrl)) {
                directLinks.push({
                    label: label || 'Download',
                    url: absoluteUrl,
                    speed: 'unknown',
                    source: absoluteUrl,
                });
            }
        });

        if (directLinks.length > 0) {
            return directLinks;
        }
    } catch {
        // Ignore HTML errors
    }

    return [];
}