
import { useState, useEffect } from 'react';
import { saveInvoiceLocally, getPendingInvoices, markInvoiceAsSynced, type OfflineInvoice, db } from '@/lib/billing/offline-storage';
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
                let response = await fetch('/api/orders', {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(invoice)
                });

                // RETRY LOGIC: If PUT failed with 404 (Not Found), it means the invoice doesn't exist on server.
                // We should try to CREATE it (POST) instead of updating.
                if (!response.ok && method === 'PUT') {
                    const errorText = await response.text();
                    if (response.status === 404 || errorText.includes("Orden no encontrada")) {
                        console.warn(`[SYNC] Invoice ${invoice.id} not found on server (404). Switching to POST to create it.`);
                        response = await fetch('/api/orders', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(invoice)
                        });
                    } else {
                        // Restore error text for logging if it wasn't a 404
                        console.error(`[SYNC] Failed to sync invoice ${invoice.id} (PUT):`, errorText);
                        // Continue to next invoice or let logic below handle it (which expects response)
                        // But we already consumed .text(), so we need to be careful.
                        // Actually, let's restructure to be cleaner.
                    }
                }

                if (response.ok) {

                    const responseData = await response.json();

                    // CRITICAL FIX: Update Local Ticket Number with Server's Authority
                    const serverTicketNumber = responseData.order?.ticketNumber || responseData.folio;

                    if (serverTicketNumber) {
                        await db.invoices.update(invoice.id, {
                            status: 'SYNCED',
                            ticketNumber: serverTicketNumber,
                            // We can also sync back other fields if needed, like created date if server overrides it
                            createdAt: new Date(responseData.order?.createdAt || invoice.createdAt).getTime()
                        });
                        console.log(`[SYNC] Invoice ${invoice.id} synced and updated to Ticket #${serverTicketNumber}`);
                    } else {
                        await markInvoiceAsSynced(invoice.id);
                        console.log(`[SYNC] Invoice ${invoice.id} synced (No ticket number returned).`);
                    }

                    // Only show toast if it confirms widespread sync, otherwise it might be spammy for batch syncs
                    // toast.success(method === 'PUT' ? `Factura actualizada.` : `Factura sincronizada.`); 
                } else {
                    // Safety check if we didn't already consume the body above
                    if (!response.bodyUsed) {
                        console.error(`[SYNC] Failed to sync invoice ${invoice.id}:`, await response.text());
                    }
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
