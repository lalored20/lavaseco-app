"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Search,
    Phone,
    User,
    FileText,
    CreditCard,
    CheckCircle2,
    Package
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoices, getAlertLevel } from '@/hooks/useInvoices';
import { InvoiceDetailsModal } from '@/components/billing/InvoiceDetailsModal';

export default function MissingItemsPage() {
    const { getMissingInvoices, markItemFoundAgain, updateInvoiceStatus, loading } = useInvoices();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Need getAlertLevel helper here too or import it
    // Importing from hook is best if available, but it was exported in useInvoices.ts
    // We need to import it at top of file, so let's check imports first.
    // Assuming getAlertLevel is exported from hooks/useInvoices
    const missingInvoices = getMissingInvoices();

    const handleMarkFound = async (e: React.MouseEvent, invoiceId: string, itemId: string) => {
        e.stopPropagation();
        await markItemFoundAgain(invoiceId, itemId);
        toast.success('Prenda encontrada', {
            description: 'Se ha marcado como recibida'
        });
    };

    // Search filter
    // Search filter + "Overdue" logic
    const filteredItems = missingInvoices.filter(invoice => {
        // REMOVED STRICT FILTER - Trust useInvoices hook which now includes Overdue/Urgent/Pronto automatically
        // const matchesCondition = (isMarkedIncomplete || hasMissingItems) && isUrgentOrWarning;
        // if (!matchesCondition) return false;

        // --- SEARCH LOGIC (MATCHING BILLING MODULE) ---
        if (!searchTerm) return true;

        // SMART SEARCH LOGIC (Identical to OrganizePage)
        const query = searchTerm;
        const lowerQuery = query.toLowerCase();
        const trimmedQuery = query.trim();
        const isNumeric = /^\d+$/.test(trimmedQuery);

        // Helpers
        const normalizeId = (id: any) => id ? id.toString().replace(/[^0-9]/g, '') : '';
        const normalizePhone = (phone: any) => phone ? phone.toString().replace(/[^0-9]/g, '') : '';

        // 1. Smart Numeric (Ticket #)
        if (isNumeric && trimmedQuery.length <= 4) {
            if (query.endsWith(' ')) {
                return invoice.ticketNumber?.toString() === trimmedQuery;
            }
            return invoice.ticketNumber?.toString().includes(trimmedQuery);
        }

        // 2. Full Search
        const ticketMatch = invoice.ticketNumber?.toString().includes(trimmedQuery);
        const nameMatch = (invoice.client?.name || '').toLowerCase().includes(lowerQuery);

        // Cedula
        const normQuery = normalizeId(query);
        const cedulaMatch = (normQuery.length > 0 && normalizeId(invoice.client?.cedula).includes(normQuery)) ||
            (invoice.client?.cedula || '').toString().toLowerCase().includes(lowerQuery);

        // Phone
        const normPhone = normalizePhone(query);
        const phoneMatch = (normPhone.length > 0 && normalizePhone(invoice.client?.phone).includes(normPhone)) ||
            (invoice.client?.phone || '').toString().toLowerCase().includes(lowerQuery);

        // Items
        const itemMatch = invoice.items?.some((item: any) =>
            (item.type || item.description || '').toLowerCase().includes(lowerQuery)
        );

        return ticketMatch || nameMatch || cedulaMatch || phoneMatch || itemMatch;
    })
        .sort((a, b) => {
            // New Priority:
            // 1. Overdue (Vencidos) -> Always Top
            // 2. Everything else -> Order of arrival (Date Created ASC)

            const levelA = getAlertLevel(a.scheduledDate, a.createdAt);
            const levelB = getAlertLevel(b.scheduledDate, b.createdAt);

            const isOverdueA = levelA === 'overdue';
            const isOverdueB = levelB === 'overdue';

            if (isOverdueA && !isOverdueB) return -1;
            if (!isOverdueA && isOverdueB) return 1;

            // Secondary Sort: Date (Oldest First / Orden de Llegada)
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-orchid-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Cargando prendas faltantes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col p-6 md:p-12 min-h-screen">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <AlertTriangle className="text-amber-500" size={32} />
                        Prendas Faltantes
                        <span className="text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-lg font-bold" title="Total Faltantes">
                            {filteredItems.length}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium">Gestión de prendas pendientes de recibir</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                    <Search className="text-slate-400 ml-2" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente, factura..."
                        className="bg-transparent outline-none text-slate-700 font-bold placeholder:font-medium w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* LIST */}
            <div className="space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <CheckCircle2 size={64} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-500">¡Todo en orden!</h3>
                        <p className="text-slate-400">No hay prendas faltantes en este momento.</p>
                    </div>
                ) : (
                    filteredItems.map((invoice) => {
                        // Get missing items
                        const missingItems = invoice.items?.filter((item: any) => item.missing) || [];
                        const displayCount = missingItems.length > 0 ? missingItems.length : (invoice.items?.length || 0);

                        // Visuals based on Alert Level
                        const level = getAlertLevel(invoice.scheduledDate, invoice.createdAt);

                        // Card always white
                        const cardStyle = "bg-white border-slate-200";

                        // Icon styles
                        let iconColor = "text-slate-500 bg-slate-100"; // Default

                        if (level === 'overdue') {
                            iconColor = "text-red-600 bg-red-100 ring-2 ring-red-500 ring-offset-2 animate-pulse";
                        } else if (level === 'urgent') {
                            iconColor = "text-rose-500 bg-rose-100";
                        } else if (level === 'warning') {
                            iconColor = "text-amber-600 bg-amber-100";
                        }

                        // Resolve Action
                        const handleResolve = async (e: React.MouseEvent) => {
                            e.stopPropagation();
                            await updateInvoiceStatus(invoice.id, 'complete');
                            toast.success(`Factura #${invoice.ticketNumber} marcada como arreglada`, {
                                description: 'Se ha movido a Entregas (Prendas por Entregar)'
                            });
                        };

                        // Subtitle: List of missing items
                        const subtitle = missingItems.length > 0
                            ? missingItems.map((i: any) => `${i.description || i.type} (${i.notes || 'Sin detalles'})`).join(', ')
                            : (invoice.items?.map((i: any) => `${i.description || i.type} (${i.notes || 'Sin detalles'})`).join(', ') || 'Sin información');

                        return (
                            <motion.div
                                key={invoice.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => setSelectedInvoice(invoice)}
                                className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow cursor-pointer group`}
                            >
                                {/* Left: Info */}
                                <div className="flex items-start gap-4 flex-1 w-full">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${iconColor}`}>
                                        <AlertTriangle size={24} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-black text-slate-800 truncate">
                                                {displayCount}x Prenda{displayCount !== 1 ? 's' : ''} Faltante{displayCount !== 1 ? 's' : ''}
                                            </h3>
                                        </div>

                                        {/* Subtitle (Items) */}
                                        <p className="text-sm font-medium text-slate-600 mb-2 line-clamp-2">
                                            {subtitle}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                <FileText size={12} className="text-slate-400" />
                                                <span className="text-slate-900 font-bold">Recibo #{invoice.ticketNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                <User size={12} className="text-slate-400" />
                                                <span>{invoice.client.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                <Phone size={12} className="text-slate-400" />
                                                <span>{invoice.client.phone}</span>
                                            </div>
                                            {(invoice.client.cedula || invoice.client.id) && (
                                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                    <CreditCard size={12} className="text-slate-400" />
                                                    <span>CC {invoice.client.cedula || invoice.client.id}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action: Arreglado (Matches Delivery Button Style) */}
                                <button
                                    onClick={handleResolve}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto mt-2 md:mt-0 mr-4"
                                >
                                    <CheckCircle2 size={20} />
                                    Arreglado
                                </button>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* MODAL details */}
            <InvoiceDetailsModal
                invoice={selectedInvoice}
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                isMissingView={true}
            />
        </div >
    );
}
