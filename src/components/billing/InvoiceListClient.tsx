"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Eye, Printer, MoreHorizontal, User, Calendar, Shirt, Loader2, ArrowDown, X, SlidersHorizontal, Cloud, CloudOff, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { getAlertLevel } from "@/hooks/useInvoices";
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { searchInvoices } from '@/lib/actions/billing';
import { searchLocalInvoices, upsertInvoices } from '@/lib/billing/offline-storage';
import { useDataReplicator } from '@/hooks/useDataReplicator';
import { toast } from 'sonner';

interface InvoiceListClientProps {
    invoices: any[]; // Initial data (Server-side rendered)
    totalCount?: number;
}

// Simple debounce hook implementation if not available
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// Helper for Status Badge
const StatusBadge = ({ invoice }: { invoice: any }) => {
    // 1. Calculate Alert Level based on Logistics Rules
    // Handle hybrid data structure (Server vs Dexie Local)
    const scheduledDate = invoice.scheduledDate || invoice.dates?.delivery;
    const alertLevel = getAlertLevel(scheduledDate, invoice.createdAt);

    // 2. Define Dot Color based on Alert Level
    let dotClass = "bg-emerald-400 ring-1 ring-emerald-300"; // Default to Green (Normal/A Tiempo or No Date)

    if (alertLevel === 'overdue') dotClass = "bg-red-600 animate-fast-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)] ring-2 ring-red-500/50 w-3 h-3"; // Larger & Faster for Overdue
    else if (alertLevel === 'urgent') dotClass = "bg-rose-400 ring-1 ring-rose-300";
    else if (alertLevel === 'warning') dotClass = "bg-amber-400 ring-1 ring-amber-300";
    // 'normal' and 'none' fall through to default (Green)

    // 3. Render Badges based on Business Status

    // --- DELIVERED (No Logistics Dot) ---
    if (invoice.status === 'delivered' || invoice.orderStatus === 'delivered') {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/50 text-emerald-700 border border-emerald-200 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold">Entregado</span>
            </div>
        );
    }

    // --- READY FOR DELIVERY (Por Entregar) (No Logistics Dot) ---
    // Logic: Order Status is EN_PROCESO/Complete AND not Delivered
    if (invoice.orderStatus === 'EN_PROCESO' || invoice.status === 'EN_PROCESO' || invoice.logisticsStatus === 'complete') {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100/50 text-blue-700 border border-blue-200 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[11px] font-bold">Por Entregar</span>
            </div>
        );
    }

    // --- MISSING (Faltante) (SHOW DOT) ---
    // If it's explicitly marked as PROBLEMA or is OVERDUE (regardless of explicit mark, per auto-escalation) and not delivered/complete
    const isOverdue = alertLevel === 'overdue';
    if ((invoice.status === 'PENDING' || !invoice.status || invoice.status === 'PROBLEMA') && (invoice.orderStatus === 'PROBLEMA' || (isOverdue && invoice.status !== 'delivered'))) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100/50 text-red-700 border border-red-200 w-fit">
                    <AlertTriangle size={14} className="stroke-[2.5]" />
                    <span className="text-xs font-bold">Faltante</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${dotClass} transition-colors`} title="Estado Logística" />
            </div>
        );
    }

    // --- PENDING ORGANIZATION (Por Organizar) (SHOW DOT) ---
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                <Clock size={14} className="stroke-[2.5]" />
                <span className="text-xs font-bold">Por Organizar</span>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${dotClass} transition-colors`} title="Estado Logística" />
        </div>
    );
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
};

