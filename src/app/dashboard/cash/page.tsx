"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Banknote,
    Smartphone,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Receipt,
    Wallet,
    X,
    Clock,
    Trash2,
    User,
    Phone,
    Package
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDailyCashSummary, registerExpense, deleteExpense, getInvoiceById } from '@/lib/actions/billing';
import { toast } from 'sonner';
import { InvoiceDetailsModal } from '@/components/billing/InvoiceDetailsModal';

type PaymentMethod = 'Efectivo' | 'Nequi' | 'Daviplata' | 'Bancolombia' | 'Datafono';

interface MethodStat {
    count: number;
    total: number;
}

export default function CashRegisterPage() {
    // STATE
    const [isLoading, setIsLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState<any>(null);

    // Modals
    const [isDigitalModalOpen, setIsDigitalModalOpen] = useState(false);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isExpensesListModalOpen, setIsExpensesListModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [tempStartDate, setTempStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [tempEndDate, setTempEndDate] = useState('');
    const [endDate, setEndDate] = useState<Date | null>(null);

    // Expense Form
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    // Error state for debugging
    const [error, setError] = useState<string | null>(null);

    // Load Data Effect
    useEffect(() => {
        loadData();
    }, [currentDate, endDate]);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fix: Pass full date string to preserve timezone context
            const dateStr = currentDate.toString();
            const endStr = endDate ? endDate.toString() : undefined;
            const data = await getDailyCashSummary(dateStr, endStr);
            console.log("Data loaded:", data);

            if (!data.success) {
                setError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
            } else {
                setSummary(data.data);
            }
        } catch (error) {
            console.error(error);
            setError(String(error));
            toast.error("Error al cargar datos de caja");
        } finally {
            setIsLoading(false);
        }
    };

    // Handlers
    const handleTransactionClick = async (orderId: string) => {
        try {
            const result = await getInvoiceById(orderId);
            if (result.success && result.data) {
                const order = result.data;

                // Map Prisma Order to Invoice format expected by modal
                setSelectedInvoice({
                    id: order.id,
                    ticketNumber: order.ticketNumber,
                    client: order.client || { name: 'Cliente', phone: '', cedula: '' },
                    items: order.items || [],
                    totalValue: order.totalValue || 0,
                    paidAmount: order.paidAmount || 0,
                    balance: (order.totalValue || 0) - (order.paidAmount || 0),
                    status: order.status || 'PENDIENTE',
                    paymentStatus: order.paymentStatus || 'PENDIENTE',
                    location: order.location || 'RECEPCION',
                    payments: order.payments || [],
                    createdAt: order.createdAt,
                    scheduledDate: order.scheduledDate,
                    deliveredDate: order.deliveredDate
                });
                setIsInvoiceModalOpen(true);
            } else {
                toast.error(result.error || 'No se pudo cargar la factura');
            }
        } catch (error) {
            console.error('Error loading invoice:', error);
            toast.error('Error al abrir la factura');
        }
    };

    const handleApplyDateRange = () => {
        const [sy, sm, sd] = tempStartDate.split('-').map(Number);
        const startLocal = new Date(sy, sm - 1, sd);

        setCurrentDate(startLocal);

        if (tempEndDate) {
            const [ey, em, ed] = tempEndDate.split('-').map(Number);
            setEndDate(new Date(ey, em - 1, ed));
        } else {
            setEndDate(null);
        }
        setIsDateModalOpen(false);
    };

    const getDigitalStats = () => {
        // Handle both new (digitalBreakdown) and old (byMethod) formats for hot-reload safety
        const stats = summary?.digitalBreakdown || {};
        const legacyStats = summary?.byMethod || {};

        const methodStats: Record<string, MethodStat> = {
            'Nequi': { count: 0, total: 0 },
            'Daviplata': { count: 0, total: 0 },
            'Bancolombia': { count: 0, total: 0 },
            'Datafono': { count: 0, total: 0 }
        };

        // Process New Format
        Object.entries(stats).forEach(([key, val]: [string, any]) => {
            methodStats[key] = val;
        });

        // Process Legacy Format (fallback if new format missing)
        if (Object.keys(stats).length === 0 && Object.keys(legacyStats).length > 0) {
            Object.entries(legacyStats).forEach(([key, val]: [string, any]) => {
                // If it's a number (legacy), treat as total
                if (typeof val === 'number') {
                    methodStats[key] = { count: 1, total: val }; // Count 1 is approx but better than 0
                }
            });
        }

        return Object.entries(methodStats).map(([method, stats]) => ({
            method,
            count: stats.count,
            total: stats.total
        }));
    };

    const digitalStats = getDigitalStats();

    const cashCount = summary?.transactions?.filter((t: any) => t.method === 'Efectivo').length || 0;
    const digitalCount = (summary?.transactions?.length || 0) - cashCount;
    const totalCount = summary?.transactions?.length || 0;

    // Expenses Layout Logic
    const showExpenses = (summary?.totalExpenses || 0) > 0;
    // Always show 4 cols if we want consistent layout, or dynamic
    const gridCols = showExpenses ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-4';

    // Expense Handlers
    const handleRegisterExpense = async () => {
        if (!expenseDescription || !expenseAmount) {
            toast.error("Completa descripción y monto");
            return;
        }

        setIsLoading(true);
        try {
            const res = await registerExpense({
                description: expenseDescription,
                amount: parseInt(expenseAmount),
                date: currentDate
            });

            if (res.success) {
                toast.success("Gasto registrado");
                setIsExpenseModalOpen(false);
                setExpenseDescription('');
                setExpenseAmount('');
                loadData();
            } else {
                toast.error(res.error || "Error al registrar gasto");
            }
        } catch (error) {
            toast.error("Error inesperado", { description: String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    // Function removed to match user request - deleted button logic
    const handleDeleteExpense = async (id: string) => {
        // Function intentionally removed from UI usage
    };


    // Client-side Filtering Logic
    const filteredTransactions = summary?.transactions?.filter((t: any) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            t.clientName?.toLowerCase().includes(term) ||
            t.ticketNumber?.toString().includes(term) ||
            t.clientCedula?.includes(term) ||
            t.clientPhone?.includes(term) ||
            t.amount?.toString().includes(term)
        );
    }) || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto pb-24">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl relative mb-4 shadow-sm flex flex-col gap-1 w-full">
                    <strong className="font-bold flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        Error del Sistema:
                    </strong>
                    <span className="block sm:inline font-mono text-sm whitespace-pre-wrap">{error}</span>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                                <Wallet size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Caja General</h1>
                        </div>

                        {/* Tags Logic */}
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                {cashCount} Efectivo
                            </span>
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">
                                {digitalCount} Bancaria
                            </span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                                Total: {totalCount}
                            </span>
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium ml-1">Resumen de movimientos diarios.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Anotar Gasto Button (Left of Date) */}
                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="px-4 py-2 bg-white border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <ArrowDownLeft size={18} />
                        Anotar Gasto
                    </button>

                    {/* Date Control (Pill Style) */}
                    <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center shadow-sm">
                        <button
                            onClick={() => {
                                const prev = new Date(currentDate);
                                prev.setDate(prev.getDate() - 1);
                                setCurrentDate(prev);
                            }}
                            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div
                            className="px-4 py-1 text-sm font-bold text-slate-600 capitalize cursor-pointer hover:text-indigo-600 select-none min-w-[180px] text-center"
                            onClick={() => setIsDateModalOpen(true)}
                        >
                            {format(currentDate, 'EEEE, d', { locale: es })} De {format(currentDate, 'MMMM', { locale: es })}
                        </div>
                        <button
                            onClick={() => {
                                const next = new Date(currentDate);
                                next.setDate(next.getDate() + 1);
                                setCurrentDate(next);
                            }}
                            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 1. Total Recaudado (Green) */}
                <div className="col-span-1 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4">
                        <div className="w-24 h-24 rounded-full bg-white blur-2xl"></div>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4 opacity-90">
                            <div className="p-2 bg-emerald-600/30 rounded-lg backdrop-blur-sm">
                                <Wallet size={20} />
                            </div>
                            <span className="font-bold text-sm tracking-wider uppercase">Total Recaudado</span>
                        </div>
                        <div className="text-4xl font-black mb-1">
                            {formatCurrency(summary?.totalCollected || 0)}
                        </div>
                    </div>
                </div>

                {/* 2. Bancos / Digital (Purple) */}
                <div
                    onClick={() => setIsDigitalModalOpen(true)}
                    className="col-span-1 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-violet-200/50 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <div className="absolute bottom-0 left-0 p-6 opacity-10">
                        <div className="w-32 h-32 rounded-full bg-white blur-3xl"></div>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4 opacity-90">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Smartphone size={20} />
                            </div>
                            <span className="font-bold text-sm tracking-wider uppercase">Bancos / Digital</span>
                        </div>
                        <div className="text-4xl font-black mb-2">
                            {formatCurrency(summary?.totalDigital || 0)}
                        </div>
                        <div className="flex items-center gap-2 text-violet-200 text-sm font-medium hover:text-white cursor-pointer transition-colors">
                            Ver detalles <ChevronRight size={14} />
                        </div>
                    </div>
                </div>

                {/* 3. Efectivo en Caja (White) */}
                <div className="col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-100/50">
                    <div className="flex items-center gap-3 mb-4 text-slate-500">
                        <div className="p-2 bg-slate-50 rounded-lg">
                            <Wallet size={20} className="text-slate-600" />
                        </div>
                        <span className="font-bold text-sm tracking-wider uppercase">Efectivo en Caja</span>
                    </div>
                    <div className={`text-4xl font-black mb-1 text-slate-900`}>
                        {formatCurrency(summary?.netCash || 0)}
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Efectivo Real (Neto)</p>
                </div>

                {/* 4. Gastos / Salidas (Pink) */}
                {/* Always show card layout to match image 1, or conditionally? Image 1 has it visible. */}
                <div
                    onClick={() => setIsExpensesListModalOpen(true)}
                    className="col-span-1 bg-rose-50 rounded-3xl p-6 border border-rose-100 cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <div className="flex items-center gap-3 mb-4 text-rose-500">
                        <div className="p-2 bg-white rounded-lg border border-rose-100">
                            <ArrowDownLeft size={20} className="rotate-45" />
                        </div>
                        <span className="font-bold text-sm tracking-wider uppercase">Gastos / Salidas</span>
                    </div>
                    <div className="text-4xl font-black mb-2 text-rose-600">
                        {formatCurrency(summary?.totalExpenses || 0)}
                    </div>
                    <div className="flex items-center gap-2 text-rose-400 text-sm font-medium hover:text-rose-600 cursor-pointer transition-colors">
                        Ver detalles <ChevronRight size={14} />
                    </div>
                </div>
            </div>

            {/* Filter Search */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="p-2 text-slate-400">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Búsqueda rápida (Nombre, C.C., Teléfono, Factura #...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full flex-1 outline-none text-slate-600 font-medium placeholder:text-slate-300"
                />
            </div>

            {/* Movements Section */}
            <div className="mt-8">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Movimientos</h3>
                </div>

                <div className="space-y-4">
                    {(summary?.transactions || []).map((tx: any, idx: number) => (
                        <div key={idx} onClick={() => handleTransactionClick(tx.orderId)} className="bg-white rounded-2xl p-6 flex items-center justify-between group transition-all hover:shadow-xl shadow-sm border border-slate-100 cursor-pointer relative overflow-hidden">

                            <div className="flex gap-5 w-full items-center">
                                {/* Icon Box */}
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${tx.itemsCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <Package size={24} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Header: Title */}
                                    <div className="mb-1">
                                        <h4 className="font-bold text-lg text-slate-900">
                                            {tx.itemsCount > 0 ? `${tx.itemsCount}x Prendas` : 'Movimiento de Caja'}
                                        </h4>
                                    </div>

                                    {/* Description */}
                                    <p className="text-slate-600 font-medium text-sm mb-3 line-clamp-2">
                                        {tx.itemsDescription || 'Sin descripción'}
                                    </p>

                                    {/* Metadata Row */}
                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                                        {tx.ticketNumber && tx.ticketNumber !== '---' && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-800">
                                                <Receipt size={14} />
                                                <span>Recibo #{tx.ticketNumber}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100/50">
                                            <User size={14} />
                                            <span>{tx.clientName}</span>
                                        </div>

                                        {tx.clientPhone && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100/50">
                                                <Phone size={14} />
                                                <span>{tx.clientPhone}</span>
                                            </div>
                                        )}

                                        {tx.clientCedula && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100/50">
                                                <CreditCard size={14} />
                                                <span>CC {tx.clientCedula}</span>
                                            </div>
                                        )}

                                        {/* Status Tag */}
                                        {tx.isPaid ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                <Banknote size={14} />
                                                PAGADO (CANCELADO)
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                <Banknote size={14} />
                                                ABONO
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Price Centered on Right */}
                                <div className="text-xl font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl flex-shrink-0 ml-4">
                                    +{formatCurrency(tx.amount)}
                                </div>
                            </div>
                        </div>
                    ))}

                    {(!(summary?.transactions || []).length && !isLoading) && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50 bg-white/50 rounded-3xl border border-dashed border-slate-300">
                            <Search size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-400 font-medium">No se encontraron movimientos hoy.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* INVOICE DETAILS MODAL */}
            {selectedInvoice && (
                <InvoiceDetailsModal
                    invoice={selectedInvoice}
                    isOpen={!!selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    isCashView={true}
                />
            )}

            {/* DIGITAL DETAILS MODAL */}
            {/* DIGITAL DETAILS MODAL */}
            {isDigitalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center md:pl-64 bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 relative">
                        <button onClick={() => setIsDigitalModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-slate-800 mb-6">Detalles Bancos</h3>

                        <div className="space-y-3">
                            {digitalStats
                                .filter(stat => stat.method !== 'Efectivo' && stat.total > 0)
                                .map((stat) => (
                                    <div key={stat.method} className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                                        <span className="font-bold text-indigo-900">{stat.method}</span>
                                        <span className="font-black text-indigo-600">{formatCurrency(stat.total)}</span>
                                    </div>
                                ))}

                            {digitalStats.filter(stat => stat.method !== 'Efectivo' && stat.total > 0).length === 0 && (
                                <p className="text-center text-slate-500 py-4">No hay movimientos digitales hoy.</p>
                            )}

                            {digitalStats.filter(stat => stat.method !== 'Efectivo' && stat.total > 0).length > 0 && (
                                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center px-3">
                                    <span className="font-bold text-slate-900">Total Bancos</span>
                                    <span className="font-black text-xl text-indigo-700">
                                        {formatCurrency(
                                            digitalStats
                                                .filter(stat => stat.method !== 'Efectivo')
                                                .reduce((acc, curr) => acc + curr.total, 0)
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DATE MODAL - Simplified for brevity but functional */}
            {isDateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center md:pl-64 bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 relative">
                        <button onClick={() => setIsDateModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-slate-800 mb-6">Seleccionar Fecha</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Fecha</label>
                                <input
                                    type="date"
                                    value={tempStartDate}
                                    onChange={e => setTempStartDate(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium text-slate-700 transition-all cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Fecha Fin (Opcional)</label>
                                <input
                                    type="date"
                                    value={tempEndDate}
                                    onChange={e => setTempEndDate(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium text-slate-700 transition-all cursor-pointer"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const today = new Date();
                                        const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                                        setTempStartDate(dateStr);
                                        setTempEndDate('');
                                        // Optional: Apply immediately? User asked to "select today", apply button is there.
                                        // But "automatically coloque" implies autofill.
                                    }}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all"
                                >
                                    Hoy
                                </button>
                                <button onClick={handleApplyDateRange} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 transition-all active:scale-[0.98]">
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPENSE MODAL */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center md:pl-64 bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 relative">
                        <button onClick={() => setIsExpenseModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="p-2 bg-rose-50 rounded-lg text-rose-500"><Wallet size={20} /></span>
                            Registrar Gasto
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">CONCEPTO</label>
                                <input
                                    value={expenseDescription}
                                    onChange={e => setExpenseDescription(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400 font-medium text-slate-700 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">MONTO</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={expenseAmount}
                                        onChange={e => setExpenseAmount(e.target.value)}
                                        className="w-full p-3 pl-7 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400 font-bold text-lg text-slate-800 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <button onClick={handleRegisterExpense} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200/50 transition-all active:scale-[0.98] mt-2">
                                Guardar Gasto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPENSES LIST MODAL - WITHOUT DELETE BUTTON */}
            {isExpensesListModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900">Detalle de Gastos</h3>
                            <button onClick={() => setIsExpensesListModalOpen(false)}><X /></button>
                        </div>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {summary?.expenses?.map((expense: any) => {
                                const isDeletable = (() => {
                                    const expenseDate = new Date(expense.date);
                                    const now = new Date();
                                    const diff = now.getTime() - expenseDate.getTime();
                                    const days = diff / (1000 * 3600 * 24);
                                    return days <= 3;
                                })();

                                return (
                                    <div key={expense.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center group">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{expense.description}</h4>
                                            <p className="text-xs text-slate-400">{format(new Date(expense.date), 'd MMM, h:mm a')}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-black text-rose-600">-{formatCurrency(expense.amount)}</span>
                                            {isDeletable && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('¿Borrar este gasto?')) {
                                                            await deleteExpense(expense.id);
                                                            loadData();
                                                            toast.success('Gasto eliminado');
                                                        }
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Borrar (Disponible por 3 días)"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Details Modal */}
            {selectedInvoice && (
                <InvoiceDetailsModal
                    invoice={selectedInvoice}
                    isOpen={isInvoiceModalOpen}
                    onClose={() => setIsInvoiceModalOpen(false)}
                    isCashView={true}
                />
            )}
        </div>
    );
}
