"use client";

import { useState, useEffect } from 'react';
import { getAllPendingInvoices, updateLogisticsStatus, deliverOrder } from '@/lib/actions/billing';
import { searchLocalInvoices, updateInvoice } from '@/lib/billing/offline-storage';
import { toast } from 'sonner';

// --- HELPER: ALERT LEVEL LOGIC (Shared) ---
export const getAlertLevel = (scheduledDate: string, createdAt: string) => {
    if (!scheduledDate) return 'none';
    const now = new Date();
    const delivery = new Date(scheduledDate);

    // Normalize to midnight for fair day gap calc
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deliveryZero = new Date(delivery.getFullYear(), delivery.getMonth(), delivery.getDate());

    const diffTime = deliveryZero.getTime() - todayZero.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate duration for special rule
    const created = new Date(createdAt);
    const createdZero = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const totalDuration = Math.ceil((deliveryZero.getTime() - createdZero.getTime()) / (1000 * 60 * 60 * 24));

    // Rule 1: Overdue (Vencido) -> Red Strong
    if (daysLeft < 0) return 'overdue';

    // Rule 2: Today (Mismo día) -> Red
    if (daysLeft === 0) return 'urgent';

    // Rule 4: Special Rule for Long Duration (>= 4 days)
    if (totalDuration >= 4 && daysLeft <= 1) {
        return 'urgent'; // Red even if 1 day left
    }

    // Rule 3: 1 Day Before (Mañana) -> Yellow
    if (daysLeft === 1) return 'warning';

    return 'normal';
};

