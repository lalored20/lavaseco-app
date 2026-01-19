"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Truck,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Clock,
    MapPin,
    Search,
    Filter,
    ArrowRight,
    Package
} from 'lucide-react';
import { toast } from 'sonner';

// --- MOCK DATA FOR UI DEVELOPMENT ---
// We will replace this with real server data later
const MOCK_INVOICES = [
    {
        id: '1',
        ticketNumber: 105,
        client: { name: 'Maria Gonzalez', phone: '3001234567' },
        createdAt: '2026-01-11T10:00:00', // Entry Date: 11th
        scheduledDate: '2026-01-13T10:00:00', // Delivery: 13th
        status: 'PENDIENTE',
        items: [
            { id: 'i1', type: 'Pantalón Paño', quantity: 2, checked: false },
            { id: 'i2', type: 'Saco Wool', quantity: 1, checked: false }
        ]
    },
    {
        id: '2',
        ticketNumber: 102,
        client: { name: 'Carlos Rodriguez', phone: '3109876543' },
        createdAt: '2026-01-10T09:00:00', // Entry: 10th (Oldest)
        scheduledDate: '2026-01-14T15:00:00', // Delivery: 14th
        status: 'PENDIENTE',
        items: [
            { id: 'i3', type: 'Edredón King', quantity: 1, checked: false }
        ]
    },
    {
        id: '3',
        ticketNumber: 110,
        client: { name: 'Ana Sofía', phone: '3205551234' },
        createdAt: '2026-01-14T08:00:00', // Entry: 14th
        scheduledDate: '2026-01-15T18:00:00', // Delivery: 15th (Tomorrow - Quick Turnaround)
        status: 'PENDIENTE',
        items: [
            { id: 'i4', type: 'Vestido Fiesta', quantity: 1, checked: false }
        ]
    }
];

