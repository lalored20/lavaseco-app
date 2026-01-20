"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Search,
    Phone,
    User,
    FileText,
    CreditCard,
    ArrowRightCircle,
    PackageCheck,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoices } from '@/hooks/useInvoices';
import { InvoiceDetailsModal } from '@/components/billing/InvoiceDetailsModal';
import { registerPayment } from '@/lib/actions/billing';
import { useCashRegister } from '@/context/CashRegisterContext';
import { useRouter } from 'next/navigation';

// --- HELPER: STATUS BADGE LOGIC ---
const getPaymentStatus = (invoice: any) => {
    const total = invoice.totalValue || 0;
    const paid = invoice.paidAmount || 0;

    if (paid >= total && total > 0) return 'CANCELADO'; // Alias for PAID in local context
    if (paid > 0) return 'ABONO';
    return 'PENDIENTE';
};

export default function DeliveryPage() {
    const { invoices, deliverInvoice } = useInvoices();
    const { openRegister } = useCashRegister();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // FILTER: Show items that are ready for delivery.
    // Condition: Logistics Status is 'complete' (Organized) AND Status is NOT 'delivered'.
    const readyInvoices = invoices.filter(inv => inv.logisticsStatus === 'complete' && inv.status !== 'delivered');

    // --- SHARED DELIVERY LOGIC ---
    const handleDeliverFlow = (invoice: any) => {
        // Calculate pending directly from invoice data
        const totalPaid = invoice.payment?.amount || invoice.paidAmount || (invoice.payments?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0);
        const remaining = Math.max(0, (invoice.totalValue || 0) - totalPaid);

        openRegister({
            amountToPay: remaining,
            description: `Entrega de Factura #${invoice.ticketNumber}`,
            clientName: invoice.client?.name || 'Cliente General',
            relatedInvoiceId: invoice.id,
            customTitle: 'Confirmar Entrega', // FORCE CUSTOM TITLE
            onConfirm: async (result) => {
                const { method, amount } = result;
                try {
                    // 1. Register Payment if needed
                    if (amount > 0) {
                        const newLog = {
                            type: 'PAYMENT',
                            description: `Pago Total al Entregar (${method})`,
                            amount: amount,
                            date: new Date().toISOString()
                        };
                        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${invoice.id}`) || '[]');
                        localStorage.setItem(`lavaseco_logs_${invoice.id}`, JSON.stringify([...existingLogs, newLog]));

                        // Server action
                        await registerPayment(invoice.id, amount, method);
                    }

                    // 2. Log Delivery locally
                    const deliverLog = {
                        type: 'STATUS_CHANGE',
                        description: 'Pedido Entregado',
                        date: new Date().toISOString()
                    };
                    const logsAfter = JSON.parse(localStorage.getItem(`lavaseco_logs_${invoice.id}`) || '[]');
                    localStorage.setItem(`lavaseco_logs_${invoice.id}`, JSON.stringify([...logsAfter, deliverLog]));

                    // 3. Execute Delivery (Context Hook)
                    const success = await deliverInvoice(invoice.id);

                    if (success) {
                        toast.success(`Factura #${invoice.ticketNumber} entregada`, {
                            description: remaining > 0 ? "Saldo cancelado y servicio completado." : "Servicio entregado al cliente."
                        });
                        router.refresh();
                    } else {
                        toast.error("Error al marcar como entregado");
                    }
                } catch (error) {
                    console.error("Delivery error:", error);
                    toast.error("Error procesando la entrega");
                }
            }
        });
    };

    const handleDeliverClick = (e: React.MouseEvent, invoice: any) => {
        e.stopPropagation();
        handleDeliverFlow(invoice);
    };

    // --- SEARCH LOGIC (Reuse from Missing/Created) ---
    const filteredItems = readyInvoices.filter(invoice => {
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
                        <PackageCheck className="text-emerald-500" size={32} />
                        Entrega de Prendas
                        <span className="text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-lg font-bold" title="Total Por Entregar">
                            {filteredItems.length}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium">Gestión de entrega y finalización de servicio.</p>
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
                {readyInvoices.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <CheckCircle2 size={64} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-500">¡Todo entregado!</h3>
                        <p className="text-slate-400">No hay prendas pendientes de entrega.</p>
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        // FIX: Calculate total paid dynamically checking all possible paths (Legacy vs Local vs Server)
                        const totalPaid = item.payment?.amount || item.paidAmount || (item.payments?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0);
                        const pendingAmount = Math.max(0, (item.totalValue || 0) - totalPaid);

                        // FIX: Determine status based on calculated values
                        let paymentStatus = 'PENDIENTE';
                        if (pendingAmount <= 0 && item.totalValue > 0) paymentStatus = 'CANCELADO';
                        else if (totalPaid > 0) paymentStatus = 'ABONO';

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => setSelectedInvoice(item)}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow cursor-pointer group"
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
                                                {item.items ? item.items.length : 0}x Prendas Listas
                                            </h3>
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

                                {/* Action */}
                                <button
                                    onClick={(e) => handleDeliverClick(e, item)}
                                    // Modified Button: Even SOFTER Green (emerald-400), margin right preserved
                                    className="bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-sm shadow-emerald-100 transition-all flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto mt-2 md:mt-0 mr-4"
                                >
                                    <ArrowRightCircle size={20} />
                                    Entregar
                                </button>

                            </motion.div>
                        )
                    })
                )}
            </div>

            {/* MODAL details */}
            <InvoiceDetailsModal
                invoice={selectedInvoice}
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                isDeliveryView={true}
                onInvoiceUpdate={(inv) => {
                    if (inv.status === 'delivered') {
                        deliverInvoice(inv.id);
                        setSelectedInvoice(null);
                    }
                }}
            />
        </div>
    );
}
