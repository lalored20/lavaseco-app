import { useEffect, useState } from 'react';
import { searchInvoices } from '@/lib/actions/billing';
import { upsertInvoices } from '@/lib/billing/offline-storage';
import { toast } from 'sonner';

export function useDataReplicator() {
    const [isReplicating, setIsReplicating] = useState(false);

    useEffect(() => {
        const replicateData = async () => {
            // Only replicate if online
            if (!navigator.onLine) return;

            try {
                // Fetch recent history (e.g., last 100 or last 1000)
                // For "Premium" experience, we might want to fetch more or use a cursor.
                // For now, let's fetch page 1 with a larger limit to get recent context.
                // Or simply fetch frequently used data.

                // Let's grab the last 200 items to start ensuring the cache is hot.
                // In a real production app, this should be incremental (since last sync).

                // console.log("Starting background replication...");

                // Fetch last 100 invoices
                const response = await searchInvoices('', 1, 100);

                if (response.success && response.data) {
                    await upsertInvoices(response.data);
                    // console.log("Replicated 100 invoices to local DB.");
                }

            } catch (error) {
                console.error("Replication failed:", error);
            }
        };

        // Run on mount
        if (typeof window !== 'undefined') {
            replicateData();

            // And maybe every 5 minutes?
            const interval = setInterval(replicateData, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, []);

    return isReplicating;
}
