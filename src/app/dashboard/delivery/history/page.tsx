"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Search,
    Clock,
    Phone,
    User,
    FileText,
    CreditCard,
    ArrowRightCircle,
    PackageCheck,
    History
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoices } from '@/hooks/useInvoices';
import { InvoiceDetailsModal } from '@/components/billing/InvoiceDetailsModal';

// --- HELPER: STATUS BADGE LOGIC ---
const getPaymentStatus = (invoice: any) => {
    const total = invoice.totalValue || 0;
    const paid = invoice.paidAmount || 0;

    if (paid >= total && total > 0) return 'CANCELADO'; // Alias for PAID in local context
    if (paid > 0) return 'ABONO';
    return 'PENDIENTE';
};

export default function DeliveryHistoryPage() {
    const { invoices } = useInvoices();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // FILTER: Show items that ARE delivered.
    const deliveredInvoices = invoices.filter(inv => inv.status === 'delivered');

    // --- SEARCH LOGIC (Reuse from Missing/Created) ---
    const filteredItems = deliveredInvoices.filter(invoice => {
        if (!searchTerm.trim()) return true;

        let searchString = searchTerm.toLowerCase();

        // EXACT TICKET MATCH LOGIC (e.g., "4 " matches ticket 4 exactly)
        const exactTicketMatch = searchTerm.match(/^(\d{1,4})\s$/);
        if (exactTicketMatch) {
            const ticketToFind = exactTicketMatch[1];
            return invoice.ticketNumber.toString() === ticketToFind;
        }

        // Date phrases
        const datePattern = /(\d{1,2})\s+de\s+([a-z]+)/g;
        const dateMatches = searchString.match(datePattern) || [];
        const invoiceDateStr = new Date(invoice.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
        const matchesDatePhrases = dateMatches.every(phrase => invoiceDateStr.includes(phrase));
        if (dateMatches.length > 0 && !matchesDatePhrases) return false;

        dateMatches.forEach(match => searchString = searchString.replace(match, ''));
        const terms = searchString.split(/\s+/).filter(t => t.length > 0);
        const dateStr = new Date(invoice.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();

        return terms.every(term => {
            if (invoice.client.name.toLowerCase().includes(term)) return true;
            const ticketTerm = term.startsWith('#') ? term.slice(1) : term;
            if (ticketTerm && invoice.ticketNumber.toString().includes(ticketTerm)) return true;
            if (term.length >= 5) {
                if (invoice.client.id?.toLowerCase().includes(term)) return true;
                if (invoice.client.cedula?.toLowerCase().includes(term)) return true;
                if (invoice.client.phone?.includes(term)) return true;
            }
            if (invoice.items && invoice.items.some((item: any) =>
                item.type.toLowerCase().includes(term) ||
                (item.notes && item.notes.toLowerCase().includes(term)) ||
                (item.brand && item.brand.toLowerCase().includes(term)) ||
                (item.color && item.color.toLowerCase().includes(term))
            )) return true;
            if (dateStr.includes(term)) return true;

            // Status terms
            const paymentStatus = getPaymentStatus(invoice).toLowerCase();
            if (paymentStatus.includes(term)) return true;

            return false;
        });
    });

    return (
        <div className="space-y-6 h-full flex flex-col p-6 md:p-12 min-h-screen">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <History className="text-slate-400" size={32} />
                        Historial de Entregas
                        <span className="text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-lg font-bold" title="Total Entregados">
                            {filteredItems.length}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium">Prendas entregadas a clientes.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                    <Search className="text-slate-400 ml-2" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente, factura, prenda..."
                        className="bg-transparent outline-none text-slate-700 font-bold placeholder:font-medium w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* LIST */}
            <div className="space-y-4">
                {deliveredInvoices.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <History size={64} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-500">Sin historial</h3>
                        <p className="text-slate-400">No hay prendas entregadas aún.</p>
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        // FORCE STATUS TO PAID FOR HISTORY PAGE because user stated all delivered items MUST be fully paid.
                        const totalPaid = item.totalValue;
                        const pendingAmount = 0;
                        const paymentStatus = 'CANCELADO';

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => setSelectedInvoice(item)}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow cursor-pointer group opacity-90 hover:opacity-100"
                            >
                                {/* Left: Info */}
                                <div className="flex items-start gap-4 flex-1 w-full">
                                    <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                                    ${paymentStatus === 'CANCELADO' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}
                                `}>
                                        <PackageCheck size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-black text-slate-800 truncate">
                                                {item.items ? item.items.length : 0}x Prendas Entregadas
                                            </h3>
                                            {item.deliveryDate && (
                                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                    {new Date(item.deliveryDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>

                                        {/* Items */}
                                        <p className="text-sm font-medium text-slate-600 mb-2 line-clamp-2">
                                            {item.items?.map((i: any) => `${i.type} (${i.notes || 'Sin detalles'})`).join(', ') || 'Varios'}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                <FileText size={12} className="text-slate-400" />
                                                <span className="text-slate-900 font-bold">Recibo #{item.ticketNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                <User size={12} className="text-slate-400" />
                                                <span>{item.client.name}</span>
                                            </div>

                                            {item.client.phone && (
                                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                    <Phone size={12} className="text-slate-400" />
                                                    <span>{item.client.phone}</span>
                                                </div>
                                            )}

                                            {(item.client.cedula || item.client.id) && (
                                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                    <CreditCard size={12} className="text-slate-400" />
                                                    <span>CC {item.client.cedula || item.client.id}</span>
                                                </div>
                                            )}

                                            {paymentStatus === 'CANCELADO' ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
                                                    <CreditCard size={12} />
                                                    <span className="font-bold">PAGADO (CANCELADO)</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {/* Show Abono if exists */}
                                                    {(totalPaid > 0) && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700">
                                                            <CreditCard size={12} />
                                                            <span className="font-bold">Abonó: ${new Intl.NumberFormat('es-CO').format(totalPaid)}</span>
                                                        </div>
                                                    )}
                                                    {/* Show Pending/Deben */}
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 border border-red-100 text-red-700">
                                                        <CreditCard size={12} />
                                                        <span className="font-bold">Deben: ${new Intl.NumberFormat('es-CO').format(pendingAmount)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action: View Only */}
                                <div className="text-slate-300 group-hover:text-emerald-500 transition-colors">
                                    <ArrowRightCircle size={28} />
                                </div>

                            </motion.div>
                        )
                    })
                )}
            </div>

            {/* MODAL details */}
            <InvoiceDetailsModal
                invoice={selectedInvoice ? {
                    ...selectedInvoice,
                    paidAmount: selectedInvoice.totalValue,
                    payment: { ...(selectedInvoice.payment || {}), amount: selectedInvoice.totalValue },
                    // Ensure internal calculations see it as paid
                    payments: selectedInvoice.payments?.length ? selectedInvoice.payments : [{ amount: selectedInvoice.totalValue, type: 'Sistema', date: new Date().toISOString() }]
                } : null}
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                isHistoryView={true}
            />
        </div>
    );
}
