const STORAGE_PREFIX = 'gcoins_list_url:';

export const REMEMBERED_LIST_PATHS = new Set([
    '/vouchers',
    '/vouchers/pending',
    '/vouchers/settlement',
    '/vouchers/settlements',
    '/opname',
    '/bri-funds',
    '/bri-funds/postings',
    '/bri-funds/pending',
    '/admin/users',
    '/admin/categories',
    '/admin/audit-logs',
    '/notifications',
]);

export const VALID_PER_PAGE_OPTIONS = [20, 50, 100] as const;

/**
 * Normalize a relative URL's pathname (strips query string and trailing slash).
 */
function extractPathname(url: string): string {
    const [rawPath] = url.split('?');
    if (!rawPath) return '/';
    return rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
}

/**
 * Store the current full relative URL (including query parameters) if it is a known list page.
 */
export function rememberListUrl(url: string): void {
    if (typeof window === 'undefined' || !url) return;

    try {
        const pathname = extractPathname(url);
        if (REMEMBERED_LIST_PATHS.has(pathname)) {
            window.sessionStorage.setItem(`${STORAGE_PREFIX}${pathname}`, url);
        }
    } catch {
        // Ignore sessionStorage errors in restricted browser contexts
    }
}

/**
 * Resolve a base list path (e.g. '/vouchers') to its last remembered URL with active filters/pagination.
 * Only applies if the target href has no explicit query string of its own.
 */
export function resolveRememberedListUrl(href?: string): string {
    if (!href) return '';
    if (typeof window === 'undefined' || href.includes('?')) {
        return href;
    }

    try {
        const pathname = extractPathname(href);
        if (REMEMBERED_LIST_PATHS.has(pathname)) {
            const remembered = window.sessionStorage.getItem(`${STORAGE_PREFIX}${pathname}`);
            if (remembered) {
                return remembered;
            }
        }
    } catch {
        // Ignore sessionStorage errors
    }

    return href;
}

/**
 * Read active per_page parameter from current URL query string if valid (20, 50, or 100).
 */
export function getActivePerPageParam(): number | undefined {
    if (typeof window === 'undefined') return undefined;

    const raw = new URLSearchParams(window.location.search).get('per_page');
    if (!raw) return undefined;

    const parsed = Number(raw);
    return (VALID_PER_PAGE_OPTIONS as readonly number[]).includes(parsed) ? parsed : undefined;
}
