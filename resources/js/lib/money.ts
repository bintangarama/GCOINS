/**
 * Format money in integer cents to Indonesian Rupiah display format (e.g., Rp 5.000.000)
 */
export const formatMoney = (cents: number): string => {
    const rupiah = Math.trunc(cents / 100);
    if (rupiah < 0) {
        return `-Rp ${Math.abs(rupiah).toLocaleString('id-ID')}`;
    }
    return `Rp ${rupiah.toLocaleString('id-ID')}`;
};

export const formatRupiah = formatMoney;

/**
 * Convert Rupiah amount to integer cents for storage
 */
export const rupiahToCents = (rupiah: number): number => {
    return Math.round(rupiah * 100);
};

/**
 * Convert integer cents to Rupiah value
 */
export const centsToRupiah = (cents: number): number => {
    return Math.trunc(cents / 100);
};

/**
 * Parse Rupiah string input (e.g. "50.000" or "50000") to integer cents
 */
export const parseRupiahInputToCents = (input: string): number => {
    const isNegative = input.trim().startsWith('-');
    const cleanNumber = input.replace(/[^0-9]/g, '');
    const rupiah = parseInt(cleanNumber, 10) || 0;
    const cents = rupiahToCents(rupiah);
    return isNegative ? -cents : cents;
};
