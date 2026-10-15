import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    riskNote?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'default';
    isLoading?: boolean;
    onConfirm: () => void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    riskNote,
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    variant = 'default',
    isLoading = false,
    onConfirm,
}: ConfirmDialogProps) {
    const isDestructive = variant === 'destructive';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        {isDestructive ? (
                            <AlertCircle className="size-5 text-destructive shrink-0" />
                        ) : (
                            <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                        )}
                        <span>{title}</span>
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm pt-1">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                {riskNote && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed font-medium">
                        {riskNote}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="text-xs h-9"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        variant={isDestructive ? 'destructive' : 'default'}
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="text-xs h-9 font-semibold gap-1.5"
                    >
                        {isLoading && <Loader2 className="size-3.5 animate-spin" />}
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
