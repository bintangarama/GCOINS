import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';

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
    striped?: boolean;
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    selected?: boolean;
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
    sortable?: boolean;
    sortField?: string;
    currentSort?: string;
    currentDirection?: 'asc' | 'desc' | null;
    onSort?: (field: string) => void;
}

interface DataTableEmptyProps {
    icon?: React.ReactNode;
    message: string;
    description?: string;
    action?: React.ReactNode;
    colSpan: number;
}

interface DataTableBulkBarProps {
    selectedCount: number;
    totalAmountCents?: number;
    onClearSelection: () => void;
    children: React.ReactNode;
    className?: string;
}

/**
 * Standardized DataTable components for consistent styling across all pages.
 * Features:
 * - Interactive Column Sorting (asc/desc/neutral)
 * - Ergonomic Light & Dark Mode Coloring with gentle zebra striping
 * - Floating Bulk Action Bar for high-efficiency batch workflows
 */
export function DataTable({ children, className, containerClassName, ...props }: DataTableProps) {
    return (
        <div className={cn('overflow-x-auto [scrollbar-width:thin] rounded-xl border border-border bg-card shadow-xs', containerClassName)}>
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
                'bg-muted/60 text-muted-foreground uppercase text-xs tracking-wider font-semibold border-b border-border select-none backdrop-blur-xs',
                className
            )}
            {...props}
        >
            {children}
        </thead>
    );
}

export function DataTableBody({ children, className, striped = true, ...props }: DataTableBodyProps) {
    return (
        <tbody
            className={cn(
                'divide-y divide-border bg-card',
                striped && '[&>tr:nth-child(even)]:bg-muted/20',
                className
            )}
            {...props}
        >
            {children}
        </tbody>
    );
}

export function DataTableRow({
    children,
    className,
    onClick,
    selected = false,
    ...props
}: DataTableRowProps) {
    return (
        <tr
            onClick={onClick}
            className={cn(
                'transition-colors duration-150',
                selected
                    ? 'bg-primary/10 dark:bg-primary/15 hover:bg-primary/15 dark:hover:bg-primary/20 border-l-2 border-l-primary'
                    : 'hover:bg-muted/40',
                onClick && 'cursor-pointer focus:bg-muted/60',
                className
            )}
            {...props}
        >
            {children}
        </tr>
    );
}

export function DataTableCell({
    children,
    className,
    align = 'left',
    mono,
    ...props
}: DataTableCellProps) {
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

export function DataTableHeaderCell({
    children,
    className,
    align = 'left',
    sortable = false,
    sortField,
    currentSort,
    currentDirection,
    onSort,
    ...props
}: DataTableHeaderCellProps) {
    const isSorted = sortable && sortField && currentSort === sortField;

    const handleClick = () => {
        if (sortable && sortField && onSort) {
            onSort(sortField);
        }
    };

    return (
        <th
            onClick={handleClick}
            className={cn(
                'py-3 px-4 font-semibold text-xs transition-colors',
                align === 'center' && 'text-center',
                align === 'right' && 'text-right',
                sortable && 'cursor-pointer hover:text-foreground hover:bg-muted/80 select-none group',
                className
            )}
            {...props}
        >
            <div
                className={cn(
                    'inline-flex items-center gap-1.5',
                    align === 'right' && 'justify-end w-full',
                    align === 'center' && 'justify-center w-full'
                )}
            >
                <span>{children}</span>
                {sortable && (
                    <span className="shrink-0 transition-transform">
                        {isSorted ? (
                            currentDirection === 'asc' ? (
                                <ArrowUp className="size-3.5 text-primary stroke-[2.5]" />
                            ) : (
                                <ArrowDown className="size-3.5 text-primary stroke-[2.5]" />
                            )
                        ) : (
                            <ArrowUpDown className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        )}
                    </span>
                )}
            </div>
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
 * Floating Bulk Action Bar:
 * Appears fixed at the bottom center of the viewport whenever 1+ rows are selected.
 */
export function DataTableBulkBar({
    selectedCount,
    totalAmountCents,
    onClearSelection,
    children,
    className,
}: DataTableBulkBarProps) {
    if (selectedCount <= 0) return null;

    return (
        <div
            className={cn(
                'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
                'flex items-center justify-between gap-3 sm:gap-5 px-4 py-2.5',
                'bg-slate-900/95 dark:bg-slate-800/95 text-slate-100',
                'backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl',
                'max-w-2xl w-[calc(100%-2rem)] sm:w-auto',
                'animate-in fade-in slide-in-from-bottom-4 duration-200',
                className
            )}
        >
            {/* Left: Selected count & Total Amount */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
                <span className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground font-mono font-bold text-xs">
                    {selectedCount}
                </span>
                <span className="font-medium text-slate-200">
                    Dipilih
                </span>
                {totalAmountCents !== undefined && totalAmountCents > 0 && (
                    <span className="hidden sm:inline-block font-mono text-emerald-400 font-semibold border-l border-slate-700 pl-3">
                        Total {formatMoney(totalAmountCents)}
                    </span>
                )}
            </div>

            {/* Right: Actions & Clear Button */}
            <div className="flex items-center gap-2 shrink-0">
                {children}

                <button
                    type="button"
                    onClick={onClearSelection}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Batalkan pilihan"
                    aria-label="Batalkan pilihan"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * Mobile card list container: used to present tables as stacked touch cards on small screens.
 */
export function DataTableMobileList({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('divide-y divide-border sm:hidden rounded-xl border border-border bg-card overflow-hidden shadow-xs', className)}>
            {children}
        </div>
    );
}

export function DataTableMobileCard({
    children,
    onClick,
    selected = false,
    className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    selected?: boolean;
    className?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'p-4 transition-colors flex flex-col gap-2.5',
                selected
                    ? 'bg-primary/10 dark:bg-primary/15 border-l-3 border-l-primary'
                    : 'bg-card hover:bg-muted/30',
                onClick && 'cursor-pointer active:bg-muted/50',
                className
            )}
        >
            {children}
        </div>
    );
}
