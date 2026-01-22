import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Printer, CheckCircle2, MapPin, Calendar, Clock, User, Phone, FileText, DollarSign, Tag, PackageCheck, ArrowRightCircle, CreditCard, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { registerPayment, deliverOrder, cancelOrder } from '@/lib/actions/billing';
import { useCashRegister } from '@/context/CashRegisterContext';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import { updateInvoice } from '@/lib/billing/offline-storage';

interface InvoiceDetailsModalProps {
    invoice: any;
    isOpen: boolean;
    onClose: () => void;
    isLogisticsView?: boolean;
    isMissingView?: boolean;
    isDeliveryView?: boolean; // New Prop for Delivery View
    isHistoryView?: boolean; // New Prop for History View
    isCashView?: boolean; // New Prop for Cash Register View (Disable Marcas logic)
    isCashView?: boolean; // New Prop for Cash Register View (Disable Marcas logic)
    onInvoiceUpdate?: (invoice: any) => void;
    onOrganize?: (id: string, ticketNumber: number) => void; // New Prop for Organize Action
    onMarkMissing?: (id: string, ticketNumber: number) => void; // New Prop for Missing Action
}

export function InvoiceDetailsModal({ invoice, isOpen, onClose, isLogisticsView = false, isMissingView = false, isDeliveryView = false, isHistoryView = false, isCashView = false, onInvoiceUpdate, onOrganize, onMarkMissing }: InvoiceDetailsModalProps) {
    const router = useRouter();
    const { openRegister } = useCashRegister();
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [itemMarks, setItemMarks] = useState<{ [key: number]: string }>({});
    const [isSubmittingBrands, setIsSubmittingBrands] = useState(false);

    // Print Modal State

    // Print Modal State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printNote, setPrintNote] = useState('');

    // Cancel Modal State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // Optimistic UI State
    const [localInvoice, setLocalInvoice] = useState(invoice);

    // Derived State for Dynamic UI Adaptation (Logic unification)
    // If invoice status is 'delivered', treat as History View (hide marks, show delivered date)
    // We check both 'status' and 'logisticsStatus' to be robust across different views (Logistics vs Billing)
    const isDelivered = localInvoice?.status === 'delivered' || localInvoice?.logisticsStatus === 'delivered' || localInvoice?.status === 'entregado';
    // If invoice is Ready (Logistics Complete OR En Proceso) AND NOT Delivered, treat as Ready/Delivery View
    // FIX: Include orderStatus to match List logic
    const isReadyForDelivery = (
        localInvoice?.logisticsStatus === 'complete' ||
        localInvoice?.status === 'EN_PROCESO' ||
        localInvoice?.orderStatus === 'EN_PROCESO' ||
        localInvoice?.status === 'ready'
    ) && !isDelivered;

    const effectiveDeliveryView = isDeliveryView || isReadyForDelivery;
    const effectiveHistoryView = isHistoryView || isDelivered;

    // Sync local state with prop when server data updates AND check for fresher offline data
    useEffect(() => {
        if (invoice) {
            // Initial load from props
            let freshInvoice = {
                ...invoice,
                paidAmount: invoice.paidAmount || invoice.payment?.amount || 0,
                totalValue: invoice.totalValue || 0
            };

            // Attempt to hydrate from Dexie/Local Storage for latest status
            // This fixes the "Facturas Creadas" stale status issue
            const offlineKey = `lavaseco_invoice_${invoice.id}`; // Assumption on key pattern, or we check logs

            // Re-check logs to determine if it was delivered locally
            const localLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${invoice.id}`) || '[]');
            const wasDeliveredLocally = localLogs.some((l: any) => l.type === 'STATUS_CHANGE' && (l.description === 'Pedido Entregado' || l.status === 'delivered'));

            if (wasDeliveredLocally) {
                freshInvoice.status = 'delivered';
                freshInvoice.logisticsStatus = 'delivered';
                freshInvoice.paymentStatus = 'CANCELADO'; // Delivery implies payment usually
            }

            setLocalInvoice(freshInvoice);
        }
    }, [invoice, isOpen]);

    // ... (keep existing code)

    const onDeliverLogic = async () => {
        const now = new Date().toISOString();

        // 1. Log Delivery Locally
        const deliverLog = {
            type: 'STATUS_CHANGE',
            description: 'Pedido Entregado',
            date: now
        };
        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${localInvoice.id}`) || '[]');
        localStorage.setItem(`lavaseco_logs_${localInvoice.id}`, JSON.stringify([...existingLogs, deliverLog]));

        // 2. Optimistic UI Update immediately
        setLocalInvoice((prev: any) => ({
            ...prev,
            status: 'delivered',
            logisticsStatus: 'delivered',
            deliveryDate: now,
            paymentStatus: prev.paymentStatus === 'PAGADO' ? 'CANCELADO' : prev.paymentStatus
        }));

        // 3. Update Local DB (Dexie) - CRITICAL for Delivery List Sync
        await updateInvoice(localInvoice.id, {
            status: 'delivered',
            logisticsStatus: 'delivered',
            orderStatus: 'delivered',
            deliveryDate: now,
            paymentStatus: 'CANCELADO', // Delivery implies settled
            updatedAt: now
        });

        // 4. Server Action
        const res = await deliverOrder(localInvoice.id);

        if (res?.success) {
            toast.success("¡Pedido Entregado Exitosamente!");
            // Update parent list
            if (onInvoiceUpdate) onInvoiceUpdate({
                ...localInvoice,
                status: 'delivered',
                logisticsStatus: 'delivered',
                paymentStatus: 'CANCELADO',
                paidAmount: localInvoice.totalValue,
                deliveryDate: now
            });
            onClose();
            router.refresh();
        } else {
            toast.error("Error al entregar el pedido");
        }
    };

    // Load persisted brands and notes on mount/open
    useEffect(() => {
        if (isOpen && localInvoice) {
            // Load Brands
            const savedMarks = localStorage.getItem(`lavaseco_marks_${localInvoice.id}`);
            if (savedMarks) {
                setItemMarks(JSON.parse(savedMarks));
            } else {
                setItemMarks({});
            }

            // Load Note
            const savedNote = localStorage.getItem(`lavaseco_note_${localInvoice.id}`);
            if (savedNote) {
                setNoteText(savedNote);
            } else {
                setNoteText('');
            }
        }
    }, [isOpen, localInvoice]);

    // Unified Status History Management
    const [statusHistory, setStatusHistory] = useState<any[]>([]);
    const [lastLogUpdate, setLastLogUpdate] = useState(0);

    useEffect(() => {
        if (!localInvoice) return;

        // 1. Get Server Payments
        const sourcePayments = (localInvoice.paymentLogs && localInvoice.paymentLogs.length > 0)
            ? localInvoice.paymentLogs
            : (localInvoice.payments || []);

        const serverPayments = sourcePayments.map((p: any) => ({
            type: 'PAYMENT',
            description: p.note || (p.type === 'ABONO_INICIAL' ? 'Abono Inicial' : `Cliente abonó $${new Intl.NumberFormat('es-CO').format(p.amount)}`),
            amount: p.amount,
            date: p.createdAt,
            rawDate: new Date(p.createdAt)
        }));

        // Fallback: If no payments recorded but paidAmount > 0, we create a synthetic initial payment log
        // This fixes the issue where initial down payments don't show up in history if the 'payments' array is missing/empty
        if (serverPayments.length === 0 && (Number(localInvoice.paidAmount) > 0 || Number(localInvoice.payment?.amount) > 0)) {
            const amount = Number(localInvoice.paidAmount) || Number(localInvoice.payment?.amount);
            serverPayments.push({
                type: 'PAYMENT',
                description: 'Abono Inicial (Registrado)',
                amount: amount,
                // Use creation date as fallback for the payment date
                date: localInvoice.createdAt || localInvoice.dates?.created || new Date().toISOString(),
                rawDate: new Date(localInvoice.createdAt || localInvoice.dates?.created || new Date())
            });
        }

        // 2. Get Local Event Logs
        const localLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${localInvoice.id}`) || '[]').map((l: any) => ({
            type: l.type,
            description: l.description,
            type: l.type,
            description: l.description,
            amount: l.amount || 0,
            date: l.date,
            rawDate: new Date(l.date)
        }));

        // 3. Merge and Deduplicate
        // We prioritize Server Payments. If a local log roughly matches a server payment (same amount within short time), we drop the local one to avoid duplicates.
        const merged = [...serverPayments];
        const serverPaymentSignatures = new Set(serverPayments.map((p: any) => `${p.amount}-${new Date(p.date).getTime()}`)); // Simple signature

        localLogs.forEach((local: any) => {
            // Check if this local log is redundant (already exists in server logs)
            // We give a generous 2 minute buffer for timestamp mismatch between client/server creation time
            const isRedundant = serverPayments.some((server: any) => {
                const timeDiff = Math.abs(new Date(server.date).getTime() - new Date(local.date).getTime());
                // Same amount AND roughly same time (within 2 mins)
                return server.amount === local.amount && timeDiff < 120000 && local.type === 'PAYMENT';
            });

            if (!isRedundant) {
                merged.push(local);
            }
        });

        const combined = merged.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
        setStatusHistory(combined);

    }, [localInvoice, isNoteModalOpen, isBrandModalOpen, lastLogUpdate]);

    const handleCloseWrapper = () => {
        // Validation Logic: ONLY for "Facturas Creadas" (Normal View)
        // Skip validation if:
        // 1. Logistics View
        // 2. Missing View
        // 3. Delivery View (Ready to Deliver)
        // 4. History View (Delivered)
        // 5. Invoice Status is 'delivered' (Explicit check)
        // 6. Cash View (Visualizer only)
        const shouldSkipValidation =
            isLogisticsView ||
            isMissingView ||
            effectiveDeliveryView ||
            effectiveHistoryView ||
            isCashView || // <--- ADDED THIS
            localInvoice?.status === 'delivered' ||
            localInvoice?.status === 'CANCELADO';

        if (!shouldSkipValidation) {
            const isVerifiedById = localStorage.getItem(`lavaseco_verified_${localInvoice.id}`);
            const isVerifiedByFolio = localInvoice.ticketNumber ? localStorage.getItem(`lavaseco_verified_FOLIO_${localInvoice.ticketNumber}`) : null;

            if (!isVerifiedById && !isVerifiedByFolio) {
                toast.error("¡Atención! Debes revisar las marcas antes de salir.", {
                    description: "Es obligatorio verificar las marcas al menos una vez.",
                    duration: 4000,
                });
                setIsBrandModalOpen(true);
                return;
            }
        }
        onClose();
    };

    if (!isOpen || !localInvoice) return null;

    const remainingBalance = Math.max(0, localInvoice.totalValue - localInvoice.paidAmount);

    // Generic Helper for Saving Payment (Used by Abono, Cancel, Deliver)
    const processGlobalPayment = async (amount: number, method: string, isFullCancel: boolean = false) => {
        const previousInvoice = { ...localInvoice };

        const newPaidAmount = (localInvoice.paidAmount || 0) + amount;
        const total = localInvoice.totalValue || 0;

        // Determine status: If explicitly cancelling OR math says paid
        let newStatus = 'PENDIENTE';
        if (isFullCancel || (newPaidAmount >= total && total > 0)) {
            newStatus = 'CANCELADO';
        } else if (newPaidAmount > 0) {
            newStatus = 'ABONO';
        }

        const logNote = isFullCancel
            ? `Pago Total / Cancelado (${method})`
            : `Abono registrado (${method})`;

        const updatedPayments = [
            ...(previousInvoice.payments || []),
            {
                amount: amount,
                type: isFullCancel || newStatus === 'CANCELADO' ? 'CANCELACION' : 'ABONO',
                createdAt: new Date().toISOString(),
                note: logNote
            }
        ];

        // Optimistic Update
        setLocalInvoice((prev: any) => ({
            ...prev,
            paidAmount: newPaidAmount,
            paymentStatus: newStatus,
            payments: updatedPayments
        }));

        // Log to History
        const newLog = {
            type: 'PAYMENT',
            description: logNote,
            amount: amount,
            date: new Date().toISOString()
        };
        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${localInvoice.id}`) || '[]');
        localStorage.setItem(`lavaseco_logs_${localInvoice.id}`, JSON.stringify([...existingLogs, newLog]));

        setLastLogUpdate(Date.now());

        // Update Dexie
        import('@/lib/billing/offline-storage').then(({ updateInvoice }) => {
            const updates = {
                paidAmount: newPaidAmount,
                payment: {
                    amount: newPaidAmount,
                    status: newStatus
                },
                payments: updatedPayments,
                totalValue: total
            };
            updateInvoice(localInvoice.id, updates);
            if (onInvoiceUpdate) onInvoiceUpdate({ ...localInvoice, ...updates });
        });

        // Server Call
        try {
            await registerPayment(localInvoice.id, amount, method);
            router.refresh();
            toast.success("Pago registrado correctamente");
        } catch (error) {
            console.error("Network error.", error);
            toast.error("Error de conexión. Se guardó localmente.");
        }
    };

    const handleOpenPayment = () => {
        openRegister({
            amountToPay: remainingBalance, // Pass remaining balance as the 'Max' or default
            allowAmountEdit: true,
            clientName: localInvoice.client.name,
            reference: `Abono - Factura #${localInvoice.ticketNumber}`,
            onConfirm: async (result) => {
                if (result.amount > remainingBalance) {
                    toast.error("El abono no puede superar el saldo pendiente");
                    return; // Prevent logic but the modal is closed. UX trade-off.
                }
                await processGlobalPayment(result.amount, result.method, false);
            }
        });
    };

    const handleDeliverFromModal = async (shouldPayFirst: boolean) => {
        // Old Logic: if (window.confirm("...")) ...
        // New Logic: Use OpenRegister with 0 balance for the confirmation UI

        // If shouldPayFirst is true, it means we are in the "Cancelar y Entregar" path (handled by handleOpenDeliver usually, but if called directly):
        if (shouldPayFirst && remainingBalance > 0) {
            // This path is usually triggered by handleOpenDeliver -> openRegister, so we might not need this branch if buttons are wired correctly.
            // But for safety/refactor:
            handleOpenDeliver();
            return;
        }

        // Zero Balance Delivery
        openRegister({
            amountToPay: 0,
            allowAmountEdit: false,
            clientName: localInvoice.client.name,
            customTitle: 'Confirmar Entrega',
            reference: `Entrega - Factura #${localInvoice.ticketNumber}`,
            onConfirm: async (result) => {
                // Should be 0 payment
                await onDeliverLogic();
            }
        });
    };

    const handleSaveNote = async () => {
        setIsSubmittingNote(true);

        if (!noteText.trim()) {
            localStorage.removeItem(`lavaseco_note_${localInvoice.id}`);
            toast.success("Nota eliminada correctamente");
        } else {
            localStorage.setItem(`lavaseco_note_${localInvoice.id}`, noteText);

            const newLog = {
                type: 'NOTE_ADDED',
                description: 'Se agregó una nota / bitácora',
                date: new Date().toISOString()
            };
            const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${localInvoice.id}`) || '[]');
            localStorage.setItem(`lavaseco_logs_${localInvoice.id}`, JSON.stringify([...existingLogs, newLog]));

            setLastLogUpdate(Date.now());
            toast.success("Nota guardada correctamente");
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        setIsNoteModalOpen(false);
        setIsSubmittingNote(false);
    };

    const handleOpenBrands = () => {
        localStorage.setItem(`lavaseco_verified_${localInvoice.id}`, 'true');
        setIsBrandModalOpen(true);
    };

    const handleMarkChange = (index: number, value: string) => {
        setItemMarks(prev => ({ ...prev, [index]: value }));
    };

    const handleSaveBrands = async () => {
        setIsSubmittingBrands(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        localStorage.setItem(`lavaseco_marks_${localInvoice.id}`, JSON.stringify(itemMarks));
        localStorage.setItem(`lavaseco_verified_${localInvoice.id}`, 'true');
        if (localInvoice.ticketNumber) {
            localStorage.setItem(`lavaseco_verified_FOLIO_${localInvoice.ticketNumber}`, 'true');
        }

        toast.success("Marcas actualizadas correctamente");
        setIsBrandModalOpen(false);
        setIsSubmittingBrands(false);
    };

    const handleOpenCancel = () => {
        if (remainingBalance <= 0) return;

        openRegister({
            amountToPay: remainingBalance,
            allowAmountEdit: false,
            clientName: localInvoice.client.name,
            reference: `Cancelar - Factura #${localInvoice.ticketNumber}`,
            onConfirm: async (result) => {
                await processGlobalPayment(result.amount, result.method, true);
            }
        });
    };

    const handleOpenPrintModal = () => {
        setPrintNote(localInvoice.generalNote || '');
        setIsPrintModalOpen(true);
    };

    const handleOpenDeliver = () => {
        const remaining = Math.max(0, localInvoice.totalValue - localInvoice.paidAmount);

        if (remaining > 0) {
            openRegister({
                amountToPay: remaining,
                allowAmountEdit: false,
                clientName: localInvoice.client.name,
                customTitle: 'Confirmar Entrega', // Updated Title
                reference: `Entrega - Factura #${localInvoice.ticketNumber}`,
                onConfirm: async (result) => {
                    // 1. Pay
                    await processGlobalPayment(result.amount, result.method, true);
                    // 2. Deliver
                    await onDeliverLogic();
                }
            });
        } else {
            // Zero Balance Delivery Logic (Same as handleDeliverFromModal(false))
            handleDeliverFromModal(false);
        }
    };



    const handleConfirmPrint = async () => {
        if (!localInvoice) return;

        // 1. Logic to Save Note (If exists)
        if (printNote && printNote.trim()) {
            const now = new Date();
            const timestamp = now.toLocaleString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            // A. Log History
            const newLog = {
                type: 'NOTE_ADDED',
                description: 'Se agregó una nota en la factura al imprimir',
                date: now.toISOString()
            };
            const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${localInvoice.id}`) || '[]');
            localStorage.setItem(`lavaseco_logs_${localInvoice.id}`, JSON.stringify([...existingLogs, newLog]));

            // B. Update Persistent Note (Bitacora)
            const currentNote = localStorage.getItem(`lavaseco_note_${localInvoice.id}`) || '';
            const noteToAdd = `Nota de Impresión: ${printNote} (${timestamp})`;
            // Append with double newline for clarity if note exists
            const updatedNote = currentNote ? `${currentNote}\n\n${noteToAdd}` : noteToAdd;

            localStorage.setItem(`lavaseco_note_${localInvoice.id}`, updatedNote);
            setNoteText(updatedNote); // Update local state for immediate UI reflection
            setLastLogUpdate(Date.now()); // Trigger log refresh
        }

        // 2. Logic to Print
        try {
            await generateInvoicePDF({
                ticketNumber: localInvoice.ticketNumber,
                client: {
                    name: localInvoice.client.name,
                    cedula: localInvoice.client.cedula || localInvoice.client.id || '',
                    phone: localInvoice.client.phone || ''
                },
                items: localInvoice.items.map((i: any) => ({
                    quantity: i.quantity,
                    description: i.type || i.description || 'Prenda',
                    notes: i.defects || i.notes || '',
                    price: i.price
                })),
                totalValue: localInvoice.totalValue,
                paidAmount: Number(localInvoice.paidAmount || 0),
                date: new Date(localInvoice.createdAt || localInvoice.dates?.created || new Date()),
                paymentStatus: localInvoice.paymentStatus,
                generalNote: printNote // Print strictly what is in the box (per user request context)
            }, 'ticket', true); // <--- TRUE triggers auto download/print in pdfGenerator

            toast.success("Imprimiendo recibo...");
            setIsPrintModalOpen(false);

            // Optional: Backup browser print trigger if the PDF lib logic relies on page replacement
            // setTimeout(() => window.print(), 500); 

        } catch (error) {
            console.error("Error al imprimir:", error);
            toast.error("Error al generar el recibo");
        }
    };

    const handleCancelInvoice = async () => {
        setIsCancelling(true);
        const now = new Date().toISOString();

        // 1. Local Update
        setLocalInvoice((prev: any) => ({
            ...prev,
            status: 'CANCELADO',
            paymentStatus: 'CANCELADO',
            location: 'CANCELADO'
        }));

        // 2. Log Locally
        const cancelLog = {
            type: 'STATUS_CHANGE',
            description: 'Factura Anulada Manualmente',
            date: now
        };
        const existingLogs = JSON.parse(localStorage.getItem(`lavaseco_logs_${localInvoice.id}`) || '[]');
        localStorage.setItem(`lavaseco_logs_${localInvoice.id}`, JSON.stringify([...existingLogs, cancelLog]));

        // 3. Update Dexie
        import('@/lib/billing/offline-storage').then(({ updateInvoice }) => {
            updateInvoice(localInvoice.id, {
                status: 'CANCELADO',
                paymentStatus: 'CANCELADO',
                location: 'CANCELADO',
                updatedAt: now
            });
        });

        // 4. Server Action
        try {
            await cancelOrder(localInvoice.id);
            toast.success("Factura anulada correctamente");
            if (onInvoiceUpdate) onInvoiceUpdate({
                ...localInvoice,
                status: 'CANCELADO',
                paymentStatus: 'CANCELADO'
            });
            setIsCancelModalOpen(false);
            // Optionally close the main modal too? No, let them see it's cancelled.
        } catch (error) {
            console.error("Error cancelling:", error);
            toast.error("Error al anular en servidor (se guardó localmente)");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div key="main-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseWrapper}>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] relative md:ml-48"
                        >
                            {/* Header */}
                            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className="w-10 h-10 bg-orchid-100 rounded-xl flex items-center justify-center text-orchid-600 cursor-pointer hover:bg-red-100 hover:text-red-500 transition-colors"
                                            onClick={() => !((localInvoice.status === 'CANCELADO' || localInvoice.paymentStatus === 'CANCELADO')) && setIsCancelModalOpen(true)}
                                            title="Clic para anular factura"
                                        >
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900">Factura #{localInvoice.ticketNumber}</h2>
                                            <span className="text-slate-400 text-sm font-medium">Orden de Servicio</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* CLICKABLE ICON AREA logic moved here for cleanliness */}
                            {/* Re-rendering header content to attach onClick to the icon container if not cancelled */}
                            {/* Actually, I will just replace the header content above with the interactive one */}

                            {/* Content Scrollable */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 relative">

                                {/* Cancellation Overlay - Disables interaction when cancelled */}
                                {(localInvoice.status === 'CANCELADO' || localInvoice.paymentStatus === 'CANCELADO') && (
                                    <div className="absolute inset-0 z-10 bg-slate-50/50 flex flex-col items-center justify-center backdrop-blur-[1px] rounded-3xl pointer-events-auto">
                                        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl shadow-lg max-w-sm text-center transform -translate-y-12">
                                            <h3 className="text-xl font-black text-red-600 mb-2">FACTURA ANULADA</h3>
                                            <p className="text-sm text-red-400 font-medium">Esta orden ha sido cancelada y no se pueden realizar más acciones sobre ella.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Status Banner */}
                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            // Determine Status Label and Color
                                            let statusLabel = 'POR ORGANIZAR'; // Default
                                            let statusColor = 'bg-slate-400';

                                            const isCancelled = localInvoice.status === 'CANCELADO' || localInvoice.paymentStatus === 'CANCELADO';

                                            // Robust check for Delivered
                                            const isDeliveredStatus =
                                                localInvoice.status?.toLowerCase() === 'delivered' ||
                                                localInvoice.status?.toLowerCase() === 'entregado' ||
                                                localInvoice.logisticsStatus === 'delivered' ||
                                                effectiveHistoryView; // Reuse the effective view logic which is already trusted

                                            // Robust check for Ready to Deliver
                                            const isReady =
                                                localInvoice.logisticsStatus === 'complete' || // FIX: Match list logic (complete vs delivered)
                                                localInvoice.orderStatus === 'EN_PROCESO' || // FIX: Include orderStatus from list logic
                                                isReadyForDelivery ||
                                                localInvoice.location?.includes('Entregar') ||
                                                effectiveDeliveryView; // Reuse effective view logic

                                            // FIX: Priority Reordered - Delivered > Cancelled > Ready > Paid > Pending
                                            if (isDeliveredStatus) {
                                                statusLabel = 'ENTREGADO';
                                                statusColor = 'bg-green-500';
                                            } else if (isCancelled) {
                                                statusLabel = 'ANULADO';
                                                statusColor = 'bg-red-500';
                                            } else if (isReady) {
                                                statusLabel = 'POR ENTREGAR';
                                                statusColor = 'bg-blue-500';
                                            } else if (localInvoice.paymentStatus === 'PAGADO') {
                                                statusLabel = 'PAGADO';
                                                statusColor = 'bg-green-500'; // Green but labeled PAGADO if not formally delivered yet
                                            } else {
                                                statusLabel = 'POR ORGANIZAR';
                                                statusColor = 'bg-amber-400';
                                            }

                                            return (
                                                <>
                                                    <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                                                    <span className="font-bold text-slate-700 uppercase text-sm">Estado: {statusLabel}</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        {effectiveHistoryView || localInvoice?.status === 'delivered' || localInvoice?.logisticsStatus === 'delivered' ? (
                                            <>
                                                <div className="flex gap-6 text-right items-end">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-400 font-bold block opacity-70 mb-0.5">INGRESO</span>
                                                        <span className="text-slate-600 font-bold text-sm">
                                                            {localInvoice.createdAt || localInvoice.dates?.created
                                                                ? new Date(localInvoice.createdAt || localInvoice.dates?.created).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                                                                : '--'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-end pb-0.5">
                                                        <span className="text-[10px] text-slate-400 font-bold block opacity-70 mb-0.5">PROGRAMADO</span>
                                                        <span className="text-slate-500 font-bold text-sm line-through decoration-slate-300">
                                                            {localInvoice.scheduledDate || localInvoice.dates?.delivery
                                                                ? new Date(localInvoice.scheduledDate || localInvoice.dates?.delivery).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                                                                : '--'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-emerald-500 font-bold block mb-0.5">ENTREGADO EL</span>
                                                        <span className="text-slate-900 font-black text-xl">
                                                            {localInvoice.deliveryDate
                                                                ? new Date(localInvoice.deliveryDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
                                                                : new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex gap-6 text-right items-end">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-400 font-bold block opacity-70 mb-0.5">INGRESO</span>
                                                        <span className="text-slate-600 font-bold text-sm">
                                                            {localInvoice.createdAt || localInvoice.dates?.created
                                                                ? new Date(localInvoice.createdAt || localInvoice.dates?.created).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                                                                : '--'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-slate-400 font-bold block mb-0.5">FECHA DE ENTREGA</span>
                                                        <span className="text-slate-700 font-bold text-lg">
                                                            {localInvoice.scheduledDate || localInvoice.dates?.delivery
                                                                ? new Date(localInvoice.scheduledDate || localInvoice.dates?.delivery).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
                                                                : 'Por definir'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Client Info */}
                                <div className="grid grid-cols-3 gap-8">
                                    <div className="col-span-2 pl-8">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <User size={14} /> Cliente
                                        </h3>
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-900 text-lg">{localInvoice.client.name}</p>
                                            {localInvoice.client.phone && (
                                                <div className="flex items-center gap-2 text-orchid-600 font-bold text-sm mt-1">
                                                    <Phone size={14} />
                                                    {localInvoice.client.phone}
                                                </div>
                                            )}
                                            {(localInvoice.client.id || '').length < 20 && localInvoice.client.id && (
                                                <p className="text-slate-500 font-medium text-sm mt-1">C.C. {localInvoice.client.id}</p>
                                            )}
                                            {localInvoice.client.cedula && localInvoice.client.cedula !== localInvoice.client.id && (
                                                <p className="text-slate-500 font-medium text-sm mt-1">C.C. {localInvoice.client.cedula}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center pr-8">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <MapPin size={14} /> Ubicación
                                        </h3>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 inline-block">
                                            <span className="font-bold text-slate-700">{localInvoice.location || 'RECEPCION'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 ml-2">Detalle de Prendas</h3>
                                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                                                <tr>
                                                    <th className="px-5 py-3">Cant.</th>
                                                    <th className="px-5 py-3">Prenda / Servicio</th>
                                                    <th className="px-5 py-3">Novedades</th>
                                                    {!effectiveHistoryView && <th className="px-5 py-3 text-center">Marca</th>}
                                                    <th className="px-5 py-3 text-right">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {localInvoice.items.map((item: any, index: number) => (
                                                    <tr key={item.id || index} className="text-sm">
                                                        <td className="px-5 py-3 font-bold text-slate-700">{item.quantity}</td>
                                                        <td className="px-5 py-3 font-medium text-slate-900">
                                                            {item.type}
                                                        </td>
                                                        <td className="px-5 py-3 text-slate-500 italic text-xs">
                                                            {item.defects || item.notes || '--'}
                                                        </td>
                                                        {!effectiveHistoryView && (
                                                            <td className="px-5 py-3 text-center">
                                                                {itemMarks[index] ? (
                                                                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                                                                        {itemMarks[index]}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-300 italic">--</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="px-5 py-3 text-right font-bold text-slate-900">
                                                            ${new Intl.NumberFormat('es-CO').format(item.price)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t border-slate-100">
                                                <tr>
                                                    <td colSpan={effectiveHistoryView ? 3 : 4} className="px-5 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">VALOR TOTAL DEL SERVICIO</td>
                                                    <td className="px-5 py-4 text-right font-bold text-slate-700 text-lg">
                                                        ${new Intl.NumberFormat('es-CO').format(localInvoice.totalValue)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Saved Note / Bitacora */}
                                {noteText && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2">
                                        <FileText className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Nota / Bitácora</h4>
                                            <p className="text-sm font-medium text-amber-900 whitespace-pre-wrap leading-relaxed">
                                                {noteText}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Financials & History */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Recaudado</span>
                                            <span className="text-xl font-bold text-slate-700">${new Intl.NumberFormat('es-CO').format(Number(localInvoice.paidAmount) || 0)}</span>
                                        </div>
                                        <div className={`rounded-2xl p-4 border ${(Number(localInvoice.totalValue || 0) - Number(localInvoice.paidAmount || 0)) <= 0
                                            ? 'bg-green-50 border-green-100'
                                            : 'bg-red-50 border-red-100'
                                            }`}>
                                            <span className={`text-xs font-bold uppercase block mb-1 ${(Number(localInvoice.totalValue || 0) - Number(localInvoice.paidAmount || 0)) <= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {(Number(localInvoice.totalValue || 0) - Number(localInvoice.paidAmount || 0)) <= 0 ? '¡Pagado!' : 'TOTAL A PAGAR (Pendiente)'}
                                            </span>
                                            <span className={`text-xl font-black ${(Number(localInvoice.totalValue || 0) - Number(localInvoice.paidAmount || 0)) <= 0 ? 'text-green-700' : 'text-red-700'
                                                }`}>
                                                ${new Intl.NumberFormat('es-CO').format(Math.max(0, Number(localInvoice.totalValue || 0) - Number(localInvoice.paidAmount || 0)))}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Clock size={14} />
                                            Historial de Estatus
                                        </h4>
                                        {statusHistory && statusHistory.length > 0 ? (
                                            <div className="space-y-3">
                                                {statusHistory.map((event: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200/50 last:border-0 pb-2 last:pb-0">
                                                        <div>
                                                            <span className="font-bold text-slate-700 block text-xs md:text-sm">
                                                                {event.type === 'PAYMENT' ? event.description.split('(')[0].trim() : event.description}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                                                                {new Date(event.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        {event.type === 'PAYMENT' && (
                                                            <div className="flex items-center gap-2 ml-2">
                                                                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs whitespace-nowrap">
                                                                    +${new Intl.NumberFormat('es-CO').format(event.amount)}
                                                                </span>
                                                                {event.description.match(/\((.*?)\)/)?.[1] && event.description.match(/\((.*?)\)/)?.[1] !== 'Efectivo' && (
                                                                    <span className="font-bold text-orchid-600 bg-orchid-50 px-2 py-1 rounded-md text-[10px] whitespace-nowrap border border-orchid-100 uppercase">
                                                                        PAGADO CON {event.description.match(/\((.*?)\)/)?.[1]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {event.type === 'NOTE_ADDED' && (
                                                            <span className="text-amber-500 bg-amber-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase ml-2">NOTA</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic text-center py-2">no hay notas</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="bg-white px-8 py-6 border-t border-slate-100 flex justify-between gap-3 items-center flex-wrap">
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => setIsNoteModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200"
                                    >
                                        <FileText size={18} />
                                        Agregar Nota
                                    </button>

                                    {!isLogisticsView && !isMissingView && !effectiveDeliveryView && !effectiveHistoryView && !isCashView &&
                                        !isReadyForDelivery && !isDelivered &&
                                        localInvoice?.status?.toLowerCase() !== 'delivered' &&
                                        localInvoice?.status?.toLowerCase() !== 'entregado' &&
                                        localInvoice?.status !== 'PAGADO' &&
                                        localInvoice?.status !== 'CANCELADO' &&
                                        localInvoice?.paymentStatus !== 'PAGADO' &&
                                        localInvoice?.logisticsStatus !== 'delivered' &&
                                        !localStorage.getItem(`lavaseco_verified_${localInvoice.id}`) &&
                                        !localStorage.getItem(`lavaseco_verified_FOLIO_${localInvoice.ticketNumber}`) && (
                                            <>
                                                <button
                                                    onClick={handleOpenBrands}
                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-violet-600 hover:bg-violet-50 transition-colors border border-violet-200"
                                                >
                                                    <Tag size={18} />
                                                    Agregar Marca
                                                </button>
                                            </>
                                        )}
                                    {!isLogisticsView && !isMissingView && localInvoice.status !== 'CANCELADO' && (
                                        effectiveDeliveryView ? (
                                            // --- DELIVERY VIEW LOGIC ---
                                            remainingBalance <= 0 ? (
                                                // Scenario A: Already Paid -> Show "Entregar"
                                                <button
                                                    onClick={() => handleDeliverFromModal(false)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
                                                >
                                                    <ShoppingBag size={18} />
                                                    Entregar Pedido
                                                </button>
                                            ) : (
                                                // Scenario B: Pending Balance -> Show "Registrar Abono" AND "Cancelar y Entregar"
                                                <>
                                                    <button
                                                        onClick={handleOpenPayment}
                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-green-600 bg-green-50 hover:bg-green-100 transition-colors border border-green-200"
                                                    >
                                                        <DollarSign size={18} />
                                                        Registrar Abono
                                                    </button>
                                                    <button
                                                        onClick={handleOpenDeliver}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200"
                                                    >
                                                        <CreditCard size={18} />
                                                        Cancelar y Entregar
                                                    </button>
                                                </>
                                            )
                                        ) : (
                                            // --- STANDARD BILLING LOGIC ---
                                            localInvoice.status !== 'CANCELADO' && remainingBalance > 0 && (
                                                <>
                                                    <button
                                                        onClick={handleOpenPayment}
                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-green-600 bg-green-50 hover:bg-green-100 transition-colors border border-green-200"
                                                    >
                                                        <DollarSign size={18} />
                                                        Registrar Abono
                                                    </button>
                                                    <button
                                                        onClick={handleOpenCancel}
                                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                        Cancelado
                                                    </button>
                                                </>
                                            )
                                        )
                                    )}

                                    {/* --- LOGISTICS ACTION BUTTONS --- */}
                                    {(isLogisticsView || isMissingView) && (
                                        <>
                                            {/* Black Button: 'Todavía no está' (Missing) - Styled like Cancel */}
                                            {onMarkMissing && (
                                                <button
                                                    onClick={() => {
                                                        onMarkMissing(localInvoice.id, localInvoice.ticketNumber);
                                                        onClose();
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                                                >
                                                    <X size={18} />
                                                    Todavía no está
                                                </button>
                                            )}

                                            {/* Green Button: 'Ya está' (Organized/Found) - Styled like Payment */}
                                            {onOrganize && (
                                                <button
                                                    onClick={() => {
                                                        onOrganize(localInvoice.id, localInvoice.ticketNumber);
                                                        onClose();
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
                                                >
                                                    <CheckCircle2 size={18} />
                                                    {isLogisticsView ? 'Ya está' : 'Ya llegó'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {!isMissingView && (
                                    <button
                                        onClick={handleOpenPrintModal}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
                                    >
                                        <Printer size={18} />
                                        Imprimir Recibo
                                    </button>
                                )}
                            </div>

                        </motion.div>

                        {/* Note Modal */}
                        {
                            isNoteModalOpen && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 md:ml-64">
                                        <div className="p-6">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-black text-slate-800">Agregar Nota / Bitácora</h3>
                                                <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Escribe tu nota aquí</label>
                                                    <textarea
                                                        value={noteText}
                                                        onChange={(e) => setNoteText(e.target.value)}
                                                        className="w-full h-64 bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-700 outline-none focus:border-orchid-500 focus:ring-2 focus:ring-orchid-100 transition-all resize-none"
                                                        placeholder="Ej: El cliente llamó para confirmar..."
                                                        autoFocus
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleSaveNote}
                                                    disabled={isSubmittingNote}
                                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSubmittingNote ? 'Guardando...' : 'Guardar Nota'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Brands Modal */}
                        {
                            !effectiveHistoryView && localInvoice?.status !== 'CANCELADO' && isBrandModalOpen && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 md:ml-64">
                                        <div className="p-6">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                    <Tag size={20} className="text-purple-500" />
                                                    Colocar Marcas
                                                </h3>
                                                <button onClick={() => setIsBrandModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                            <th className="px-6 py-4 w-16 text-center">Cant.</th>
                                                            <th className="px-6 py-4">Prenda / Servicio</th>
                                                            <th className="px-6 py-4 text-center">Marca</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {localInvoice.items.map((item: any, index: number) => (
                                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className="font-bold text-slate-700 block">{item.type}</span>
                                                                    {item.notes && <span className="text-xs text-slate-400 italic">{item.notes}</span>}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="SIN MARCA"
                                                                        value={itemMarks[index] || ''}
                                                                        onChange={(e) => handleMarkChange(index, e.target.value)}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                                                <button
                                                    onClick={handleSaveBrands}
                                                    disabled={isSubmittingBrands}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isSubmittingBrands ? 'Guardando...' : 'Guardar Marcas'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Print Dialog Modal (Intermediate) */}
                        {
                            isPrintModalOpen && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 md:ml-64">
                                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <Printer size={20} className="text-orchid-600" />
                                                Imprimir Recibo
                                            </h3>
                                            <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                                                    ¿Quieres agregar una nota al recibo?
                                                </label>
                                                <textarea
                                                    value={printNote}
                                                    onChange={(e) => setPrintNote(e.target.value)}
                                                    className="w-full h-52 bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-700 outline-none focus:border-orchid-500 focus:ring-2 focus:ring-orchid-100 transition-all resize-none text-base"
                                                    placeholder="Escribe aquí (Opcional)..."
                                                    autoFocus
                                                />
                                            </div>

                                            <button
                                                onClick={handleConfirmPrint}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                            >
                                                <Printer size={18} />
                                                Imprimir Ahora
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                    </div >
                    {/* Cancel Confirmation Modal */}

                    <AnimatePresence key="cancel-presence">
                        {isCancelModalOpen && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCancelModalOpen(false)}>
                                <motion.div
                                    key="cancel-modal" // Unique key for AnimatePresence
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-red-100"
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                                            <X size={32} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2">¿Anular Factura?</h3>
                                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                            Esta acción dejará la factura en estado <strong className="text-red-500">CANCELADO</strong> y no podrá revertirse. ¿Estás seguro?
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 w-full">
                                            <button
                                                onClick={() => setIsCancelModalOpen(false)}
                                                className="py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                            >
                                                No, Volver
                                            </button>
                                            <button
                                                onClick={handleCancelInvoice}
                                                disabled={isCancelling}
                                                className="py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                            >
                                                {isCancelling ? 'Anulando...' : 'Sí, Anular'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
