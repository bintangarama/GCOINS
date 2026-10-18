import { Link } from '@inertiajs/react';
import { Fragment } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Breadcrumbs({
    breadcrumbs,
    className,
}: {
    breadcrumbs: BreadcrumbItemType[];
    className?: string;
}) {
    if (!breadcrumbs || breadcrumbs.length === 0) {
        return null;
    }

    const parentItem = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;
    const currentItem = breadcrumbs[breadcrumbs.length - 1];

    return (
        <div className="min-w-0">
            {/* Mobile View (< sm): Compact Parent Back-Link & Active Page */}
            <div className="flex sm:hidden items-center gap-1.5 min-w-0">
                {parentItem ? (
                    <>
                        <Link
                            href={parentItem.href}
                            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 py-0.5 pr-1 -ml-0.5 rounded hover:bg-muted/60 transition-colors"
                            title={`Kembali ke ${parentItem.title}`}
                        >
                            <ChevronLeft className="size-4 shrink-0 -ml-0.5" />
                            <span className="max-w-[85px] truncate">{parentItem.title}</span>
                        </Link>
                        <span className="text-muted-foreground/40 text-xs shrink-0 select-none">/</span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                            {currentItem.title}
                        </span>
                    </>
                ) : (
                    <div className="flex items-center text-xs font-semibold text-foreground truncate">
                        <Home className="size-3.5 mr-1.5 inline shrink-0 text-muted-foreground" />
                        <span className="truncate">{currentItem.title}</span>
                    </div>
                )}
            </div>

            {/* Desktop View (>= sm): Full Breadcrumb Trail */}
            <Breadcrumb className={cn('hidden sm:block text-xs sm:text-sm overflow-hidden', className)}>
                <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-hidden text-ellipsis items-center gap-1.5 sm:gap-2">
                    {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        const isHome = index === 0 && (item.title.toLowerCase() === 'dashboard' || item.href === '/dashboard');

                        return (
                            <Fragment key={`${item.href}-${index}`}>
                                <BreadcrumbItem className="inline-flex items-center truncate min-w-0">
                                    {isLast ? (
                                        <BreadcrumbPage className="font-medium text-foreground inline-flex items-center max-w-[150px] sm:max-w-[220px] md:max-w-xs truncate">
                                            {isHome && <Home className="size-3.5 mr-1.5 inline shrink-0 text-muted-foreground" />}
                                            <span className="truncate">{item.title}</span>
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={item.href}
                                                className="inline-flex items-center max-w-[100px] sm:max-w-[160px] truncate text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {isHome && <Home className="size-3.5 mr-1.5 inline shrink-0 text-muted-foreground" />}
                                                <span className="truncate">{item.title}</span>
                                            </Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {!isLast && <BreadcrumbSeparator className="shrink-0 text-muted-foreground/50" />}
                            </Fragment>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}
