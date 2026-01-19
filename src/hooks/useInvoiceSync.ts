
import { useState, useEffect } from 'react';
import { saveInvoiceLocally, getPendingInvoices, markInvoiceAsSynced, type OfflineInvoice } from '@/lib/billing/offline-storage';
import { toast } from 'sonner';

export function useInvoiceSync() {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Monitor Network Status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success("Conexión restaurada. Sincronizando facturas...");
            syncPendingInvoices(); // Trigger sync immediately
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.warning("Modo Offline activado. Las facturas se guardarán localmente.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 2. Background Sync Loop (Every 60s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (isOnline) syncPendingInvoices();
        }, 60000);
        return () => clearInterval(interval);
    }, [isOnline]);

    // 3. Core Sync Function
    const syncPendingInvoices = async () => {
        if (isSyncing || !navigator.onLine) return;

        const pending = await getPendingInvoices();
        if (pending.length === 0) return;

        setIsSyncing(true);
        console.log(`[SYNC] Found ${pending.length} pending invoices.`);

        for (const invoice of pending) {
            try {
                // Determine Method based on Status
                const method = invoice.status === 'PENDING_UPDATE' ? 'PUT' : 'POST';
                console.log(`[SYNC] Processing ${invoice.id} with ${method}`);

                // Send to API
                const response = await fetch('/api/orders', {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(invoice)
                });

                if (response.ok) {
                    await markInvoiceAsSynced(invoice.id);
                    console.log(`[SYNC] Invoice ${invoice.id} synced successfully.`);
                    toast.success(method === 'PUT' ? `Factura actualizada y sincronizada.` : `Factura nueva sincronizada.`);
                } else {
                    console.error(`[SYNC] Failed to sync invoice ${invoice.id}:`, await response.text());
                }
            } catch (error) {
                console.error(`[SYNC] Network error syncing invoice ${invoice.id}:`, error);
            }
        }
        setIsSyncing(false);
    };

    // 4. Public Function to Submit Invoice (Smart Routing)
    // 4. Public Function to Submit Invoice (Optimized for Speed: Local + Background Sync)
    const createSmartInvoice = async (invoiceData: any) => {
        try {
            // ALWAYS save locally first (The "Local-First" Rule) - This is fast
            const uuid = await saveInvoiceLocally(invoiceData);

            // Trigger Sync in Background (Non-blocking "Fire and Forget")
            if (navigator.onLine) {
                // We do NOT await this. We let it run in the background.
                // This ensures the UI unblocks immediately.
                syncPendingInvoices().catch(err => console.error("Background sync error:", err));
            }

            // Return immediately to unblock UI
            return { success: true, mode: 'OFFLINE_FIRST', message: "Guardada en dispositivo", id: uuid };

        } catch (error) {
            console.error("Critical Error saving invoice:", error);
            return { success: false, error: "Error crítico guardando factura." };
        }
    };

    return {
        isOnline,
        isSyncing,
        createSmartInvoice,
        syncPendingInvoices
    };
}
