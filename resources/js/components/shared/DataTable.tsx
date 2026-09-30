import React from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    children: React.ReactNode;
    className?: string;
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
export function DataTable({ children, className, ...props }: DataTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className={cn('w-full text-xs text-left', className)} {...props}>
                {children}
            </table>
        </div>
    );
}

export function DataTableHead({ children, className, ...props }: DataTableHeadProps) {
    return (
        <thead
            className={cn(
                'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800',
                className,
            )}
            {...props}
        >
            {children}
        </thead>
    );
}

export function DataTableBody({ children, className, ...props }: DataTableBodyProps) {
    return (
        <tbody className={cn('divide-y divide-slate-100 dark:divide-slate-800', className)} {...props}>
            {children}
        </tbody>
    );
}

export function DataTableRow({ children, className, onClick, ...props }: DataTableRowProps) {
    return (
        <tr
            onClick={onClick}
            className={cn(
                'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors',
                onClick && 'cursor-pointer',
                className,
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
                'py-3 px-4',
                align === 'center' && 'text-center',
                align === 'right' && 'text-right',
                mono && 'font-mono',
                className,
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
                'py-3 px-4 font-semibold',
                align === 'center' && 'text-center',
                align === 'right' && 'text-right',
                className,
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
            <td colSpan={colSpan} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                    {icon && <div className="text-slate-300 dark:text-slate-600">{icon}</div>}
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
                    {description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
                    )}
                    {action && <div className="mt-2">{action}</div>}
                </div>
            </td>
        </tr>
    );
}
