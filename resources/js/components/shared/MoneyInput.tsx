import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { centsToRupiah, rupiahToCents } from '@/lib/money';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value: number; // in cents
    onChange: (cents: number) => void;
    error?: string;
    maxCents?: number;
}

export function MoneyInput({
    value,
    onChange,
    error,
    maxCents,
    className,
    disabled,
    placeholder = '0',
    ...props
}: MoneyInputProps) {
    const formatDisplay = (cents: number): string => {
        if (!cents || isNaN(cents)) return '';
        const rupiah = centsToRupiah(cents);
        return rupiah.toLocaleString('id-ID');
    };

    const [displayValue, setDisplayValue] = useState<string>(formatDisplay(value));

    useEffect(() => {
        const formatted = formatDisplay(value);
        if (formatted !== displayValue) {
            setDisplayValue(formatted);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawDigits = e.target.value.replace(/[^0-9]/g, '');
        if (!rawDigits) {
            setDisplayValue('');
            onChange(0);
            return;
        }

        const rupiah = parseInt(rawDigits, 10);
        let cents = rupiahToCents(rupiah);

        if (maxCents && cents > maxCents) {
            cents = maxCents;
        }

        setDisplayValue(centsToRupiah(cents).toLocaleString('id-ID'));
        onChange(cents);
    };

    return (
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-xs font-semibold text-muted-foreground select-none font-mono">Rp</span>
            </div>
            <Input
                {...props}
                type="text"
                inputMode="numeric"
                disabled={disabled}
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={cn('pl-9 font-mono text-sm tracking-wide', error && 'border-destructive focus-visible:ring-destructive', className)}
            />
        </div>
    );
}