export function useInvoices() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial Fetch (Offline First: Local Dexie -> Server Sync state)
    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true);
            try {
                // 1. Fetch Local Data (Immediate)
                const localData = await searchLocalInvoices('', 1000);

                // Transform Local Data to UI Shape
                const mappedLocal = localData.map((inv: any) => {
                    // Normalize Status from Dexie or Default
                    // If created locally, might not have 'orderStatus' yet, assume 'PENDIENTE'
                    const rawStatus = inv.orderStatus || inv.status === 'SYNCED' ? inv.payment?.status : 'PENDIENTE';
                    // Wait, inv.status in Dexie is SyncStatus. We need Business Status.
                    // If not present, default to 'PENDIENTE' logic.

                    // Logic from server enrich:
                    let logStatus = 'pending';
                    const busStatus = inv.orderStatus || 'PENDIENTE'; // Default business status

                    if (busStatus === 'PROBLEMA') logStatus = 'incomplete';
                    if (busStatus === 'EN_PROCESO') logStatus = 'complete';
                    if (busStatus === 'delivered') logStatus = 'delivered'; // Filter out later

                    return {
                        ...inv,
                        // Ensure ID is string
                        id: inv.id,
                        // Normalize Dates (Dexie stores numeric timestamps usually)
                        createdAt: typeof inv.createdAt === 'number' ? new Date(inv.createdAt).toISOString() : inv.createdAt,
                        scheduledDate: inv.dates?.delivery ? (typeof inv.dates.delivery === 'number' ? new Date(inv.dates.delivery).toISOString() : inv.dates.delivery) : null,

                        status: busStatus,
                        logisticsStatus: logStatus,
                        items: inv.items || [],
                        updatedAt: inv.updatedAt || (typeof inv.createdAt === 'number' ? new Date(inv.createdAt).toISOString() : inv.createdAt)
                    };
                });

                // Filter out delivered items (Logistics View shouldn't see delivered usually, or maybe organize view doesnt)
                // Org view filters: !complete && !delivered
                setInvoices(mappedLocal);

            } catch (error) {
                console.error("Error fetching local invoices:", error);
                toast.error("Error cargando facturas locales");
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, []);

    const refreshInvoices = async () => {
        const localData = await searchLocalInvoices('', 1000);
        const mappedLocal = localData.map((inv: any) => {
            const busStatus = inv.orderStatus || 'PENDIENTE';
            let logStatus = 'pending';
            if (busStatus === 'PROBLEMA') logStatus = 'incomplete';
            if (busStatus === 'EN_PROCESO') logStatus = 'complete';

            return {
                ...inv,
                createdAt: typeof inv.createdAt === 'number' ? new Date(inv.createdAt).toISOString() : inv.createdAt,
                scheduledDate: inv.dates?.delivery ? (typeof inv.dates.delivery === 'number' ? new Date(inv.dates.delivery).toISOString() : inv.dates.delivery) : null,
                status: busStatus,
                logisticsStatus: logStatus
            };
        });
        setInvoices(mappedLocal);
    };

    // --- ACTIONS (Updated to work with Local DB + Server) ---

    const updateInvoiceStatus = async (id: string, newStatus: string) => {
        // 1. Optimistic Update (UI)
        setInvoices(prev => prev.map(inv => {
            if (inv.id === id) {
                let optimisticStatus = inv.status;
                if (newStatus === 'incomplete') optimisticStatus = 'PROBLEMA';
                if (newStatus === 'complete') optimisticStatus = 'EN_PROCESO';

                return { ...inv, logisticsStatus: newStatus, status: optimisticStatus, updatedAt: new Date().toISOString() };
            }
            return inv;
        }));

        // 2. Map to Business Action & Status
        let action: 'organize' | 'missing' | 'found' = 'organize';
        let businessStatus = 'PENDIENTE'; // Default

        if (newStatus === 'incomplete') {
            action = 'missing';
            businessStatus = 'PROBLEMA';
        }
        if (newStatus === 'complete') {
            action = 'organize';
            businessStatus = 'EN_PROCESO';
        }

        // 3. Update Local DB (Persistence)
        await updateInvoice(id, {
            orderStatus: businessStatus,
            updatedAt: new Date().toISOString()
        });

        // 4. Update Server (Background)
        await updateLogisticsStatus(id, action);

        // 5. Update Local UI list removal (Optional delay)
        if (newStatus === 'complete') {
            setTimeout(() => {
                setInvoices(prev => prev.filter(inv => inv.id !== id));
            }, 1000);
        }
    };

    const markFound = async (id: string) => {
        setInvoices(prev => prev.map(inv =>
            inv.id === id
                ? { ...inv, logisticsStatus: 'complete', status: 'EN_PROCESO' }
                : inv
        ));
        await updateLogisticsStatus(id, 'found');
    };

    const deliverInvoice = async (id: string) => {
        // 1. Optimistic Update (Update status instead of removing, so History page can see it if sharing state or after refetch)
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'delivered', orderStatus: 'delivered', deliveryDate: new Date().toISOString() } : inv));

        // 2. Update Local DB
        await updateInvoice(id, {
            orderStatus: 'delivered',
            status: 'PENDING_UPDATE', // Mark for sync
            deliveryDate: new Date().toISOString()
        });

        // 3. Server Action
        await deliverOrder(id);
        return true;
    };

    // --- ITEM-LEVEL TRACKING ---

    const markItemReceived = (invoiceId: string, itemId: string) => {
        setInvoices(prev => prev.map(inv => {
            if (inv.id === invoiceId) {
                const updatedItems = inv.items.map((item: any) =>
                    item.id === itemId ? { ...item, received: true, missing: false } : item
                );
                return { ...inv, items: updatedItems };
            }
            return inv;
        }));

        // Log activity
        const log = {
            type: 'ITEM_RECEIVED',
            description: `Prenda marcada como recibida`,
            date: new Date().toISOString()
        };
        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${invoiceId}`) || '[]');
        localStorage.setItem(`lavaseco_logs_${invoiceId}`, JSON.stringify([...existingLogs, log]));
    };

    const markItemMissing = (invoiceId: string, itemId: string) => {
        setInvoices(prev => prev.map(inv => {
            if (inv.id === invoiceId) {
                const updatedItems = inv.items.map((item: any) =>
                    item.id === itemId ? { ...item, received: false, missing: true } : item
                );
                return { ...inv, items: updatedItems, logisticsStatus: 'incomplete', status: 'PROBLEMA' };
            }
            return inv;
        }));

        // Log activity
        const log = {
            type: 'ITEM_MISSING',
            description: `Prenda marcada como faltante`,
            date: new Date().toISOString()
        };
        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${invoiceId}`) || '[]');
        localStorage.setItem(`lavaseco_logs_${invoiceId}`, JSON.stringify([...existingLogs, log]));

        // Update server
        updateLogisticsStatus(invoiceId, 'missing');
    };

    const markItemFoundAgain = async (invoiceId: string, itemId: string) => {
        setInvoices(prev => prev.map(inv => {
            if (inv.id === invoiceId) {
                const updatedItems = inv.items.map((item: any) =>
                    item.id === itemId ? { ...item, received: true, missing: false } : item
                );

                // Check if all items are now received
                const allReceived = updatedItems.every((item: any) => item.received === true);

                return {
                    ...inv,
                    items: updatedItems,
                    logisticsStatus: allReceived ? 'complete' : 'incomplete',
                    status: allReceived ? 'EN_PROCESO' : 'PROBLEMA'
                };
            }
            return inv;
        }));

        // Log activity
        const log = {
            type: 'ITEM_FOUND',
            description: `Prenda faltante encontrada`,
            date: new Date().toISOString()
        };
        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${invoiceId}`) || '[]');
        localStorage.setItem(`lavaseco_logs_${invoiceId}`, JSON.stringify([...existingLogs, log]));

        await updateLogisticsStatus(invoiceId, 'found');
    };

    const completeLogistics = async (invoiceId: string) => {
        // Check if all items are received
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        const allReceived = invoice.items.every((item: any) => item.received === true);

        if (!allReceived) {
            toast.error('No puedes completar la revisión con prendas pendientes');
            return;
        }

        // Update to complete
        setInvoices(prev => prev.map(inv =>
            inv.id === invoiceId
                ? { ...inv, logisticsStatus: 'complete', status: 'EN_PROCESO' }
                : inv
        ));

        // Log activity
        const log = {
            type: 'LOGISTICS_COMPLETE',
            description: `Revisión logística completada - Listo para entrega`,
            date: new Date().toISOString()
        };
        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${invoiceId}`) || '[]');
        localStorage.setItem(`lavaseco_logs_${invoiceId}`, JSON.stringify([...existingLogs, log]));

        await updateLogisticsStatus(invoiceId, 'organize');

        toast.success('Revisión completada', {
            description: 'La factura está lista para entrega'
        });

        // Remove from current view after a moment
        setTimeout(() => {
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        }, 1500);
    };

    // --- SELECTORS / VIEWS ---

    const getOrganizeInvoices = (searchTerm: string = '') => {
        const today = new Date(); // Use real date

        return invoices.filter(inv => {
            // Must be pending logistics
            // if (inv.logisticsStatus === 'incomplete') return false; // CHANGED: User wants them visible
            if (inv.logisticsStatus === 'complete') return false;
            // If already processed (shouldn't be in list usually, but check)
            if (inv.status === 'EN_PROCESO') return false;

            // Search Override
            if (searchTerm.trim().length > 0) {
                const term = searchTerm.toLowerCase();
                const matches =
                    (inv.ticketNumber?.toString() || '').includes(term) ||
                    (inv.client?.name?.toLowerCase() || '').includes(term) ||
                    (inv.client?.phone?.includes(term));
                if (matches) return true;
            }

            // Date Rules
            const created = new Date(inv.createdAt);
            const scheduled = inv.scheduledDate ? new Date(inv.scheduledDate) : new Date(today.getTime() + 86400000);

            // 1. Created Yesterday or before (>= 1 day old)
            // Diff in ms
            const diffCreated = today.getTime() - created.getTime();
            const daysSinceCreation = diffCreated / (1000 * 3600 * 24);

            // Logic: Created on Jan 14 (Yesterday) -> Diff 1 day. Show.
            // Created on Jan 15 (Today) -> Diff 0. Show immediately (changed from 0.8).
            if (daysSinceCreation >= 0) return true; // Show all, even if just created

            // 2. Due Date Proximity (e.g. 2 days before due)
            // If due today or tomorrow.
            const diffDue = scheduled.getTime() - today.getTime();
            const daysUntilDue = diffDue / (1000 * 3600 * 24);

            if (daysUntilDue <= 2) return true;

            return false;
        });
    };

    const getMissingInvoices = () => {
        return invoices.filter(inv => {
            const alertLevel = getAlertLevel(inv.scheduledDate, inv.createdAt);

            // 1. Explicitly marked incomplete/missing (PROBLEMA)
            if (inv.status === 'PROBLEMA' || inv.logisticsStatus === 'incomplete') {
                // If Alert Level is NORMAL (Green/A Tiempo), do NOT show in Missing list yet.
                // It should stay in Organize list as "TODAVÍA NO ESTÁ" until it becomes Warning/Urgent.
                if (alertLevel === 'normal') return false;
                return true;
            }

            // 2. Automatic Rule: Overdue or Urgent (and NOT processed)
            if (inv.status === 'PENDIENTE' && inv.logisticsStatus !== 'complete' && inv.status !== 'delivered') {
                if (alertLevel === 'overdue' || alertLevel === 'urgent' || alertLevel === 'warning') {
                    return true;
                }
            }

            return false;
        });
    };

    return {
        invoices,
        loading,
        refreshInvoices,
        updateInvoiceStatus,
        markFound,
        getOrganizeInvoices,
        getMissingInvoices,
        deliverInvoice,
        markItemReceived,
        markItemMissing,
        markItemFoundAgain,
        completeLogistics
    };
}
