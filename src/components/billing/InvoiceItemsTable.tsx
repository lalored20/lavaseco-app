import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, AlertTriangle, Clock } from 'lucide-react';

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    notes?: string;
}

interface InvoiceItemsTableProps {
    items: InvoiceItem[];
    addItem: () => void;
    removeItem: (id: string) => void;
    updateItem: (id: string, field: keyof InvoiceItem, value: any) => void;
}

// Helper function for StatusBadge (assuming it's defined elsewhere or needs to be added)
// Placeholder for getAlertLevel - you'll need to define this function
const getAlertLevel = (scheduledDate: string, createdAt: string) => {
    // Example logic - replace with actual implementation
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const created = new Date(createdAt);

    const diffTime = Math.abs(scheduled.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (now > scheduled) {
        return 'overdue';
    } else if (diffDays <= 1) {
        return 'urgent';
    } else if (diffDays <= 3) {
        return 'warning';
    }
    return 'normal';
};

const StatusBadge = ({ invoice }: { invoice: any }) => {
    // 1. Calculate Alert Level based on Logistics Rules
    const alertLevel = getAlertLevel(invoice.scheduledDate, invoice.createdAt);

    // 2. Define Dot Color based on Alert Level
    let dotClass = "bg-slate-300"; // Default (None/Normal)
    if (alertLevel === 'overdue') dotClass = "bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.6)]";
    else if (alertLevel === 'urgent') dotClass = "bg-rose-400";
    else if (alertLevel === 'warning') dotClass = "bg-amber-400";
    else if (alertLevel === 'normal') dotClass = "bg-emerald-400"; // Green for "A Tiempo"

    // 3. Render Badges based on Business Status
    // --- DELIVERED ---
    if (invoice.status === 'delivered') {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} title="Estado Logística" />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/50 text-emerald-700 border border-emerald-200 w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold">Entregado</span>
                </div>
            </div>
        );
    }

    // --- READY FOR DELIVERY (Por Entregar) ---
    if (invoice.orderStatus === 'EN_PROCESO' || invoice.logisticsStatus === 'complete') {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} title="Estado Logística" />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100/50 text-blue-700 border border-blue-200 w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[11px] font-bold">Por Entregar</span>
                </div>
            </div>
        );
    }

    // --- MISSING (Faltante) ---
    // Matches logic from LogisticsOrganizePage: status === PENDING && (orderStatus === PROBLEMA OR isOverdue)
    // If it's effectively in 'Prendas Faltantes' list, we label it as such.
    const isOverdue = alertLevel === 'overdue';
    if ((invoice.status === 'PENDING' || !invoice.status || invoice.status === 'PROBLEMA') && (invoice.orderStatus === 'PROBLEMA' || (isOverdue && invoice.status !== 'delivered'))) {
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} title="Estado Logística" />
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100/50 text-red-700 border border-red-200 w-fit">
                    <AlertTriangle size={14} className="stroke-[2.5]" />
                    <span className="text-xs font-bold">Faltante</span>
                </div>
            </div>
        );
    }

    // --- PENDING ORGANIZATION (Por Organizar) ---
    return (
        <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} title="Estado Logística" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                <Clock size={14} className="stroke-[2.5]" />
                <span className="text-xs font-bold">Por Organizar</span>
            </div>
        </div>
    );
};