export default function LogisticsPage() {
    const [invoices, setInvoices] = useState(MOCK_INVOICES);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // --- ALGORITHM: SORT BY OLDEST ENTRY ---
    // The user wants to organize from oldest entry to newest.
    // Filtered by search term as well.
    const filteredInvoices = invoices
        .filter(inv =>
            inv.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.ticketNumber.toString().includes(searchTerm)
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // --- ALERT LOGIC HELPER ---
    const getAlertLevel = (scheduledDate: string, createdAt: string) => {
        // Mocking "Today" as Jan 14th 2026 for testing strict scenarios
        // In real app use: const now = new Date();
        const now = new Date('2026-01-14T12:00:00');
        const delivery = new Date(scheduledDate);
        const entry = new Date(createdAt);

        // Reset hours for day comparison
        const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const deliveryZero = new Date(delivery.getFullYear(), delivery.getMonth(), delivery.getDate());
        const entryZero = new Date(entry.getFullYear(), entry.getMonth(), entry.getDate());

        const diffTime = deliveryZero.getTime() - todayZero.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const totalTime = deliveryZero.getTime() - entryZero.getTime();
        const totalDuration = Math.ceil(totalTime / (1000 * 60 * 60 * 24));

        // 1. DELIVERY DAY OR OVERDUE -> ALWAYS STRONG
        if (daysLeft <= 0) return 'strong';

        // 2. SHORT DURATION ITEMS (<= 3 days total)
        if (totalDuration <= 3) {
            if (daysLeft === 1) return 'soft'; // "Aleta suave" 1 day before
        }
        // 3. LONG DURATION ITEMS (> 3 days total)
        else {
            if (daysLeft === 1) return 'strong'; // "Alerta fuerte" 1 day before
            if (daysLeft === 2) return 'soft';   // "Alerta suave" 2 days before
        }

        return 'none';
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 space-y-8 animate-in fade-in duration-500">

            {/* HERDER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Logística</h1>
                    <p className="text-slate-500 font-medium">Organización y control de entrada de prendas</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                    <Search className="text-slate-400 ml-2" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar factura..."
                        className="bg-transparent outline-none text-slate-700 font-bold placeholder:font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">

                {/* LEFT: INVOICE LIST (Timeline) */}
                <div className="lg:col-span-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={16} /> Cola de Procesamiento
                        </h2>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4 space-y-3">
                        {filteredInvoices.map((inv) => {
                            const alertLevel = getAlertLevel(inv.scheduledDate, inv.createdAt);
                            return (
                                <motion.div
                                    key={inv.id}
                                    layoutId={inv.id}
                                    onClick={() => setSelectedInvoice(inv)}
                                    className={`
                                        p-5 rounded-2xl cursor-pointer border-2 transition-all group relative overflow-hidden
                                        ${selectedInvoice?.id === inv.id
                                            ? 'border-orchid-500 bg-orchid-50/50 shadow-md ring-2 ring-orchid-200 ring-offset-2'
                                            : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50 shadow-sm'
                                        }
                                    `}
                                >
                                    {/* Alert Indicator Strip */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 
                                        ${alertLevel === 'strong' ? 'bg-red-500' : alertLevel === 'soft' ? 'bg-amber-400' : 'bg-emerald-400'}
                                    `} />

                                    <div className="flex justify-between items-start mb-2 pl-3">
                                        <span className="font-black text-slate-800 text-lg">#{inv.ticketNumber}</span>
                                        {alertLevel === 'strong' && (
                                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <AlertTriangle size={10} /> URGENTE
                                            </span>
                                        )}
                                        {alertLevel === 'soft' && (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <Clock size={10} /> PRONTO
                                            </span>
                                        )}
                                    </div>

                                    <div className="pl-3 space-y-1">
                                        <p className="text-slate-600 font-bold text-sm truncate">{inv.client.name}</p>
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                                            <span className="flex items-center gap-1">
                                                Entró: {new Date(inv.createdAt).getDate()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                Entrega: {new Date(inv.scheduledDate).getDate()}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: WORKSPACE / CHECKLIST */}
                <div className="lg:col-span-2 flex flex-col h-full">
                    {selectedInvoice ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 flex-1 flex flex-col overflow-hidden relative"
                        >
                            {/* Header Invoice Details */}
                            <div className="p-8 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center backdrop-blur-md">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 mb-1">Factura #{selectedInvoice.ticketNumber}</h2>
                                    <p className="text-slate-500 font-medium flex items-center gap-2">
                                        <Calendar size={16} />
                                        Entrega esperada: <span className="text-slate-800 font-bold">
                                            {new Date(selectedInvoice.scheduledDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`
                                        px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-sm mb-2
                                        ${getAlertLevel(selectedInvoice.scheduledDate, selectedInvoice.createdAt) === 'strong'
                                            ? 'bg-red-50 border-red-100 text-red-600'
                                            : getAlertLevel(selectedInvoice.scheduledDate, selectedInvoice.createdAt) === 'soft'
                                                ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                        }
                                    `}>
                                        {getAlertLevel(selectedInvoice.scheduledDate, selectedInvoice.createdAt) === 'strong' ? (
                                            <> <AlertTriangle size={18} /> ATENCIÓN: RETRASO POTENCIAL </>
                                        ) : getAlertLevel(selectedInvoice.scheduledDate, selectedInvoice.createdAt) === 'soft' ? (
                                            <> <Clock size={18} /> PRIORIDAD ALTA </>
                                        ) : (
                                            <> <CheckCircle2 size={18} /> TIEMPO CORRECTO </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Checklist Area */}
                            <div className="flex-1 p-8 overflow-y-auto bg-grid-slate-50">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Verificación de Prendas</h3>
                                <div className="space-y-4">
                                    {selectedInvoice.items.map((item: any) => (
                                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-orchid-200 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-lg">
                                                    {item.quantity}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-lg">{item.type}</p>
                                                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Pendiente revisión</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors font-bold text-sm">
                                                    Falta
                                                </button>
                                                <button className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors font-bold text-sm">
                                                    Recibido
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-6 border-t border-slate-100 bg-white">
                                <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                    Confirmar Revisión Completa <ArrowRight size={20} />
                                </button>
                            </div>

                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                <Package size={40} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Selecciona una factura</h3>
                            <p className="text-slate-400 max-w-xs">Elige una factura de la cola izquierda para comenzar el proceso de organización.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
