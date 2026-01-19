
import Dexie, { type Table } from 'dexie';

// Define Interface for Invoices (Offline)
export interface OfflineInvoice {
    id: string; // UUID
    ticketNumber?: number; // Optional
    client: {
        id?: string;
        cedula: string;
        name: string;
        phone: string;
    };
    items: any[];
    totalValue: number;
    payment: {
        amount: number;
        status: string;
    };
    dates: {
        created: string;
        delivery: string;
    };
    status: 'PENDING_SYNC' | 'PENDING_UPDATE' | 'SYNCED' | 'ERROR';
    createdAt: number; // Timestamp
    updatedAt?: string; // ISO String (For persistence logic)
    orderStatus?: string; // Business Status (PENDIENTE, EN_PROCESO, PROBLEMA, delivered)
    deliveryDate?: string;
}

export class LavasecoDatabase extends Dexie {
    invoices!: Table<OfflineInvoice>;

    constructor() {
        super('LavasecoDB_Billing');
        this.version(1).stores({
            invoices: 'id, status, createdAt' // Indexes
        });
    }
}

export const db = new LavasecoDatabase();

// --- Normalization Helpers ---
const normalizeId = (id: string | number | null | undefined): string => {
    if (!id) return '';
    // STRICT: Strip everything except numbers (User Request: "guardar como numero")
    return id.toString().replace(/[^0-9]/g, '');
};

const normalizePhone = (phone: string | number | null | undefined): string => {
    if (!phone) return '';
    // Strip +57, spaces, dashes. Keep only numbers.
    return phone.toString().replace(/[^0-9]/g, '');
};

// --- Helper Functions ---

export async function saveInvoiceLocally(invoiceData: any): Promise<string> {
    const invoiceUUID = crypto.randomUUID();

    const offlineInvoice: OfflineInvoice = {
        id: invoiceUUID,
        ...invoiceData,
        status: 'PENDING_SYNC',
        createdAt: Date.now()
    };

    await db.invoices.add(offlineInvoice);
    return invoiceUUID;
}

export async function getPendingInvoices() {
    return await db.invoices
        .where('status').anyOf('PENDING_SYNC', 'PENDING_UPDATE')
        .toArray();
}

export async function markInvoiceAsSynced(uuid: string) {
    await db.invoices.update(uuid, { status: 'SYNCED' });
}

// --- Advanced Replication ---

export async function upsertInvoices(invoices: any[]) {
    // Transform server invoices to OfflineInvoice format
    // Ensure we handle dates properly (server dates are strings)
    const offlineInvoices: OfflineInvoice[] = invoices.map(inv => ({
        id: inv.id,
        ticketNumber: inv.ticketNumber,
        client: {
            id: inv.clientId,
            cedula: inv.client.cedula,
            name: inv.client.name,
            phone: inv.client.phone
        },
        items: inv.items,
        totalValue: inv.totalValue || (inv.items ? inv.items.reduce((sum: number, item: any) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0) : 0),
        payment: {
            amount: inv.paidAmount || (inv.payments ? inv.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) : 0),
            status: inv.paymentStatus || 'PENDIENTE'
        },
        dates: {
            created: inv.createdAt,
            delivery: inv.scheduledDate || inv.deadline || inv.createdAt // Prioritize scheduledDate
        },
        status: 'SYNCED', // These come from server, so they are synced
        createdAt: new Date(inv.createdAt).getTime(),
        orderStatus: inv.status // Map Server Status to Local Order Status
    }));

    await db.invoices.bulkPut(offlineInvoices);
}

// Helper to detect date
function parseSmartDate(term: string) {
    const naturalDateMatch = term.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de\s+)?(\d{4}))?/i);
    const numericDateMatch = term.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/); // DD/MM/YYYY

    if (naturalDateMatch) {
        const day = parseInt(naturalDateMatch[1]);
        const monthName = naturalDateMatch[2].toLowerCase();
        const months: { [key: string]: number } = {
            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
            'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };
        if (months[monthName] !== undefined) {
            const year = naturalDateMatch[3] ? parseInt(naturalDateMatch[3]) : new Date().getFullYear();
            return { start: new Date(year, months[monthName], day, 0, 0, 0).getTime(), end: new Date(year, months[monthName], day, 23, 59, 59).getTime() };
        }
    }

    if (numericDateMatch) {
        const day = parseInt(numericDateMatch[1]);
        const month = parseInt(numericDateMatch[2]) - 1;
        const year = numericDateMatch[3] ? parseInt(numericDateMatch[3]) : new Date().getFullYear();
        if (month >= 0 && month <= 11) {
            return { start: new Date(year, month, day, 0, 0, 0).getTime(), end: new Date(year, month, day, 23, 59, 59).getTime() };
        }
    }
    return null;
}

