"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, Printer, FileText, Clock, X, Loader2, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextFolio } from '@/lib/actions/billing';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import { useDebounce } from '@/hooks/useDebounce';
import { ClientForm } from '@/components/billing/ClientForm';
import { InvoiceItemsTable, InvoiceItem } from '@/components/billing/InvoiceItemsTable';
import { useInvoiceSync } from '@/hooks/useInvoiceSync';
import { useCashRegister } from '@/context/CashRegisterContext';

export default function BillingPage() {
    const { createSmartInvoice } = useInvoiceSync();
    const { openRegister } = useCashRegister();
    // Standard Loading State
    const [loading, setLoading] = useState(false);


    // State for New Invoice
    const [clientCedula, setClientCedula] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', description: '', quantity: 1, price: 0 }
    ]);
    const [paymentStatus, setPaymentStatus] = useState<'PENDIENTE' | 'ABONO' | 'CANCELADO'>('PENDIENTE');
    // Store result of the payment config modal
    const [configuredPayment, setConfiguredPayment] = useState<{ amount: number, method: string } | null>(null);

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentDate, setCurrentDate] = useState('');
    const [nextFolio, setNextFolio] = useState<number | null>(0);
    const [deliveryDate, setDeliveryDate] = useState<string>('');

    const [generalNote, setGeneralNote] = useState('');
    const [printFormat, setPrintFormat] = useState<'ticket' | 'letter'>('ticket');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }));
        fetchNextFolioLocal();

        // Load Draft
        const savedDraft = localStorage.getItem('invoice_draft');
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.clientCedula) setClientCedula(draft.clientCedula);
                if (draft.clientName) setClientName(draft.clientName);
                if (draft.clientPhone) setClientPhone(draft.clientPhone);
                if (draft.items) setItems(draft.items);
                // We don't restore payment status/config purely to avoid confusion, or we could strict restore
                if (draft.deliveryDate) setDeliveryDate(draft.deliveryDate);
                if (draft.generalNote) setGeneralNote(draft.generalNote);
                toast.info("Borrador recuperado", { description: "Protección contra fallos activada" });
            } catch (e) {
                console.error("Error cargando borrador", e);
            }
        }
    }, []);

    const draftState = {
        clientCedula,
        clientName,
        clientPhone,
        items,
        deliveryDate,
        generalNote
    };

    // Debounce the draft state to avoid saving on every keystroke
    const debouncedDraft = useDebounce(draftState, 1000);

    // Auto-Save Effect
    useEffect(() => {
        if (debouncedDraft.clientCedula || debouncedDraft.clientName || debouncedDraft.items.length > 1) {
            localStorage.setItem('invoice_draft', JSON.stringify(debouncedDraft));
        }
    }, [debouncedDraft]);

    const fetchNextFolioLocal = async () => {
        try {
            const data = await getNextFolio();
            if (data.nextId && data.nextId > 0) {
                setNextFolio(data.nextId);
                localStorage.setItem('cached_next_folio', data.nextId.toString());
            } else {
                useCachedFolio();
            }
        } catch (error) {
            console.error("Error loading folio", error);
            useCachedFolio();
        }
    };

    const useCachedFolio = () => {
        const cached = localStorage.getItem('cached_next_folio');
        if (cached) {
            setNextFolio(parseInt(cached));
            toast.info("Modo Offline: Folio estimado", { description: `Usando secuencia local: #${cached}` });
        } else {
            setNextFolio(0);
        }
    };

    // Calculated Totals
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const tax = subtotal * 0;
    const total = subtotal + tax;

    // Actions
    const addItem = () => {
        setItems([...items, {
            id: Math.random().toString(36).substr(2, 9),
            description: '',
            quantity: 1,
            price: 0
        }]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const resetForm = () => {
        localStorage.removeItem('invoice_draft');
        setClientCedula('');
        setClientName('');
        setClientPhone('');
        setItems([{ id: Math.random().toString(36), description: '', quantity: 1, price: 0 }]);
        setPaymentStatus('PENDIENTE');
        setConfiguredPayment(null);
        setDeliveryDate('');
        setGeneralNote(''); // Clear note
    };

    const processSave = async (payData?: { amount: number, status: string, method: string }) => {
        setIsSaving(true);

        const finalAbono = payData ? payData.amount : 0;
        const finalStatus = payData ? payData.status : 'PENDIENTE';
        const finalMethod = payData ? payData.method : 'Efectivo';

        const invoiceData = {
            id: crypto.randomUUID(),
            ticketNumber: nextFolio || 0,
            client: {
                cedula: clientCedula,
                name: clientName, // Ensure we use the state variable
                phone: clientPhone
            },
            items: items.map(i => ({
                description: i.description,
                quantity: i.quantity,
                price: i.price,
                notes: i.notes
            })),
            payment: {
                amount: finalStatus === 'CANCELADO' ? total : finalAbono,
                status: finalStatus,
                abono: finalAbono,
                total: total,
                method: finalMethod
            },
            payments: finalAbono > 0 ? [{
                amount: finalStatus === 'CANCELADO' ? total : finalAbono,
                type: 'ABONO_INICIAL',
                method: finalMethod,
                createdAt: new Date().toISOString(),
                note: `Abono Inicial (${finalMethod})`
            }] : [],
            totalValue: total,
            paidAmount: finalStatus === 'CANCELADO' ? total : finalAbono,
            dates: {
                created: new Date(),
                delivery: deliveryDate ? `${deliveryDate}T12:00:00` : undefined
            },
            generalNote: generalNote,
            paymentMethod: finalMethod
        };

        try {
            const result = await createSmartInvoice(invoiceData);

            if (!result.success) {
                throw new Error(result.error || "Error al guardar");
            }

            const finalFolio = result.folio || nextFolio;

            toast.success(`Factura #${finalFolio} Creada`, {
                description: result.mode === 'OFFLINE' ? "Guardada en dispositivo (Pendiente de Sync)" : "Guardada y Sincronizada"
            });

            try {
                const pdfBlob = await generateInvoicePDF({
                    ticketNumber: finalFolio,
                    client: {
                        name: clientName, // Use state
                        cedula: clientCedula,
                        phone: clientPhone
                    },
                    items: items.map(i => ({
                        quantity: i.quantity,
                        description: i.description || 'Prenda',
                        notes: i.notes,
                        price: i.price
                    })),
                    totalValue: total,
                    paidAmount: finalStatus === 'CANCELADO' ? total : finalAbono,
                    date: new Date(),
                    paymentStatus: finalStatus,
                    generalNote: generalNote
                }, printFormat, false); // Don't auto-download initially

                // Auto-print with fallback
                if (pdfBlob) {
                    const pdfUrl = URL.createObjectURL(pdfBlob);

                    // Try to open in new window for printing
                    const printWindow = window.open(pdfUrl, '_blank');

                    if (printWindow) {
                        // Successfully opened - trigger print dialog
                        printWindow.onload = () => {
                            setTimeout(() => {
                                printWindow.print();
                            }, 500);
                        };

                        // Clean up after a delay
                        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);

                        toast.success("Diálogo de impresión abierto", {
                            description: "Selecciona tu impresora térmica"
                        });
                    } else {
                        // Popup blocked - download instead
                        const link = document.createElement('a');
                        link.href = pdfUrl;
                        link.download = `Recibo_Lavaseco_${finalFolio}.pdf`;
                        link.click();
                        URL.revokeObjectURL(pdfUrl);

                        toast.warning("Popup bloqueado", {
                            description: "PDF descargado. Ábrelo para imprimir."
                        });
                    }
                }
            } catch (pdfError) {
                console.error("Error generating PDF:", pdfError);
                toast.error("Factura guardada, pero falló la descarga del PDF");
            }

            if (generalNote.trim() && invoiceData.id) {
                localStorage.setItem(`lavaseco_note_${invoiceData.id}`, generalNote);
            }

            resetForm();

            if (nextFolio) {
                setNextFolio(nextFolio + 1);
                localStorage.setItem('cached_next_folio', (nextFolio + 1).toString());
            }

        } catch (error: any) {
            console.error("Save Error:", error);
            toast.error("Error al guardar", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    // Button Handlers
    const handleSetAbono = () => {
        if (paymentStatus === 'ABONO') {
            // Already active, maybe just clear it? Or allow re-config?
            // Let's toggle to Pending for simple UX
            setPaymentStatus('PENDIENTE');
            setConfiguredPayment(null);
            return;
        }

        // Open Config
        openRegister({
            amountToPay: total,
            allowAmountEdit: true,
            clientName: clientName,
            reference: "Configurar Abono",
            mode: 'payment-config',
            onConfirm: async (res) => {
                setPaymentStatus('ABONO');
                setConfiguredPayment({ amount: res.amount, method: res.method });
            }
        });
    };

    const handleSetCancelado = () => {
        if (paymentStatus === 'CANCELADO') {
            setPaymentStatus('PENDIENTE');
            setConfiguredPayment(null);
            return;
        }

        openRegister({
            amountToPay: total,
            allowAmountEdit: false,
            clientName: clientName,
            reference: "Pago Total",
            mode: 'payment-config',
            onConfirm: async (res) => {
                setPaymentStatus('CANCELADO');
                setConfiguredPayment({ amount: res.amount, method: res.method });
            }
        });
    };

    const handleSave = () => {
        if (!clientCedula) return toast.error("Falta la cédula del cliente");
        if (!clientName) return toast.error("Falta el nombre del cliente");
        if (!deliveryDate) return toast.error("La fecha de entrega es obligatoria");
        if (items.some(i => !i.description || i.price <= 0)) return toast.error("Revisa los ítems de la factura");

        if (paymentStatus === 'PENDIENTE') {
            processSave();
        } else {
            // Use configured values
            if (!configuredPayment) {
                // Fallback (shouldn't happen with UI logic, maybe re-trigger?)
                toast.error("Error: Configure el pago nuevamente");
                return;
            }

            // Save immediately
            processSave({
                amount: configuredPayment.amount,
                status: paymentStatus,
                method: configuredPayment.method
            }).then(() => {
                // POST-SAVE: Calculator if Cash
                if (configuredPayment.method === 'Efectivo') {
                    // Small delay to prevent modal conflict/toast overlap
                    setTimeout(() => {
                        openRegister({
                            amountToPay: configuredPayment.amount,
                            clientName: clientName,
                            reference: "Calculadora de Cambio",
                            mode: 'change-calculator',
                            onConfirm: async () => { } // Just close
                        });
                    }, 500);
                }
            });
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <motion.h1
                        layoutId="page-title"
                        className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3"
                    >
                        Nueva Factura
                    </motion.h1>
                </div>
                <div className="flex gap-2">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Hoy</span>
                        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-orchid-100 flex items-center gap-2 text-sm font-medium text-slate-600">
                            <Clock size={16} className="text-orchid-600" />
                            <span>{currentDate}</span>
                        </div>
                    </div>

                    {/* Editable Delivery Date */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Entrega <span className="text-red-500">*</span></span>
                        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-orchid-100 flex items-center gap-2 text-sm font-medium text-slate-600 hover:border-orchid-300 transition-colors cursor-pointer relative">
                            <Calendar size={16} className="text-orchid-600" />
                            <input
                                type="date"
                                className="bg-transparent outline-none text-slate-600 font-medium cursor-pointer"
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                value={deliveryDate}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>
                    <div className="bg-orchid-100 px-6 py-2 rounded-2xl border border-orchid-200 flex items-center gap-2 shadow-sm">
                        <span className="text-orchid-700 text-2xl font-black tracking-tight">
                            {nextFolio !== null ? (nextFolio === 0 ? "AUTO" : `# ${nextFolio}`) : <Loader2 className="animate-spin w-6 h-6" />}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6 flex-1 h-full">

                {/* Invoice Form */}
                <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
                    {/* Client Section */}
                    <ClientForm
                        clientCedula={clientCedula}
                        setClientCedula={setClientCedula}
                        clientName={clientName}
                        setClientName={setClientName}
                        clientPhone={clientPhone}
                        setClientPhone={setClientPhone}
                    />

                    {/* Items Section */}
                    <InvoiceItemsTable
                        items={items}
                        addItem={addItem}
                        removeItem={removeItem}
                        updateItem={updateItem}
                    />

                    {/* General Note Button */}
                    <div className="bg-white p-6 border-t border-slate-100">
                        <button
                            onClick={() => setShowNoteModal(true)}
                            className={`w-full py-3 px-4 rounded-xl text-sm font-bold border-2 border-dashed transition-all flex items-center justify-center gap-2 ${generalNote
                                ? 'border-orchid-200 bg-orchid-50 text-orchid-600'
                                : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'
                                }`}
                        >
                            <FileText size={18} />
                            {generalNote ? 'Editar Nota General' : 'Agregar Nota General / Observaciones'}
                        </button>

                    </div>

                    {/* Totals & Footer */}
                    <div className="bg-slate-50 p-6 border-t border-slate-200">
                        <div className="flex flex-col md:flex-row justify-between items-end gap-6">

                            {/* Payment Status w/ Immediate Trigger */}
                            <div className="w-full md:w-1/2 space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Estado del Pago</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSetAbono}
                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold border transition-all ${paymentStatus === 'ABONO'
                                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm ring-2 ring-yellow-100'
                                            : 'bg-white text-slate-400 border-slate-200 hover:border-yellow-200 hover:text-yellow-600'
                                            }`}
                                    >
                                        ABONO
                                    </button>
                                    <button
                                        onClick={handleSetCancelado}
                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold border transition-all ${paymentStatus === 'CANCELADO'
                                            ? 'bg-green-100 text-green-700 border-green-200 shadow-sm ring-2 ring-green-100'
                                            : 'bg-white text-slate-400 border-slate-200 hover:border-green-200 hover:text-green-600'
                                            }`}
                                    >
                                        CANCELADO
                                    </button>
                                </div>
                            </div>

                            {/* Numbers */}
                            <div className="w-full md:w-1/2 space-y-2">
                                <div className="flex justify-between text-slate-500 text-sm">
                                    <span>Total Prendas</span>
                                    <span>{items.reduce((acc, item) => acc + (item.quantity || 0), 0)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 text-sm">
                                    <span>Subtotal</span>
                                    <span>${new Intl.NumberFormat('es-CO').format(subtotal)}</span>
                                </div>
                                {(paymentStatus === 'ABONO' || paymentStatus === 'CANCELADO') && configuredPayment && (
                                    <div className="flex justify-between text-sm animate-in fade-in slide-in-from-right-2">
                                        <span>Detalle Pago</span>
                                        <span className={`${paymentStatus === 'CANCELADO' ? 'text-green-600' : 'text-yellow-600'} font-bold flex gap-1 items-center`}>
                                            {paymentStatus}: ${new Intl.NumberFormat('es-CO').format(configuredPayment.amount)}
                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded uppercase">{configuredPayment.method}</span>
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-900 text-2xl font-bold">
                                    <span>{paymentStatus === 'CANCELADO' ? 'Saldo Pendiente' : 'Total a Pagar'}</span>
                                    <span>${new Intl.NumberFormat('es-CO').format(
                                        paymentStatus === 'ABONO' && configuredPayment
                                            ? total - configuredPayment.amount
                                            : (paymentStatus === 'CANCELADO' ? 0 : total)
                                    )}</span>
                                </div>
                            </div>
                        </div>


                        {/* Print Format Toggle */}
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200 mt-4 mb-2">
                            <button
                                onClick={() => setPrintFormat('ticket')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${printFormat === 'ticket' ? 'bg-orchid-100 text-orchid-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Printer size={16} /> Ticket (80mm)
                            </button>
                            <button
                                onClick={() => setPrintFormat('letter')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${printFormat === 'letter' ? 'bg-orchid-100 text-orchid-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <FileText size={16} /> Carta
                            </button>
                        </div>

                        {/* Main Action */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            {isSaving ? "Guardando..." : "Guardar & Imprimir"}
                        </button>
                    </div>
                </div>
            </div>




            {/* General Note Modal */}
            <AnimatePresence>
                {showNoteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:pl-64"
                        onClick={() => setShowNoteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">Nota General / Observaciones</h3>
                                <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <textarea
                                    value={generalNote}
                                    onChange={(e) => setGeneralNote(e.target.value)}
                                    placeholder="Escribe aquí cualquier observación general para la factura (ej: Entregar en portería, Urgente, etc.)"
                                    className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-700 outline-none focus:border-orchid-500 focus:ring-2 focus:ring-orchid-100 transition-all resize-none"
                                    autoFocus
                                />

                                <button
                                    onClick={() => setShowNoteModal(false)}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                                >
                                    Guardar Nota
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

