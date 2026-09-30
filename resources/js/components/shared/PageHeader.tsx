import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
    title: string;
    description?: string;
    eyebrow?: {
        icon?: LucideIcon;
        label: string;
    };
    icon?: LucideIcon;
    badge?: React.ReactNode;
    backHref?: string;
    backLabel?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    eyebrow,
    icon: TitleIcon,
    badge,
    backHref,
    backLabel,
    children,
    className,
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5 mb-6',
                className
            )}
        >
            <div className="flex items-start sm:items-center gap-3">
                {backHref && (
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                        title={backLabel || 'Kembali'}
                    >
                        <Link href={backHref}>
                            <ArrowLeft className="size-4" />
                            <span className="sr-only">{backLabel || 'Kembali'}</span>
                        </Link>
                    </Button>
                )}
                <div>
                    {eyebrow && (
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            {eyebrow.icon && <eyebrow.icon className="size-3.5 text-primary" />}
                            <span>{eyebrow.label}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                            {TitleIcon && <TitleIcon className="size-6 text-primary shrink-0" />}
                            <span>{title}</span>
                        </h1>
                        {badge}
                    </div>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {children && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
