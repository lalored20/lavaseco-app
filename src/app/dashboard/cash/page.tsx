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
    Package,
    MoreVertical
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getDailyCashSummary, registerExpense, deleteExpense, getInvoiceById, closeCashShift } from '@/lib/actions/billing';
import { generateShiftReportPDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import { InvoiceDetailsModal } from '@/components/billing/InvoiceDetailsModal';
import { useAuth } from '@/context/AuthContext';

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
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // End of Day Mode
    const { user } = useAuth(); // NEW: Check role
    const isAdmin = user?.role === 'ADMIN';

    // If Admin, default to "End of Day" mode (All Day View) effectively ignoring shifts by default unless toggled off?
    // Or just always pass true for Admin?
    // Let's make "isEndOfDay" true by default if Admin, or just hardcode the fetch param.
    // Better: Allow admin to toggle, but default to "View All".
    // View Mode State: 'current' | 'general' | shiftId
    const [viewMode, setViewMode] = useState<string>('current');
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
    const [isConfirmingClose, setIsConfirmingClose] = useState(false);

    // Update effect: if isAdmin changes users might prefer general view
    useEffect(() => {
        if (isAdmin) setViewMode('general');
    }, [isAdmin]);

    // Error state for debugging
    const [error, setError] = useState<string | null>(null);

    // Load Data Function
    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fix: Pass full date string to preserve timezone context
            const dateStr = currentDate.toString();
            const endStr = endDate ? endDate.toString() : undefined;

            // Determine Fetch Options based on ViewMode
            let fetchStart = dateStr;
            let fetchEnd = endStr;
            let options: any = { ignoreShifts: false, useExactTimes: false };

            if (viewMode === 'general') {
                options.ignoreShifts = true;
            } else if (viewMode !== 'current') {
                // Specific Shift logic
                const targetShift = summary?.previousShifts?.find((s: any) => s.id === viewMode);
                if (targetShift) {
                    fetchStart = targetShift.startTime;
                    fetchEnd = targetShift.endTime;
                    options.useExactTimes = true;
                }
            }

            // Pass options
            const data = await getDailyCashSummary(fetchStart, fetchEnd, options);

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

    // Initial Load & Param Change Effect
    useEffect(() => {
        loadData();
    }, [currentDate, endDate, viewMode]);

    // View Mode Reset Effect
    useEffect(() => {
        setViewMode('current');
    }, [currentDate, endDate]);

    // Auto-Refresh on Focus
    useEffect(() => {
        const onFocus = () => {
            loadData();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [currentDate, endDate, viewMode]); // Re-bind if params change to keep closure fresh

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


    // Filters & View State
    type FilterType = 'all' | 'income' | 'expense' | 'cash' | 'digital';
    const [filterType, setFilterType] = useState<FilterType>('all');

    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

    // Merge & Filter Logic
    const allMovements = React.useMemo(() => {
        if (!summary) return [];

        const incomes = (summary.transactions || []).map((t: any) => ({
            ...t,
            type: 'income',
            sortDate: new Date(t.date)
        }));

        const expenses = (summary.expenses || []).map((e: any) => ({
            ...e,
            type: 'expense',
            sortDate: new Date(e.date),
            method: 'Efectivo' // Expenses are usually cash unless specified, assuming cash for simplicity or adding logic
        }));

        const combined = [...incomes, ...expenses].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

        return combined.filter(item => {
            // Text Search
            // Text Search
            if (searchTerm) {
                const rawTerm = searchTerm;
                const trimmedTerm = rawTerm.trim();

                // PORTED LOGIC: Numeric Ticket Priority (Matches functionality of Invoice List)
                const isNumeric = /^\d+$/.test(trimmedTerm);

                if (isNumeric && trimmedTerm.length <= 4) {
                    const ticketStr = item.ticketNumber?.toString() || '';
                    if (rawTerm.endsWith(' ')) {
                        // EXACT MATCH (Trailing Space Rule)
                        if (ticketStr !== trimmedTerm) return false;
                        return true;
                    } else {
                        // PARTIAL MATCH (Ticket Only priority)
                        if (ticketStr.includes(trimmedTerm)) return true;
                        return false;
                    }
                }

                // General Search (Names, Descriptions, etc.)
                const normalize = (text: string) =>
                    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                const term = normalize(rawTerm);

                const textMatch = [
                    item.clientName,
                    item.description,
                    item.itemsDescription,
                    item.amount?.toString(),
                    item.ticketNumber?.toString(),
                    item.clientCedula,
                    item.clientPhone
                ].some(field => field && normalize(field.toString()).includes(term));

                if (!textMatch) return false;
            }

            // Type/Method Filters
            if (filterType === 'all') return true;
            if (filterType === 'income') return item.type === 'income';
            if (filterType === 'expense') return item.type === 'expense';
            if (filterType === 'cash') return (item.method === 'Efectivo' || item.type === 'expense'); // Expenses are cash usually
            if (filterType === 'digital') return (item.method !== 'Efectivo' && item.type === 'income');

            return true;
        });

    }, [summary, searchTerm, filterType]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Printing Logic
    const handlePrintClosing = () => {
        window.print();
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
                    {/* Print Button */}
                    <button
                        onClick={() => setIsClosingModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <Receipt size={18} />
                        <span className="hidden md:inline">Cierre Caja</span>
                    </button>

                    {/* Anotar Gasto Button (Left of Date) */}
                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="px-4 py-2 bg-white border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <ArrowDownLeft size={18} />
                        <span className="hidden md:inline">Gasto</span>
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
                            className="px-4 py-1 text-sm font-bold text-slate-600 capitalize cursor-pointer hover:text-indigo-600 select-none min-w-[140px] text-center"
                            onClick={() => setIsDateModalOpen(true)}
                        >
                            {endDate
                                ? `${format(currentDate, 'd MMM', { locale: es })} - ${format(endDate, 'd MMM', { locale: es })}`
                                : format(currentDate, 'EEEE, d MMM', { locale: es })}
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
                        <div className="text-2xl font-black mb-1">
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
                        <div className="text-2xl font-black mb-2">
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
                    <div className={`text-2xl font-black mb-1 text-slate-900`}>
                        {formatCurrency(summary?.netCash || 0)}
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Efectivo Real (Neto)</p>
                </div>

                {/* 4. Gastos / Salidas (Pink) */}
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
                    <div className="text-2xl font-black mb-2 text-rose-600">
                        {formatCurrency(summary?.totalExpenses || 0)}
                    </div>
                    <div className="flex items-center gap-2 text-rose-400 text-sm font-medium hover:text-rose-600 cursor-pointer transition-colors">
                        Ver detalles <ChevronRight size={14} />
                    </div>
                </div>
            </div>

            {/* Filter Search Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 flex-1">
                    <div className="p-2 text-slate-400">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full flex-1 outline-none text-slate-600 font-bold placeholder:text-slate-300 placeholder:font-medium"
                    />
                </div>

                {/* Filter Menu Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        className={`h-full aspect-square flex items-center justify-center rounded-2xl border transition-all ${isFilterMenuOpen
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                        {isFilterMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[180px] z-30 flex flex-col gap-1"
                            >
                                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrar por</div>
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'income', label: 'Ingresos' },
                                    { id: 'expense', label: 'Gastos' },
                                    { id: 'cash', label: 'Efectivo' },
                                    { id: 'digital', label: 'Digital' }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => {
                                            setFilterType(f.id as FilterType);
                                            setIsFilterMenuOpen(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-colors flex justify-between items-center ${filterType === f.id
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {f.label}
                                        {filterType === f.id && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
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
                    {allMovements.map((tx: any, idx: number) => (
                        <div key={tx.id || idx} onClick={() => tx.type === 'income' ? handleTransactionClick(tx.orderId) : null} className={`bg-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between group transition-all hover:shadow-xl shadow-sm border border-slate-100 relative overflow-hidden ${tx.type === 'income' ? 'cursor-pointer' : ''}`}>

                            <div className="flex gap-5 w-full items-start md:items-center">
                                {/* Icon Box */}
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${tx.type === 'expense' ? 'bg-rose-50 text-rose-500' : (tx.itemsCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600')}`}>
                                    {tx.type === 'expense' ? <ArrowDownLeft size={24} className="rotate-45" /> : <Package size={24} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Header: Title */}
                                    <div className="mb-1 flex flex-col md:flex-row md:items-center gap-2">
                                        <h4 className="font-bold text-lg text-slate-900">
                                            {tx.type === 'expense'
                                                ? 'Gasto / Salida'
                                                : (tx.itemsCount > 0 ? `${tx.itemsCount}x Prendas` : 'Movimiento de Caja')
                                            }
                                        </h4>
                                        <span className="text-xs font-bold text-slate-400 capitalize px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100 w-fit">
                                            {format(new Date(tx.date || tx.createdAt), 'h:mm a', { locale: es })}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-slate-600 font-medium text-sm mb-3 line-clamp-2">
                                        {tx.type === 'expense' ? tx.description : (tx.itemsDescription || 'Sin descripción')}
                                    </p>

                                    {/* Metadata Row */}
                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                                        {tx.type === 'expense' ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-100">
                                                <User size={14} />
                                                <span>Registrado por Usuario</span>
                                            </div>
                                        ) : (
                                            <>
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

                                                {/* Method Badge */}
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${tx.method === 'Efectivo' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
                                                    {tx.method === 'Efectivo' ? <Banknote size={14} /> : <Smartphone size={14} />}
                                                    {tx.method}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Price Centered on Right */}
                                <div className={`text-xl font-black px-4 py-2 rounded-xl flex-shrink-0 ml-4 ${tx.type === 'expense' ? 'text-rose-600 bg-rose-50' : 'text-slate-900 bg-slate-50'}`}>
                                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                                </div>
                            </div>
                        </div>
                    ))}

                    {allMovements.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50 bg-white/50 rounded-3xl border border-dashed border-slate-300">
                            <Search size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-400 font-medium">No se encontraron movimientos.</p>
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

                                if (confirmDeleteId === expense.id) {
                                    return (
                                        <div key={expense.id} className="bg-rose-50 rounded-xl p-4 border border-rose-200 flex justify-between items-center animate-in fade-in zoom-in-95 duration-200 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                                    <Trash2 size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-rose-800">¿Borrar este gasto?</p>
                                                    <p className="text-xs text-rose-500">Esta acción no se puede deshacer</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        await deleteExpense(expense.id);
                                                        loadData();
                                                        setConfirmDeleteId(null);
                                                        toast.success('Gasto eliminado');
                                                    }}
                                                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
                                                >
                                                    Sí, borrar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={expense.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center group hover:border-slate-200 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{expense.description}</h4>
                                            <p className="text-xs text-slate-400">{format(new Date(expense.date), 'd MMM, h:mm a')}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-black text-rose-600">-{formatCurrency(expense.amount)}</span>
                                            {isDeletable && (
                                                <button
                                                    onClick={() => setConfirmDeleteId(expense.id)}
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
            {/* CLOSING REPORT / SHIFT MODAL */}
            {isClosingModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200 print:bg-white print:p-0"
                    onClick={(e) => {
                        // Close only if clicking the backdrop itself
                        if (e.target === e.currentTarget) setIsClosingModalOpen(false);
                    }}
                >
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 relative print:shadow-none print:w-full print:max-w-none print:rounded-none max-h-[90vh] overflow-y-auto scrollbar-hide">
                        {/* Absolute Close Button */}
                        <button
                            onClick={() => setIsClosingModalOpen(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-500 rounded-full transition-colors z-10 print:hidden"
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>

                        {/* Header */}
                        <div className="mb-6 print:hidden">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">
                                    {viewMode === 'general' ? 'Cierre Definitivo' : (viewMode === 'current' ? 'Cierre de Turno' : 'Histórico de Turno')}
                                </h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                                    <p className="text-sm text-slate-500 font-medium whitespace-nowrap">
                                        Modo Visualización:
                                    </p>
                                    <select
                                        value={viewMode}
                                        onChange={(e) => setViewMode(e.target.value)}
                                        className="ml-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-200"
                                    >
                                        <option value="current">Turno Actual #{summary?.turnNumber || 1}</option>

                                        {/* List Previous Shifts */}
                                        {summary?.previousShifts?.map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                Turno #{s.turnNumber} ({format(new Date(s.endTime), 'h:mm a')})
                                            </option>
                                        ))}

                                        <option value="general">Reporte General (Día Completo)</option>
                                    </select>
                                </div>
                            </div>

                        </div>

                        {/* REPORT CONTENT */}
                        <div className="space-y-6" id="printable-report">
                            <div className="text-center pb-6 border-b border-dashed border-slate-300">
                                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">Lavaseco Orquídeas</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    {viewMode === 'general' ? 'REPORTE GENERAL DEL DÍA' : (viewMode === 'current' ? `REPORTE DE CAJA - TURNO #${summary?.turnNumber}` : `REPORTE DE HISTÓRICO - TURNO`)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Generado: {format(new Date(), 'd MMM yyyy, h:mm a', { locale: es })}</p>
                                <p className="text-sm text-slate-800 font-bold mt-2 bg-slate-100 py-1 rounded-lg inline-block px-4 border border-slate-200">
                                    {endDate
                                        ? `${format(currentDate, 'd MMM', { locale: es })} - ${format(endDate, 'd MMM', { locale: es })}`
                                        : format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                                </p>
                            </div>

                            {/* Financial Summary */}
                            <div className="space-y-4">
                                {/* Total Bruto */}
                                <div className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                    <span className="text-slate-600 font-bold">Ingresos Totales (Bruto)</span>
                                    <span className="font-black text-slate-900">{formatCurrency(summary?.totalCollected || 0)}</span>
                                </div>

                                {/* Desglose */}
                                <div className="pl-2 space-y-3">
                                    {/* Bancos / Digital */}
                                    <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 pb-2">
                                        <span className="text-indigo-600 font-medium flex items-center gap-2">
                                            <Smartphone size={14} /> Bancos / Digital
                                        </span>
                                        <span className="font-bold text-indigo-700">{formatCurrency(summary?.totalDigital || 0)}</span>
                                    </div>

                                    {/* Gastos Detailed */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-rose-500 font-medium flex items-center gap-2">
                                                <ArrowDownLeft size={14} className="rotate-45" /> Gastos
                                            </span>
                                            <span className="font-bold text-rose-600">-{formatCurrency(summary?.totalExpenses || 0)}</span>
                                        </div>
                                        {/* List of expenses if any */}
                                        {summary?.expenses?.length > 0 && (
                                            <div className="pl-6 text-xs space-y-1 text-slate-400">
                                                {summary.expenses.map((exp: any) => (
                                                    <div key={exp.id} className="flex justify-between">
                                                        <span>• {exp.description}</span>
                                                        <span>{formatCurrency(exp.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Efectivo en Caja (NETO) */}
                                    <div className="flex justify-between items-center text-base pt-2 border-t border-slate-300">
                                        <span className="text-slate-800 font-black uppercase flex items-center gap-2">
                                            <Wallet size={16} /> Efectivo en Caja
                                        </span>
                                        <span className="font-black text-slate-900 text-lg">{formatCurrency(summary?.netCash || 0)}</span>
                                    </div>
                                </div>

                                {/* Signatures */}
                                <div className="pt-12 grid grid-cols-2 gap-8 print:pt-24 mt-8">
                                    <div className="border-t border-slate-300 pt-2 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Firma Responsable</p>
                                    </div>
                                    <div className="border-t border-slate-300 pt-2 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Revisado</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions (Hidden on Print) */}
                            <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3 print:hidden flex-col">
                                <button
                                    onClick={() => window.print()}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Receipt size={20} />
                                    Imprimir Reporte
                                </button>

                                {viewMode === 'current' && (
                                    <>
                                        {!isConfirmingClose ? (
                                            <button
                                                onClick={() => setIsConfirmingClose(true)}

                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                            >
                                                <Clock size={20} />
                                                CONFIRMAR CIERRE DE TURNO
                                            </button>
                                        ) : (
                                            <div className="bg-rose-50 border-2 border-rose-100 rounded-xl p-4 animate-in fade-in zoom-in-95">
                                                <p className="text-rose-700 font-bold text-center mb-3 text-sm">
                                                    ¿Seguro que deseas terminar turno?
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setIsConfirmingClose(false)}
                                                        className="flex-1 bg-white border border-rose-200 text-rose-700 py-2 rounded-lg font-bold hover:bg-rose-100 transition-colors text-sm"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setIsLoading(true);

                                                            // 1. Generate and Download PDF Report
                                                            try {
                                                                await generateShiftReportPDF({
                                                                    turnNumber: summary?.turnNumber || 0,
                                                                    startDate: summary?.startDate || '',
                                                                    endDate: summary?.endDate || '',
                                                                    totalCash: summary?.totalCash || 0,
                                                                    totalDigital: summary?.totalDigital || 0,
                                                                    totalExpenses: summary?.totalExpenses || 0,
                                                                    netCash: summary?.netCash || 0,
                                                                    transactions: summary?.transactions || [],
                                                                    expenses: summary?.expenses || [],
                                                                    digitalBreakdown: summary?.digitalBreakdown,
                                                                    reportTitle: viewMode === 'general' ? 'REPORTE GENERAL DEL DÍA' : undefined
                                                                }, true);
                                                            } catch (err) {
                                                                console.error("Error generating PDF:", err);
                                                                toast.error("Error al generar el reporte PDF");
                                                            }

                                                            // 2. Proceed with Closing
                                                            try {
                                                                const res = await closeCashShift({
                                                                    turnNumber: (summary?.turnNumber || 0),
                                                                    cashCount: summary?.netCash || 0,
                                                                    digitalCount: summary?.totalDigital || 0,
                                                                    expenseCount: summary?.totalExpenses || 0,
                                                                    totalCalculated: summary?.netCash || 0
                                                                });

                                                                if (res.success) {
                                                                    toast.success("Turno cerrado correctamente");
                                                                    setIsClosingModalOpen(false);
                                                                    setIsConfirmingClose(false);
                                                                    if (typeof window !== 'undefined') {
                                                                        window.location.reload();
                                                                    }
                                                                } else {
                                                                    toast.error(res.error || "Error al cerrar turno");
                                                                }
                                                            } catch (error) {
                                                                console.error(error);
                                                                toast.error("Error de conexión");
                                                            } finally {
                                                                setIsLoading(false);
                                                            }
                                                        }}
                                                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg font-bold shadow-md shadow-rose-200 transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        {isLoading ? 'Cerrando...' : 'Sí, Terminar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
