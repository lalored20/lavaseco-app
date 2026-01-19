"use client";

import { useEffect, useState } from 'react';
import { getPendingInvoices } from '@/lib/billing/offline-storage';
import { useInvoiceSync } from '@/hooks/useInvoiceSync';
import { WifiOff, RefreshCw } from 'lucide-react';

export function SyncStatusBanner() {
    const [pendingCount, setPendingCount] = useState(0);
    const { syncPendingInvoices, isSyncing } = useInvoiceSync();

    useEffect(() => {
        const checkPending = async () => {
            try {
                const pending = await getPendingInvoices();
                setPendingCount(pending.length);
            } catch (e) {
                console.error("Error checking pending invoices", e);
            }
        };

        checkPending();
        // Poll every 5 seconds to update count if changed from other tabs/actions
        const interval = setInterval(checkPending, 5000);
        return () => clearInterval(interval);
    }, [isSyncing]); // Update when syncing state changes

    const handleSync = async () => {
        await syncPendingInvoices();
        // Count will update automatically via effect polling or could force update here
        const remaining = await getPendingInvoices();
        setPendingCount(remaining.length);
    };

    if (pendingCount === 0) return null;

    return (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
                <WifiOff className="text-orange-500 h-6 w-6" />
                <div>
                    <p className="font-bold text-orange-700">Modo Contingencia</p>
                    <p className="text-sm text-orange-600">
                        Tienes <span className="font-bold">{pendingCount} facturas</span> guardadas localmente.
                    </p>
                </div>
            </div>
            <button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
                {isSyncing ? <RefreshCw className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                {isSyncing ? "Subiendo..." : "Sincronizar Ahora"}
            </button>
        </div>
    );
}