export async function searchLocalInvoices(query: string, limit: number = 50, filters: any = {}, page: number = 1) {
    let collection = db.invoices.orderBy('createdAt').reverse();

    // Pre-calculate smart date filter if query exists
    const smartDate = query ? parseSmartDate(query) : null;

    // Dexie filtering
    return await collection.filter(invoice => {
        let matches = true;

        // 1. Term Search
        if (query) {
            if (smartDate) {
                // If it looks like a date, strictly filter by that date
                if (invoice.createdAt < smartDate.start || invoice.createdAt > smartDate.end) {
                    matches = false;
                }
            } else {
                // Normal Text/Numeric Search
                const lowerQuery = query.toLowerCase();
                const trimmedQuery = query.trim();
                const isNumeric = /^\d+$/.test(trimmedQuery);

                // Smart Logic:
                // 1. If Numeric + Length <= 4: Search ONLY Ticket Number (Invoice #)
                //    - If query has trailing space (e.g. "7 "): EXACT MATCH
                //    - If query has NO space (e.g. "7"): PARTIAL MATCH
                // 2. Otherwise: Search Everything

                if (isNumeric && trimmedQuery.length <= 4) {
                    if (query.endsWith(' ')) {
                        // Exact Match logic (Trailing space)
                        if (invoice.ticketNumber?.toString() !== trimmedQuery) matches = false;
                    } else {
                        // Partial Match logic
                        if (!invoice.ticketNumber?.toString().includes(trimmedQuery)) matches = false;
                    }
                } else {
                    // Full Search (Original Logic)
                    const ticketMatch = invoice.ticketNumber?.toString().includes(trimmedQuery);

                    const nameMatch = (invoice.client?.name || '').toLowerCase().includes(lowerQuery);

                    // Fix: Ensure normalized query is not empty to avoid matching everything
                    const normQuery = normalizeId(query);
                    const cedulaMatch = (normQuery.length > 0 && normalizeId(invoice.client?.cedula).includes(normQuery)) ||
                        (invoice.client?.cedula || '').toString().toLowerCase().includes(lowerQuery) ||
                        (invoice.client?.id || '').toString().toLowerCase().includes(lowerQuery);

                    const normPhone = normalizePhone(query);
                    const phoneMatch = (normPhone.length > 0 && normalizePhone(invoice.client?.phone).includes(normPhone)) ||
                        (invoice.client?.phone || '').toString().toLowerCase().includes(lowerQuery);

                    const itemMatch = invoice.items?.some((item: any) =>
                        (item.type || item.description || '').toLowerCase().includes(lowerQuery)
                    );

                    if (!ticketMatch && !nameMatch && !cedulaMatch && !phoneMatch && !itemMatch) {
                        matches = false;
                    }
                }
            }
        }

        if (matches && filters) {
            // Null-Safe Access for Client Fields + Force String Conversion (Fix for "Cedula fail")
            if (filters.name && !(invoice.client?.name || '').toLowerCase().includes(filters.name.toLowerCase())) matches = false;

            // CEDULA: Clean both search & store (Strict normalized check OR raw check)
            if (filters.cedula) {
                const cleanStored = normalizeId(invoice.client?.cedula);
                const cleanStoredId = normalizeId(invoice.client?.id); // FIX: Match UI Logic
                const cleanFilter = normalizeId(filters.cedula);

                const rawStored = (invoice.client?.cedula || '').toString().toLowerCase();
                const rawStoredId = (invoice.client?.id || '').toString().toLowerCase(); // FIX: Match UI Logic
                const rawFilter = filters.cedula.toLowerCase();

                if (!cleanStored.includes(cleanFilter) && !cleanStoredId.includes(cleanFilter) &&
                    !rawStored.includes(rawFilter) && !rawStoredId.includes(rawFilter)) matches = false;
            }

            // PHONE: Clean both search & store (Strict normalized check OR raw check)
            if (filters.phone) {
                const cleanStored = normalizePhone(invoice.client?.phone);
                const cleanFilter = normalizePhone(filters.phone);
                const rawStored = (invoice.client?.phone || '').toString().toLowerCase();
                const rawFilter = filters.phone.toLowerCase();

                if (!cleanStored.includes(cleanFilter) && !rawStored.includes(rawFilter)) matches = false;
            }

            if (filters.ticketNumber && invoice.ticketNumber?.toString() !== filters.ticketNumber) matches = false;

            // Description Filter (Missing previously)
            if (filters.description) {
                const descQuery = filters.description.toLowerCase();
                const itemMatch = invoice.items?.some((item: any) =>
                    (item.description || item.type || '').toLowerCase().includes(descQuery)
                );
                if (!itemMatch) matches = false;
            }

            if (filters.startDate || filters.endDate) {
                const invoiceDate = invoice.createdAt;
                if (filters.startDate) {
                    // Create date from YYYY-MM-DD parts to ensure Local Time midnight
                    const [y, m, d] = filters.startDate.split('-').map(Number);
                    const start = new Date(y, m - 1, d).getTime(); // Local midnight
                    if (invoiceDate < start) matches = false;
                }
                if (filters.endDate) {
                    // Create date from YYYY-MM-DD parts to ensure Local Time
                    const [y, m, d] = filters.endDate.split('-').map(Number);
                    const end = new Date(y, m - 1, d);
                    end.setHours(23, 59, 59, 999); // Local end of day
                    if (invoiceDate > end.getTime()) matches = false;
                }
            }
        }

        return matches;
        return matches;
    }).offset((page - 1) * limit).limit(limit).toArray();
}

export async function removePendingInvoice(uuid: string) {
    await db.invoices.delete(uuid);
}

export async function clearAllPending() {
    await db.invoices.where('status').equals('PENDING_SYNC').delete();
}

export async function updateInvoice(id: string, updates: Partial<OfflineInvoice>) {
    await db.invoices.update(id, {
        ...updates,
        status: 'PENDING_UPDATE' // FIX: Mark for update sync
    });
}
