import React, { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, Coins, Stamp, Gift, Layers } from 'lucide-react';
import { OpnameItemCount } from '@/types/opname';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

interface CountGridProps {
    itemCounts: OpnameItemCount[];
    counts: Record<string, number>;
    onCountChange: (definitionId: string, count: number) => void;
    disabled?: boolean;
    opnameType?: string;
    submitButtonRef?: React.RefObject<HTMLButtonElement | null>;
    conditions?: Record<string, string>;
    onConditionChange?: (definitionId: string, condition: string) => void;
}

export function CountGrid({
    itemCounts,
    counts,
    onCountChange,
    disabled = false,
    opnameType = 'KAS_KECIL',
    submitButtonRef,
    conditions = {},
    onConditionChange,
}: CountGridProps) {
    // Array of refs for numpad traversal in display order
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Dynamically group items by group_label
    const groupedItems = useMemo(() => {
        const groups: Record<string, OpnameItemCount[]> = {};

        const sortedItems = [...itemCounts].sort((a, b) => {
            const orderA = a.item_definition?.sort_order ?? 999;
            const orderB = b.item_definition?.sort_order ?? 999;
            return orderA - orderB;
        });

        for (const item of sortedItems) {
            const groupName = item.item_definition?.group_label || 'Pecahan Standar';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(item);
        }

        return groups;
    }, [itemCounts]);

    // Flatten items to map index in ref array
    const orderedItems = useMemo(() => {
        return Object.values(groupedItems).flat();
    }, [groupedItems]);

    // Reset input refs length when item count changes
    inputRefs.current = inputRefs.current.slice(0, orderedItems.length);

    const getGroupIcon = (groupName: string) => {
        const lower = groupName.toLowerCase();
        if (lower.includes('kertas') || lower.includes('banknote')) {
            return <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />;
        }
        if (lower.includes('logam') || lower.includes('koin') || lower.includes('coin')) {
            return <Coins className="size-4 text-amber-600 dark:text-amber-400" />;
        }
        if (lower.includes('materai')) {
            return <Stamp className="size-4 text-indigo-600 dark:text-indigo-400" />;
        }
        if (lower.includes('voucher') || lower.includes('gift')) {
            return <Gift className="size-4 text-purple-600 dark:text-purple-400" />;
        }
        return <Layers className="size-4 text-blue-600 dark:text-blue-400" />;
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        flatIndex: number
    ) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = flatIndex + 1;
            if (nextIndex < orderedItems.length) {
                const nextInput = inputRefs.current[nextIndex];
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            } else if (submitButtonRef?.current) {
                // Focus submit/save button on the last item
                submitButtonRef.current.focus({ preventScroll: true });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = flatIndex - 1;
            if (prevIndex >= 0) {
                const prevInput = inputRefs.current[prevIndex];
                if (prevInput) {
                    prevInput.focus();
                    prevInput.select();
                }
            }
        }
    };

    let runningIndex = 0;

    return (
        <div className="space-y-6">
            {Object.entries(groupedItems).map(([groupName, items]) => {
                const groupSubtotal = items.reduce((sum, item) => {
                    const defId = item.item_definition_id;
                    const count = counts[defId] ?? item.count ?? 0;
                    const nominal = item.item_definition?.nominal_cents ?? 0;
                    return sum + count * nominal;
                }, 0);

                const groupTotalUnits = items.reduce((sum, item) => {
                    const defId = item.item_definition_id;
                    return sum + (counts[defId] ?? item.count ?? 0);
                }, 0);

                return (
                    <Card
                        key={groupName}
                        className="overflow-hidden border border-border shadow-xs bg-card"
                    >
                        <CardHeader className="bg-muted/40 px-4 py-3 sm:px-6 flex flex-row items-center justify-between border-b border-border">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-background shadow-2xs border border-border">
                                    {getGroupIcon(groupName)}
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold text-foreground">
                                        {groupName}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Total: <span className="font-mono num font-semibold text-foreground">{groupTotalUnits.toLocaleString('id-ID')}</span> unit
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                                    Subtotal
                                </span>
                                <span className="text-sm sm:text-base font-bold text-foreground font-mono num">
                                    {formatMoney(groupSubtotal)}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop & Tablet Ledger Table Rows */}
                            <ul className="divide-y divide-border">
                                {items.map((item) => {
                                    const def = item.item_definition;
                                    const defId = item.item_definition_id;
                                    const count = counts[defId] ?? item.count ?? 0;
                                    const nominal = def?.nominal_cents ?? 0;
                                    const lineSubtotal = count * nominal;
                                    const unit = def?.unit || 'Lembar';
                                    const currentIndex = runningIndex++;
                                    const condition = conditions[defId] ?? item.condition ?? 'GOOD';
                                    const isLast = currentIndex === orderedItems.length - 1;

                                    const isSpecialType =
                                        opnameType === 'MATERAI' || opnameType === 'GIFT_VOUCHER';

                                    return (
                                        <li
                                            key={item.id || defId}
                                            className={cn(
                                                'flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 transition-colors',
                                                count > 0 ? 'bg-primary/5' : 'hover:bg-muted/20'
                                            )}
                                        >
                                            {/* Denomination Info */}
                                            <div className="flex-1 min-w-0">
                                                <label
                                                    htmlFor={`count-input-${defId}`}
                                                    className="text-sm font-semibold text-foreground block cursor-pointer"
                                                >
                                                    {def?.label || formatMoney(nominal)}
                                                </label>
                                                <p className="text-xs text-muted-foreground font-mono num">
                                                    @{formatMoney(nominal)} / {unit}
                                                </p>
                                            </div>

                                            {/* Input & Condition Controls */}
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div
                                                    onClick={() => inputRefs.current[currentIndex]?.focus()}
                                                    className={cn(
                                                        'group flex h-10 w-full sm:w-36 items-center rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow] cursor-text',
                                                        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
                                                        disabled && 'opacity-50 pointer-events-none'
                                                    )}
                                                >
                                                    <input
                                                        ref={(el) => {
                                                            inputRefs.current[currentIndex] = el;
                                                        }}
                                                        id={`count-input-${defId}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        enterKeyHint={isLast ? 'done' : 'next'}
                                                        autoComplete="off"
                                                        disabled={disabled}
                                                        value={count === 0 ? '' : count}
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                            const cleanDigits = e.target.value.replace(/\D/g, '');
                                                            const val = parseInt(cleanDigits, 10);
                                                            onCountChange(defId, isNaN(val) ? 0 : Math.max(0, val));
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                        onKeyDown={(e) => handleKeyDown(e, currentIndex)}
                                                        className="h-full w-full min-w-0 flex-1 bg-transparent pl-3 pr-1 text-right font-mono num font-bold text-base text-foreground placeholder:text-muted-foreground outline-none border-0"
                                                    />
                                                    <span className="pr-3 pl-1 text-xs font-medium text-muted-foreground select-none pointer-events-none shrink-0">
                                                        {unit}
                                                    </span>
                                                </div>

                                                {isSpecialType && onConditionChange && (
                                                    <div className="w-28 shrink-0">
                                                        <Select
                                                            disabled={disabled}
                                                            value={condition}
                                                            onValueChange={(val) =>
                                                                onConditionChange(defId, val)
                                                            }
                                                        >
                                                            <SelectTrigger className="h-10 text-xs">
                                                                <SelectValue placeholder="Kondisi" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="GOOD">
                                                                    Baik
                                                                </SelectItem>
                                                                <SelectItem value="DAMAGED">
                                                                    Rusak
                                                                </SelectItem>
                                                                <SelectItem value="EXPIRED">
                                                                    Kedaluwarsa
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                {/* Subtotal column */}
                                                <div className="w-32 text-right shrink-0">
                                                    <span className="sm:hidden text-xs text-muted-foreground mr-1">Subtotal:</span>
                                                    <span className="font-mono num font-bold text-sm text-foreground">
                                                        {formatMoney(lineSubtotal)}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
