import React from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
}

interface DataTableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode;
    className?: string;
}

interface DataTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode;
    className?: string;
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

interface DataTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
    mono?: boolean;
}

interface DataTableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
}

interface DataTableEmptyProps {
    icon?: React.ReactNode;
    message: string;
    description?: string;
    action?: React.ReactNode;
    colSpan: number;
}

/**
 * Standardized DataTable components for consistent styling across all pages.
 * Follows the design system from 10-ui-ux-specification.md.
 */
export function DataTable({ children, className, containerClassName, ...props }: DataTableProps) {
    return (
        <div className={cn('overflow-x-auto [scrollbar-width:thin]', containerClassName)}>
            <table className={cn('w-full text-sm text-left border-collapse', className)} {...props}>
                {children}
            </table>
        </div>
    );
}

export function DataTableHead({ children, className, ...props }: DataTableHeadProps) {
    return (
        <thead
            className={cn(
                'bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider font-semibold border-b border-border select-none',
                className
            )}
            {...props}
        >
            {children}
        </thead>
    );
}

export function DataTableBody({ children, className, ...props }: DataTableBodyProps) {
    return (
        <tbody className={cn('divide-y divide-border bg-card', className)} {...props}>
            {children}
        </tbody>
    );
}

export function DataTableRow({ children, className, onClick, ...props }: DataTableRowProps) {
    return (
        <tr
            onClick={onClick}
            className={cn(
                'hover:bg-muted/40 transition-colors',
                onClick && 'cursor-pointer focus:bg-muted/60',
                className
            )}
            {...props}
        >
            {children}
        </tr>
    );
}

export function DataTableCell({ children, className, align = 'left', mono, ...props }: DataTableCellProps) {
    return (
        <td
            className={cn(
                'py-3.5 px-4 text-sm text-foreground',
                align === 'center' && 'text-center',
                align === 'right' && 'text-right',
                mono && 'font-mono num',
                className
            )}
            {...props}
        >
            {children}
        </td>
    );
}

export function DataTableHeaderCell({ children, className, align = 'left', ...props }: DataTableHeaderCellProps) {
    return (
        <th
            className={cn(
                'py-3 px-4 font-semibold text-xs',
                align === 'center' && 'text-center',
                align === 'right' && 'text-right',
                className
            )}
            {...props}
        >
            {children}
        </th>
    );
}

export function DataTableEmpty({ icon, message, description, action, colSpan }: DataTableEmptyProps) {
    return (
        <tr>
            <td colSpan={colSpan} className="py-12 sm:py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto px-4">
                    {icon && <div className="text-muted-foreground/60 mb-1">{icon}</div>}
                    <p className="text-sm font-semibold text-foreground">{message}</p>
                    {description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                    )}
                    {action && <div className="mt-3">{action}</div>}
                </div>
            </td>
        </tr>
    );
}

/**
 * Mobile card list container: used to present tables as stacked touch cards on small screens.
 */
export function DataTableMobileList({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('divide-y divide-border sm:hidden', className)}>
            {children}
        </div>
    );
}

export function DataTableMobileCard({
    children,
    onClick,
    className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'p-4 bg-card hover:bg-muted/30 transition-colors flex flex-col gap-2.5',
                onClick && 'cursor-pointer active:bg-muted/50',
                className
            )}
        >
            {children}
        </div>
    );
}