export function InvoiceListClient({ invoices: initialInvoices, totalCount: initialTotalCount }: InvoiceListClientProps) {
    // Background Replication Engine
    useDataReplicator();

    const [invoices, setInvoices] = useState<any[]>(initialInvoices);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounceValue(searchTerm, 300); // Faster debounce for local feel

    // UI States
    const [isOffline, setIsOffline] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Advanced Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        name: '',
        cedula: '',
        phone: '',
        description: '',
        ticketNumber: ''
    });
    const debouncedFilters = useDebounceValue(filters, 500);

    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(initialTotalCount);

    // Network Listener
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOffline(!navigator.onLine);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Core Search Function (The "Local-First" Logic)
    const runSearch = useCallback(async (isNewSearch: boolean = false) => {
        const targetPage = isNewSearch ? 1 : page; // Note: Pagination complexity with hybrid is high.
        // Simplified strategy: Always load local first.

        setLoading(true);

        const cleanFilters: any = {};
        if (debouncedFilters.startDate) cleanFilters.startDate = debouncedFilters.startDate;
        if (debouncedFilters.endDate) cleanFilters.endDate = debouncedFilters.endDate;
        if (debouncedFilters.name) cleanFilters.name = debouncedFilters.name;
        if (debouncedFilters.cedula) cleanFilters.cedula = debouncedFilters.cedula;
        if (debouncedFilters.phone) cleanFilters.phone = debouncedFilters.phone;
        if (debouncedFilters.description) cleanFilters.description = debouncedFilters.description;
        if (debouncedFilters.ticketNumber) cleanFilters.ticketNumber = debouncedFilters.ticketNumber;

        try {
            // 1. FAST PATH: Local Search (Always run this)
            // USER REQUEST: 100 invoices per page
            const limit = 100;
            const localData = await searchLocalInvoices(debouncedSearch, limit, cleanFilters, targetPage);

            // Set data immediately for instant feedback
            // Replace data for pagination (don't append)
            setInvoices(localData);
            setHasMore(localData.length === limit);

            // Count is expensive locally with filters, we can skip precise count or optimize later.
            // For now, simple count of current fetch.
            // setTotalCount(localData.length >= 50 ? 999 : localData.length);

            // 2. SLOW PATH: REMOVED (Offline-First)
            setIsSyncing(false);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, debouncedFilters, page]);

    // Trigger on Search/Filter Change
    useEffect(() => {
        runSearch(true);
    }, [debouncedSearch, debouncedFilters]);

    // Trigger on Page Change
    useEffect(() => {
        runSearch(false);
    }, [page]);



    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            name: '',
            cedula: '',
            phone: '',
            description: '',
            ticketNumber: ''
        });
        setSearchTerm('');
    };

    const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Facturas Creadas
                        {isSyncing && (
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1.5 animate-pulse">
                                <RefreshCw size={14} className="animate-spin" />
                                Sincronizando
                            </span>
                        )}
                        {!isSyncing && !isOffline && (
                            <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100" title="Sincronizado">
                                <Cloud size={18} />
                            </span>
                        )}
                        {!isSyncing && isOffline && (
                            <span className="text-slate-400 bg-slate-100 px-2 py-1 rounded-full" title="Modo Local">
                                <CloudOff size={18} />
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        {invoices.length} mostradas
                        <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">
                            {(totalCount || 0) > invoices.length ? `de ${totalCount} (aprox)` : 'Total'}
                        </span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition flex items-center gap-2 ${showFilters || activeFilterCount > 0
                            ? 'bg-orchid-50 text-orchid-600 border-orchid-200 ring-2 ring-orchid-100'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <SlidersHorizontal size={18} />
                        Filtros
                        {activeFilterCount > 0 && (
                            <span className="bg-orchid-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <Link
                        href="/dashboard/billing-a"
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-900/20"
                    >
                        <Plus size={18} />
                        Nueva Factura
                    </Link>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-orchid-100 ring-1 ring-slate-100 animate-in slide-in-from-top-2 duration-200 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rango de fechas</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orchid-500/20 outline-none transition"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                            <input
                                type="date"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orchid-500/20 outline-none transition"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Factura #</label>
                        <input
                            type="number"
                            placeholder="Ej: 1045"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orchid-500/20 outline-none transition"
                            value={filters.ticketNumber}
                            onChange={(e) => handleFilterChange('ticketNumber', e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Cliente</label>
                        <input
                            type="text"
                            placeholder="Ej: Juan Perez"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orchid-500/20 outline-none transition"
                            value={filters.name}
                            onChange={(e) => handleFilterChange('name', e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cédula / ID</label>
                        <input
                            type="text"
                            placeholder="Ej: 1098..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orchid-500/20 outline-none transition"
                            value={filters.cedula}
                            onChange={(e) => handleFilterChange('cedula', e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</label>
                        <input
                            type="text"
                            placeholder="Ej: 300..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orchid-500/20 outline-none transition"
                            value={filters.phone}
                            onChange={(e) => handleFilterChange('phone', e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción (Prenda)</label>
                        <input
                            type="text"
                            placeholder="Ej: Saco, Vestido..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orchid-500/20 outline-none transition"
                            value={filters.description}
                            onChange={(e) => handleFilterChange('description', e.target.value)}
                        />
                    </div>

                    <div className="flex items-end justify-end">
                        <button
                            onClick={clearFilters}
                            className="text-slate-400 hover:text-red-500 text-sm font-bold flex items-center gap-1.5 px-3 py-2 transition disabled:opacity-50"
                            disabled={activeFilterCount === 0}
                        >
                            <X size={16} />
                            Limpiar
                        </button>
                    </div>
                </div>
            )}

            {/* Smart Search Bar (Still available for quick access) */}
            {!showFilters && (
                <div className="relative">
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
            )}

            {/* Invoices List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 relative flex flex-col">
                <div className="overflow-x-auto flex-1">
                    {invoices.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-500">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                <Filter size={32} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-lg">No se encontraron facturas</h3>
                            <p className="max-w-xs mt-2">Intenta ajustar tus filros o términos de búsqueda.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider w-28">N° Factura</th>
                                    <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider min-w-[200px]">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider min-w-[140px]">Fecha</th>
                                    <th className="px-6 py-4 text-center text-xs font-extrabold text-slate-400 uppercase tracking-wider w-24">Prendas</th>
                                    <th className="px-6 py-4 text-center text-xs font-extrabold text-slate-400 uppercase tracking-wider min-w-[140px]">Estado Pago</th>
                                    <th className="px-6 py-4 text-right text-xs font-extrabold text-slate-400 uppercase tracking-wider min-w-[160px]">Total a Pagar</th>
                                    <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider min-w-[160px]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {invoices.map((invoice) => {
                                    return (
                                        <tr
                                            key={invoice.id}
                                            className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            onClick={() => setSelectedInvoice(invoice)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-left">
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-orchid-600 transition-colors">
                                                    #{invoice.ticketNumber}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 line-clamp-1">
                                                        {invoice.client?.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {invoice.client?.phone}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        C.C. {invoice.client?.cedula}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left">
                                                <span className="text-sm font-medium text-slate-500">
                                                    {new Date(invoice.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-600 text-sm font-bold">
                                                    {invoice.items?.length || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex justify-center">
                                                    {(() => {
                                                        const totalVal = invoice.totalValue || 0;
                                                        const paymentAmount = invoice.payment?.amount || 0;
                                                        const isFullyPaid = (paymentAmount >= totalVal) && totalVal > 0;
                                                        const isPartial = paymentAmount > 0 && paymentAmount < totalVal;

                                                        if (isFullyPaid || invoice.payment?.status === 'PAGADO' || invoice.payment?.status === 'CANCELADO') {
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 shadow-sm text-[10px] font-bold uppercase tracking-wide">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                    PAGADO
                                                                </span>
                                                            );
                                                        }
                                                        if (isPartial || invoice.payment?.status === 'ABONO') {
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200 shadow-sm text-[10px] font-bold uppercase tracking-wide">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                    ABONO
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-wide">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                                PENDIENTE
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex flex-col items-end">
                                                    {/* LOGIC RESTORED:
                                                        - Black Text: PENDING amount (Debt) OR Total Value if Paid.
                                                        - Subtitle: (Abonó $XXX) OR ¡PAGADO!
                                                    */}
                                                    {(() => {
                                                        const totalVal = invoice.totalValue || 0;
                                                        const paymentAmount = invoice.payment?.amount || 0;
                                                        const pending = Math.max(0, totalVal - paymentAmount);
                                                        const isFullyPaid = pending <= 0 && totalVal > 0;

                                                        if (isFullyPaid) {
                                                            // Case: PAID
                                                            // Black: Total Value
                                                            // Sub: ¡PAGADO!
                                                            return (
                                                                <>
                                                                    <span className="text-sm font-bold text-emerald-600">
                                                                        {formatCurrency(totalVal)}
                                                                    </span>
                                                                    <span className="text-[10px] text-emerald-500 font-bold mt-0.5">¡PAGADO!</span>
                                                                </>
                                                            );
                                                        } else {
                                                            // Case: PENDING or PARTIAL
                                                            // Black: DEBT (Lo que deben)
                                                            // Sub: ABONO (Lo que han pagado)
                                                            return (
                                                                <>
                                                                    <span className="text-sm font-bold text-slate-900">
                                                                        {formatCurrency(pending)}
                                                                    </span>
                                                                    {paymentAmount > 0 ? (
                                                                        <span className="text-[10px] text-amber-500 font-bold mt-0.5">
                                                                            (Abonó {formatCurrency(paymentAmount)})
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-300 font-medium mt-0.5">
                                                                            Sin abonos
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        }
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left">
                                                <StatusBadge invoice={invoice} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Standard Pagination Controls */}
                <div className="p-4 border-t border-slate-50 flex items-center justify-between bg-zinc-50/50">
                    <button
                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                        disabled={page === 1 || loading}
                        className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 px-4 py-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowDown className="rotate-90" size={16} />
                        Anterior
                    </button>

                    <div className="text-sm font-bold text-slate-400">
                        Página {page}
                    </div>

                    <button
                        onClick={() => setPage(prev => prev + 1)}
                        disabled={!hasMore || loading}
                        className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 px-4 py-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguientes 100
                        <ArrowDown className="-rotate-90" size={16} />
                    </button>
                </div>
            </div>

            {/* MODAL */}
            <InvoiceDetailsModal
                invoice={selectedInvoice}
                isOpen={!!selectedInvoice}
                onClose={() => {
                    setSelectedInvoice(null);
                    // Refresh data from local DB to reflect changes (payments, status)
                    runSearch(true);
                }}
                onInvoiceUpdate={(updatedInvoice) => {
                    // OPTIMISTIC UPDATE: Update the list view state immediately
                    setInvoices(prev => prev.map(inv =>
                        inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv
                    ));

                    // Keep selected invoice in sync too
                    setSelectedInvoice(updatedInvoice);
                }}
            />
        </div >
    );
}
