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
import { Home } from 'lucide-react';
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

    return (
        <Breadcrumb className={cn('text-xs sm:text-sm', className)}>
            <BreadcrumbList>
                {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const isHome = index === 0 && (item.title.toLowerCase() === 'dashboard' || item.href === '/dashboard');

                    return (
                        <Fragment key={`${item.href}-${index}`}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage className="font-medium text-foreground">
                                        {isHome && <Home className="size-3.5 mr-1.5 inline shrink-0" />}
                                        {item.title}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={item.href} className="inline-flex items-center">
                                            {isHome && <Home className="size-3.5 mr-1.5 inline shrink-0" />}
                                            {item.title}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