export const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
    items,
    addItem,
    removeItem,
    updateItem
}) => {
    // Refs to manage focus traversal
    const inputRefs = React.useRef<(HTMLInputElement | HTMLSelectElement | null)[][]>([]);
    const prevItemsLength = React.useRef(items.length);

    // Effect to focus the first input of a NEWLY added row
    React.useEffect(() => {
        if (items.length > prevItemsLength.current) {
            const lastIndex = items.length - 1;
            // Short timeout to ensure DOM is ready
            setTimeout(() => {
                inputRefs.current[lastIndex]?.[0]?.focus(); // Focus Quantity of new row
            }, 50);
        }
        prevItemsLength.current = items.length;
    }, [items.length]);

    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
        // Arrow Navigation
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextCol = colIndex + 1;
            if (nextCol < 4) { // 4 columns: Quantity, Desc, Notes, Price
                inputRefs.current[rowIndex][nextCol]?.focus();
            }
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevCol = colIndex - 1;
            if (prevCol >= 0) {
                inputRefs.current[rowIndex][prevCol]?.focus();
            }
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextRow = rowIndex + 1;
            if (nextRow < items.length) {
                inputRefs.current[nextRow][colIndex]?.focus();
            }
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevRow = rowIndex - 1;
            if (prevRow >= 0) {
                inputRefs.current[prevRow][colIndex]?.focus();
            }
        }

        // Enter: Add New Item
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem();
        }
    };

    // Ensure refs matrix is initialized for current rows
    inputRefs.current = items.map((_, i) => inputRefs.current[i] || []);

    return (
        <div className="p-6 flex-1 min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ítems de Venta</h3>
                <button
                    onClick={addItem}
                    className="text-orchid-600 hover:text-orchid-700 text-sm font-bold flex items-center gap-1 hover:bg-orchid-50 px-2 py-1 rounded-lg transition-colors"
                >
                    <Plus size={16} /> Añadir Ítem
                </button>
            </div>

            <div className="space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-[4.5rem_1fr_14rem_9rem_3rem] gap-2 px-2 text-xs font-semibold text-slate-500 mb-2">
                    <div className="text-center">Cant.</div>
                    <div>Descripción</div>
                    <div className="pl-4">Novedades (Defectos/Notas)</div>
                    <div className="text-right">Precio Unit.</div>
                    <div></div>
                </div>

                <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-[4.5rem_1fr_14rem_9rem_3rem] gap-2 items-center group"
                        >
                            {/* 1. Quantity (Col 0) */}
                            <div>
                                <input
                                    ref={(el) => { if (inputRefs.current[index]) inputRefs.current[index][0] = el; }}
                                    onKeyDown={(e) => handleKeyDown(e, index, 0)}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={item.quantity || ''}
                                    onChange={(e) => {
                                        // Only allow positive integers
                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                        updateItem(item.id, 'quantity', value === '' ? 0 : parseInt(value));
                                    }}
                                    className="w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-white focus:border-orchid-500 rounded-lg px-2 py-2 outline-none transition-all text-sm font-medium text-center"
                                />
                            </div>
                            {/* 2. Description (Col 1) */}
                            <div>
                                <input
                                    ref={(el) => { if (inputRefs.current[index]) inputRefs.current[index][1] = el; }}
                                    onKeyDown={(e) => handleKeyDown(e, index, 1)}
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    placeholder="Descripción de la prenda..."
                                    className="w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-white focus:border-orchid-500 rounded-lg px-3 py-2 outline-none transition-all text-sm font-medium placeholder:text-slate-400"
                                />
                            </div>
                            {/* 3. Notes/Select (Col 2) */}
                            <div>
                                <select
                                    ref={(el) => { if (inputRefs.current[index]) inputRefs.current[index][2] = el; }}
                                    onKeyDown={(e) => handleKeyDown(e, index, 2)}
                                    value={item.notes || ''}
                                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                                    className="w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-white focus:border-orchid-500 rounded-lg px-3 py-2 outline-none transition-all text-sm font-bold text-slate-600 cursor-pointer"
                                >
                                    <option value="">-- Ninguna --</option>
                                    <option value="ROTO">ROTO</option>
                                    <option value="MAREADO">MAREADO</option>
                                    <option value="QUEMADO">QUEMADO</option>
                                    <option value="MANCHADO">MANCHADO</option>
                                    <option value="REGULAR">REGULAR</option>
                                    <option value="OTROS">OTROS</option>
                                </select>
                            </div>
                            {/* 4. Price (Col 3) */}
                            <div>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                    <input
                                        ref={(el) => { if (inputRefs.current[index]) inputRefs.current[index][3] = el; }}
                                        onKeyDown={(e) => handleKeyDown(e, index, 3)}
                                        type="text"
                                        placeholder="0"
                                        value={item.price === 0 ? '' : new Intl.NumberFormat('es-CO').format(item.price)}
                                        onChange={(e) => {
                                            // Remove dots and non-numeric chars to get raw number
                                            const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                            updateItem(item.id, 'price', rawValue === '' ? 0 : parseInt(rawValue));
                                        }}
                                        className="w-full bg-slate-50 border border-transparent hover:border-slate-200 focus:bg-white focus:border-orchid-500 rounded-lg pl-5 pr-2 py-2 outline-none transition-all text-sm font-medium text-right"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};
