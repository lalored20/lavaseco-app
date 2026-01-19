"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    ArrowRight,
    Package,
    Check,
    X,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Loader2,
    Cloud
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoices, getAlertLevel } from '@/hooks/useInvoices';
import { InvoiceDetailsModal } from '@/components/billing/InvoiceDetailsModal';

// --- HELPER: ALERT LEVEL LOGIC ---
// --- HELPER: ALERT LEVEL LOGIC ---
// Moved to useInvoices.ts
// const getAlertLevel = ...

export default function LogisticsOrganizePage() {
    const { invoices, loading, updateInvoiceStatus } = useInvoices();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [dailySkips, setDailySkips] = useState<Record<string, string>>({});

    // Load daily skips from local storage
    useEffect(() => {
        const stored = localStorage.getItem('lavaseco_daily_skips');
        if (stored) {
            setDailySkips(JSON.parse(stored));
        }
    }, []);

    // --- FILTRADO: Solo facturas PENDIENTES de organizar ---
    // status !== 'delivered' && logicStatus !== 'complete'
    // El hook ya trae "pending" enrich.
    // Ojo: "pending" facturas recién creadas.

    // Filtramos localmente para la búsqueda
    // Filtramos localmente para la búsqueda
    const filteredInvoices = invoices
        .filter((inv) => {
            // 1. Status Filter (Already handled by fetching? No, we fetch all pending)
            // Ensure we strictly follow Organize Page Logic (Pending/Incomplete)
            // Existing logic matches.

            if (inv.logisticsStatus === 'complete' || inv.status === 'delivered') return false;

            // --- RECURRENCE LOGIC: Hide "PROBLEMA" items if skipped today ---
            if (inv.status === 'PROBLEMA' || inv.status === 'incomplete' || inv.logisticsStatus === 'incomplete') {
                const todayStr = new Date().toISOString().split('T')[0];
                if (dailySkips[inv.id] === todayStr) {
                    return false; // Hide for today
                }
            }

            // --- SEARCH LOGIC (MATCHING BILLING MODULE) ---
            if (!searchTerm) return true;

            // SMART SEARCH LOGIC
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
                    return inv.ticketNumber?.toString() === trimmedQuery;
                }
                return inv.ticketNumber?.toString().includes(trimmedQuery);
            }

            // 2. Full Search
            const ticketMatch = inv.ticketNumber?.toString().includes(trimmedQuery);
            const nameMatch = (inv.client?.name || '').toLowerCase().includes(lowerQuery);

            // Cedula
            const normQuery = normalizeId(query);
            const cedulaMatch = (normQuery.length > 0 && normalizeId(inv.client?.cedula).includes(normQuery)) ||
                (inv.client?.cedula || '').toString().toLowerCase().includes(lowerQuery);

            // Phone
            const normPhone = normalizePhone(query);
            const phoneMatch = (normPhone.length > 0 && normalizePhone(inv.client?.phone).includes(normPhone)) ||
                (inv.client?.phone || '').toString().toLowerCase().includes(lowerQuery);

            // Items
            const itemMatch = inv.items?.some((item: any) =>
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

    // --- ACCIONES ---

    const markItemSkipped = (id: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const newSkips = { ...dailySkips, [id]: todayStr };
        setDailySkips(newSkips);
        localStorage.setItem('lavaseco_daily_skips', JSON.stringify(newSkips));
    };

    const handleMarkOrganized = async (id: string, ticketNumber: number) => {
        // Updated: Removed confirmation
        await updateInvoiceStatus(id, 'complete');
        toast.success(`Factura #${ticketNumber} movida a Entregas`, {
            description: 'Proceso de entrada finalizado exitosamente.'
        });
    };

    const handleMarkMissing = async (id: string, ticketNumber: number) => {
        const invoice = invoices.find(i => i.id === id);
        if (!invoice) return;

        // CHECK ALERT LEVEL FOR ACTION
        // User wants ALL levels to behave similarly (Mark Incomplete, Stay in List)
        // But Green ones have different text ("TODAVÍA NO ESTÁ") and don't go to Missing page (per filter requirement).
        // Update status for all.
        await updateInvoiceStatus(id, 'incomplete');

        toast.error(`Factura #${ticketNumber} marcada con novedades`, {
            description: 'Estado actualizado.'
        });

        // Removed markItemSkipped(id) logic entirely as user wants visibility.
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Organizar Entrada
                        <span className="text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-lg font-bold" title="Pendientes">
                            {filteredInvoices.length}
                        </span>
                        {!loading && (
                            <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100" title="Datos en Tiempo Real">
                                <Cloud size={18} />
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium">Gestión de prendas recibidas esperando organización</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Búsqueda rápida (Nombre, C.C., Teléfono, Factura #...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all font-medium text-slate-800 shadow-sm"
                    />
                    {loading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-slate-400" size={20} />
                        </div>
                    )}
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 relative flex flex-col">
                <div className="overflow-x-auto flex-1">
                    {filteredInvoices.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-500">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-lg">Todo al día</h3>
                            <p className="max-w-xs mt-2">No hay facturas pendientes de organizar.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-4 py-4 w-32 text-center">N° Factura</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Fecha Entrada</th>
                                    <th className="px-6 py-4">Fecha Entrega</th>
                                    <th className="px-6 py-4 text-center">Prendas</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredInvoices.map((invoice) => {
                                    const alertLevel = getAlertLevel(invoice.scheduledDate, invoice.createdAt);

                                    // Mapping server status to UI logic
                                    const isProblem = invoice.status === 'PROBLEMA';

                                    // Check if status change allows "Fresh" (Incomplete) display
                                    // Rule: Persist "Incomplete" until 10:00 AM of the NEXT day after marking.
                                    let isFreshProblem = false;
                                    if (isProblem && invoice.updatedAt) {
                                        const updatedAt = new Date(invoice.updatedAt);
                                        const now = new Date();

                                        // Calculate Expiration: Day of Update + 1 Day, at 10:00 AM
                                        const expiration = new Date(updatedAt);
                                        expiration.setDate(expiration.getDate() + 1); // Next Day
                                        expiration.setHours(10, 0, 0, 0); // 10:00 AM

                                        // If we are currently BEFORE the expiration, it persists.
                                        isFreshProblem = now < expiration;
                                    }

                                    let statusContent = null;

                                    // Only show INCOMPLETO if it is a FRESH problem (Today).
                                    // Otherwise (Next Day), fall back to Alert Level (original label).
                                    if (isProblem && isFreshProblem) {
                                        // "INCOMPLETO" but with Urgency Color
                                        let badgeClass = "bg-amber-500 text-white shadow-amber-200"; // Default
                                        let badgeText = "INCOMPLETO";

                                        if (alertLevel === 'overdue') badgeClass = "bg-red-600 text-white shadow-red-500/30 animate-pulse";
                                        else if (alertLevel === 'urgent') badgeClass = "bg-rose-500 text-white shadow-rose-200";
                                        else if (alertLevel === 'warning') badgeClass = "bg-amber-500 text-white shadow-amber-200";
                                        else if (alertLevel === 'normal') {
                                            // Requirements: Green color, Text "TODAVÍA NO ESTÁ"
                                            badgeClass = "bg-emerald-500 text-white shadow-emerald-200";
                                            badgeText = "TODAVÍA NO ESTÁ";
                                        }

                                        statusContent = (
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-lg shadow-sm ${badgeClass} uppercase whitespace-nowrap`}>
                                                <AlertTriangle size={12} className="fill-white" /> {badgeText}
                                            </span>
                                        );
                                    } else if (alertLevel === 'overdue') {
                                        statusContent = (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-red-600 px-3 py-1.5 rounded-lg shadow-lg shadow-red-500/30 animate-pulse border border-red-500">
                                                <Clock size={12} className="fill-white" /> VENCIDO
                                            </span>
                                        );
                                    } else if (alertLevel === 'urgent') {
                                        statusContent = (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 shadow-sm shadow-rose-100">
                                                <Clock size={12} /> URGENTE
                                            </span>
                                        );
                                    } else if (alertLevel === 'warning') {
                                        statusContent = (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                                PRONTO
                                            </span>
                                        );
                                    } else {
                                        statusContent = (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                A TIEMPO
                                            </span>
                                        );
                                    }

                                    return (
                                        <tr
                                            key={invoice.id}
                                            className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            onClick={() => setSelectedInvoice(invoice)}
                                        >
                                            <td className="px-6 py-6 font-medium text-slate-900 group-hover:text-orchid-600 transition-colors text-base">
                                                #{invoice.ticketNumber}
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm">{invoice.client.name}</span>
                                                    <span className="text-xs text-slate-400 mt-0.5">{invoice.client.phone || 'Sin teléfono'}</span>
                                                    <span className="text-xs text-slate-400">{invoice.client.cedula ? `C.C. ${invoice.client.cedula}` : ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-sm font-bold text-slate-500">
                                                {new Date(invoice.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-6 text-sm font-bold text-slate-500">
                                                {invoice.scheduledDate ? new Date(invoice.scheduledDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-black text-sm w-8 h-8 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-200">
                                                    {invoice.items?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                {statusContent}
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    {/* BOTÓN X - PREMIUM (Soft & Minimal) */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleMarkMissing(invoice.id, invoice.ticketNumber); }}
                                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm group/btn bg-white border-slate-100 text-slate-300 hover:border-red-100 hover:bg-red-50 hover:text-red-500 hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-0.5`}
                                                        title="Reportar problema / Faltante (Click para actualizar)"
                                                    >
                                                        <X size={18} strokeWidth={2.5} />
                                                    </button>

                                                    {/* BOTÓN CHECK - PREMIUM (Ghost -> Vibrant & Lighter) */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleMarkOrganized(invoice.id, invoice.ticketNumber); }}
                                                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm group/btn-check bg-white border-slate-100 text-slate-300 hover:bg-emerald-400 hover:border-emerald-400 hover:text-white hover:shadow-lg hover:shadow-emerald-400/30 hover:-translate-y-0.5 hover:scale-105 active:scale-95"
                                                        title="Confirmar Entrada Completa"
                                                    >
                                                        <Check size={18} strokeWidth={3} className="drop-shadow-sm" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            {/* Modal de Detalle */}
            <InvoiceDetailsModal
                invoice={selectedInvoice}
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                isLogisticsView={true}
                isMissingView={true} // Reusing this to hide Print button as requested
            />

        </div>
    );
}
