import React from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VALID_PER_PAGE_OPTIONS } from '@/lib/list-url-memory';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationProps {
    links: PaginationLink[];
    currentPage: number;
    lastPage: number;
    perPage?: number;
    total?: number;
    from?: number | null;
    to?: number | null;
    className?: string;
}

export function Pagination({
    links,
    currentPage,
    lastPage,
    perPage,
    total,
    from,
    to,
    className,
}: PaginationProps) {
    const { url } = usePage();

    const activePerPage = React.useMemo(() => {
        if (perPage && (VALID_PER_PAGE_OPTIONS as readonly number[]).includes(perPage)) {
            return perPage;
        }
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
            const raw = new URLSearchParams(url.slice(queryIndex + 1)).get('per_page');
            const parsed = Number(raw);
            if ((VALID_PER_PAGE_OPTIONS as readonly number[]).includes(parsed)) {
                return parsed;
            }
        }
        return 20;
    }, [perPage, url]);

    if (lastPage <= 1 && (!total || total <= 0)) {
        return null;
    }

    const handlePerPageChange = (value: string) => {
        const nextPerPage = Number(value);
        if (typeof window === 'undefined') return;

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('per_page', String(nextPerPage));
        currentUrl.searchParams.delete('page');

        const params: Record<string, string> = {};
        currentUrl.searchParams.forEach((val, key) => {
            params[key] = val;
        });

        router.get(currentUrl.pathname, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const prevLink = links.find((l) => l.label.includes('Previous') || l.label.includes('&laquo;'));
    const nextLink = links.find((l) => l.label.includes('Next') || l.label.includes('&raquo;'));

    const cleanLabel = (label: string): string => {
        return label
            .replace('&laquo; Previous', '')
            .replace('Next &raquo;', '')
            .replace('&laquo;', '')
            .replace('&raquo;', '')
            .trim();
    };

    return (
        <div
            className={cn(
                'p-3 sm:p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground',
                className
            )}
        >
            {/* Context Info & Per-Page Selector */}
            <div className="w-full sm:w-auto flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <div>
                    {from && to && total ? (
                        <span>
                            Menampilkan <strong className="text-foreground font-mono">{from}</strong> -{' '}
                            <strong className="text-foreground font-mono">{to}</strong> dari{' '}
                            <strong className="text-foreground font-mono">{total}</strong> data
                        </span>
                    ) : total ? (
                        <span>
                            Total <strong className="text-foreground font-mono">{total}</strong> data
                        </span>
                    ) : (
                        <span>
                            Halaman <strong className="text-foreground font-mono">{currentPage}</strong> dari{' '}
                            <strong className="text-foreground font-mono">{lastPage}</strong>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground whitespace-nowrap">Tampilkan:</span>
                    <Select value={String(activePerPage)} onValueChange={handlePerPageChange}>
                        <SelectTrigger
                            className="h-7 w-[72px] px-2 text-xs font-mono"
                            aria-label="Jumlah baris per halaman"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {VALID_PER_PAGE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)} className="text-xs font-mono">
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Mobile Touch Bar: Large Prev / Next Buttons */}
            {lastPage > 1 && (
                <div className="flex sm:hidden items-center justify-between w-full gap-2 pt-1">
                    <Button
                        asChild={Boolean(prevLink?.url)}
                        variant="outline"
                        size="sm"
                        disabled={!prevLink?.url}
                        className="h-11 flex-1 font-semibold text-xs gap-1"
                    >
                        {prevLink?.url ? (
                            <Link href={prevLink.url} preserveScroll>
                                <ChevronLeft className="size-4" />
                                <span>Sebelumnya</span>
                            </Link>
                        ) : (
                            <span>
                                <ChevronLeft className="size-4 inline mr-1" />
                                Sebelumnya
                            </span>
                        )}
                    </Button>

                    <span className="text-xs font-semibold px-2 text-foreground font-mono">
                        {currentPage} / {lastPage}
                    </span>

                    <Button
                        asChild={Boolean(nextLink?.url)}
                        variant="outline"
                        size="sm"
                        disabled={!nextLink?.url}
                        className="h-11 flex-1 font-semibold text-xs gap-1"
                    >
                        {nextLink?.url ? (
                            <Link href={nextLink.url} preserveScroll>
                                <span>Berikutnya</span>
                                <ChevronRight className="size-4" />
                            </Link>
                        ) : (
                            <span>
                                Berikutnya
                                <ChevronRight className="size-4 inline ml-1" />
                            </span>
                        )}
                    </Button>
                </div>
            )}

            {/* Desktop Full Numbered Links */}
            {lastPage > 1 && (
                <div className="hidden sm:flex items-center gap-1">
                    {links.map((link, idx) => {
                        const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                        const isNext = link.label.includes('Next') || link.label.includes('&raquo;');
                        const label = cleanLabel(link.label);

                        if (isPrev) {
                            return (
                                <Button
                                    key={idx}
                                    asChild={Boolean(link.url)}
                                    variant="outline"
                                    size="icon"
                                    disabled={!link.url}
                                    className="size-8"
                                    title="Halaman Sebelumnya"
                                >
                                    {link.url ? (
                                        <Link href={link.url} preserveScroll>
                                            <ChevronLeft className="size-4" />
                                            <span className="sr-only">Sebelumnya</span>
                                        </Link>
                                    ) : (
                                        <ChevronLeft className="size-4 text-muted-foreground/50" />
                                    )}
                                </Button>
                            );
                        }

                        if (isNext) {
                            return (
                                <Button
                                    key={idx}
                                    asChild={Boolean(link.url)}
                                    variant="outline"
                                    size="icon"
                                    disabled={!link.url}
                                    className="size-8"
                                    title="Halaman Berikutnya"
                                >
                                    {link.url ? (
                                        <Link href={link.url} preserveScroll>
                                            <ChevronRight className="size-4" />
                                            <span className="sr-only">Berikutnya</span>
                                        </Link>
                                    ) : (
                                        <ChevronRight className="size-4 text-muted-foreground/50" />
                                    )}
                                </Button>
                            );
                        }

                        if (label === '...') {
                            return (
                                <span key={idx} className="px-2 text-muted-foreground">
                                    ...
                                </span>
                            );
                        }

                        return (
                            <Button
                                key={idx}
                                asChild={Boolean(link.url && !link.active)}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url || link.active}
                                className={cn('size-8 p-0 font-mono text-xs', link.active && 'pointer-events-none')}
                            >
                                {link.url && !link.active ? (
                                    <Link href={link.url} preserveScroll>
                                        {label}
                                    </Link>
                                ) : (
                                    <span>{label}</span>
                                )}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
