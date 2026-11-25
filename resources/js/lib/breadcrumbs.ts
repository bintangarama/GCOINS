import type { BreadcrumbItem } from '@/types/navigation';

/**
 * Resolves standard breadcrumb items automatically based on the current URL and optional page title.
 */
export function resolveDefaultBreadcrumbs(url: string, title?: string): BreadcrumbItem[] {
    const cleanUrl = url.split('?')[0].split('#')[0];

    const homeItem: BreadcrumbItem = { title: 'Dashboard', href: '/dashboard' };

    // Home / Dashboard
    if (cleanUrl === '/' || cleanUrl === '/dashboard') {
        return [homeItem];
    }

    // Vouchers Module
    if (cleanUrl.startsWith('/vouchers')) {
        const moduleItem: BreadcrumbItem = { title: 'Bon Kas Kecil', href: '/vouchers' };
        if (cleanUrl === '/vouchers') {
            return [homeItem, moduleItem, { title: 'Daftar Bon', href: '/vouchers' }];
        }
        if (cleanUrl === '/vouchers/create') {
            return [homeItem, moduleItem, { title: 'Ajukan Bon', href: '/vouchers/create' }];
        }
        if (cleanUrl === '/vouchers/pending') {
            return [homeItem, moduleItem, { title: 'Antrean Persetujuan', href: '/vouchers/pending' }];
        }
        if (cleanUrl === '/vouchers/settlement') {
            return [homeItem, moduleItem, { title: 'Penyelesaian Bon', href: '/vouchers/settlement' }];
        }
        if (cleanUrl === '/vouchers/settlements') {
            return [homeItem, moduleItem, { title: 'Riwayat Rekap', href: '/vouchers/settlements' }];
        }
        if (cleanUrl.startsWith('/vouchers/settlements/')) {
            return [
                homeItem,
                moduleItem,
                { title: 'Riwayat Rekap', href: '/vouchers/settlements' },
                { title: title || 'Detail Rekap', href: cleanUrl },
            ];
        }
        return [homeItem, moduleItem, { title: title || 'Detail Bon', href: cleanUrl }];
    }

    // Cash Opname Module
    if (cleanUrl.startsWith('/opname')) {
        const moduleItem: BreadcrumbItem = { title: 'Cash Opname', href: '/opname' };
        if (cleanUrl === '/opname') {
            return [homeItem, moduleItem, { title: 'Riwayat Opname', href: '/opname' }];
        }
        if (cleanUrl === '/opname/active') {
            return [homeItem, moduleItem, { title: 'Sesi Aktif', href: '/opname/active' }];
        }
        if (cleanUrl.endsWith('/report')) {
            return [homeItem, moduleItem, { title: 'Berita Acara (BACO)', href: cleanUrl }];
        }
        return [homeItem, moduleItem, { title: title || 'Detail Sesi', href: cleanUrl }];
    }

    // Mutasi BRI Module
    if (cleanUrl.startsWith('/bri-funds')) {
        const moduleItem: BreadcrumbItem = { title: 'Mutasi BRI', href: '/bri-funds' };
        if (cleanUrl === '/bri-funds') {
            return [homeItem, moduleItem, { title: 'Ringkasan Saldo', href: '/bri-funds' }];
        }
        if (cleanUrl === '/bri-funds/postings') {
            return [homeItem, moduleItem, { title: 'Riwayat Mutasi', href: '/bri-funds/postings' }];
        }
        if (cleanUrl === '/bri-funds/create') {
            return [homeItem, moduleItem, { title: 'Catat Mutasi', href: '/bri-funds/create' }];
        }
        if (cleanUrl === '/bri-funds/pending') {
            return [homeItem, moduleItem, { title: 'Antrean Persetujuan', href: '/bri-funds/pending' }];
        }
        if (cleanUrl.startsWith('/bri-funds/entity/')) {
            const rawEntity = cleanUrl.replace('/bri-funds/entity/', '');
            const decodedEntity = decodeURIComponent(rawEntity);
            return [homeItem, moduleItem, { title: decodedEntity || title || 'Rincian Rekanan', href: cleanUrl }];
        }
        return [homeItem, moduleItem, { title: title || 'Mutasi BRI', href: cleanUrl }];
    }

    // Administrasi Module
    if (cleanUrl.startsWith('/admin')) {
        const moduleItem: BreadcrumbItem = { title: 'Administrasi', href: '/admin/users' };
        if (cleanUrl === '/admin/users') {
            return [homeItem, moduleItem, { title: 'Kelola Pengguna', href: '/admin/users' }];
        }
        if (cleanUrl === '/admin/store-settings') {
            return [homeItem, moduleItem, { title: 'Pengaturan Toko', href: '/admin/store-settings' }];
        }
        if (cleanUrl === '/admin/categories') {
            return [homeItem, moduleItem, { title: 'Kategori Kas Kecil', href: '/admin/categories' }];
        }
        if (cleanUrl === '/admin/audit-logs') {
            return [homeItem, moduleItem, { title: 'Log Aktivitas', href: '/admin/audit-logs' }];
        }
        if (cleanUrl === '/admin/import-export') {
            return [homeItem, moduleItem, { title: 'Ekspor & Impor Data', href: '/admin/import-export' }];
        }
        return [homeItem, moduleItem, { title: title || 'Administrasi', href: cleanUrl }];
    }

    // Profile
    if (cleanUrl.startsWith('/profile')) {
        return [homeItem, { title: 'Profil & Ubah PIN', href: '/profile' }];
    }

    // Notifications
    if (cleanUrl.startsWith('/notifications')) {
        return [homeItem, { title: 'Pusat Notifikasi', href: '/notifications' }];
    }

    // Fallback if title is provided
    if (title) {
        return [homeItem, { title, href: cleanUrl }];
    }

    return [];
}
