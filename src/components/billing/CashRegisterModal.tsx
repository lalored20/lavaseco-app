"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Banknote, CreditCard, Smartphone, Calculator, AlertCircle, ArrowRight } from 'lucide-react';
import { TransactionData, PaymentMethod, TransactionResult } from '@/context/CashRegisterContext';
import { toast } from 'sonner';

interface CashRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: TransactionData;
}

export function CashRegisterModal({ isOpen, onClose, data }: CashRegisterModalProps) {
    const mode = data.mode || 'full'; // 'full' | 'payment-config' | 'change-calculator'

    // Steps: 1 (Config) -> 2 (Calculator/Confirm)
    // If mode is 'payment-config', we only do Step 1.
    // If mode is 'change-calculator', we start immediately at Step 2.
    const [step, setStep] = useState<1 | 2>(mode === 'change-calculator' ? 2 : 1);

    const [currentAmount, setCurrentAmount] = useState<number>(data.amountToPay);
    const [tenderedAmount, setTenderedAmount] = useState<string>('');
    const [method, setMethod] = useState<PaymentMethod>('Efectivo');
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial Setup
    useEffect(() => {
        if (isOpen) {
            setCurrentAmount(data.amountToPay);
            setTenderedAmount('');
            setMethod('Efectivo');
            setStep(mode === 'change-calculator' ? 2 : 1);
        }
    }, [isOpen, data.amountToPay, mode]);

    // Derived Logic
    const parsedTendered = parseInt(tenderedAmount.replace(/\./g, '')) || 0;
    const change = parsedTendered - currentAmount;
    const isSufficient = parsedTendered >= currentAmount;

    // Quick Cash Helpers
    const suggestions = [
        currentAmount,
        Math.ceil(currentAmount / 5000) * 5000,
        Math.ceil(currentAmount / 10000) * 10000,
        20000, 50000, 100000
    ].filter(amount => amount >= currentAmount).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).slice(0, 3);

    // Handlers
    const handleNextStep = () => {
        if (currentAmount <= 0) {
            toast.error("El monto debe ser mayor a 0");
            return;
        }

        // If mode is just config, we confirm immediately with the config data
        if (mode === 'payment-config') {
            handleFinalConfirm();
            return;
        }

        // If digital method, pre-fill tendered and maybe skip or auto-advance?
        // User flow: Next -> Step 2.
        if (method !== 'Efectivo') {
            setTenderedAmount(currentAmount.toString());
        } else {
            setTenderedAmount(''); // Reset for clean cash entry
        }
        setStep(2);
    };

    const handleFinalConfirm = async () => {
        if (step === 2 && method === 'Efectivo' && !isSufficient) {
            toast.error("El monto recibido es insuficiente");
            return;
        }

        setIsProcessing(true);
        try {
            const result: TransactionResult = {
                amount: currentAmount,
                tendered: step === 2 && method === 'Efectivo' ? parsedTendered : currentAmount,
                change: step === 2 && method === 'Efectivo' ? Math.max(0, change) : 0,
                method: method,
                note: `Pago Registrado: ${method.toUpperCase()} - ${step === 2 ? `Recibido: $${parsedTendered}` : 'Configuración de pago'}`
            };

            await data.onConfirm(result);
            onClose();
        } catch (error) {
            console.error("Transaction failed", error);
            toast.error("Error al procesar pago");
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    const handleClose = () => {
        if (data.disableClose) return; // Block close if disabled
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-100 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <Calculator className="text-orchid-600" size={24} />
                                    {step === 1 ? 'Configurar Pago' : 'Confirmar Transacción'}
                                </h2>
                                {data.reference && <p className="text-slate-500 text-sm font-medium">{data.reference}</p>}
                            </div>
                            {!data.disableClose && (
                                <button onClick={handleClose} className="bg-white p-2 rounded-full shadow-sm text-slate-400 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Content Body */}
                        <div className="p-8 overflow-y-auto">

                            {/* STEP 1: Amount & Method */}
                            {step === 1 && (
                                <div className="flex flex-col gap-8 animate-in slide-in-from-left-4 fade-in duration-300">

                                    {/* Section 1: Amount (Top) */}
                                    <div className="text-center space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                            {data.allowAmountEdit ? 'Monto a Abonar' : 'Total a Cobrar'}
                                        </label>

                                        {data.allowAmountEdit ? (
                                            <div className="relative inline-block">
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300">$</span>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={currentAmount ? new Intl.NumberFormat('es-CO').format(currentAmount) : ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                                        if (val <= data.amountToPay) {
                                                            setCurrentAmount(val);
                                                        } else {
                                                            toast.error(`El abono no puede superar el saldo pendiente (${formatCurrency(data.amountToPay)})`);
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    className="w-full text-center bg-transparent border-b-2 border-slate-200 focus:border-orchid-500 text-5xl font-black text-orchid-600 outline-none transition-all placeholder:text-slate-200 px-8 py-2"
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-6xl font-black text-slate-900 tracking-tighter">
                                                {formatCurrency(currentAmount)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 2: Method (Bottom) */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">Método de Pago</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setMethod('Efectivo')}
                                                className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${method === 'Efectivo'
                                                    ? 'border-green-500 bg-green-50/50 text-green-700 shadow-lg shadow-green-100'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className={`p-3 rounded-full ${method === 'Efectivo' ? 'bg-green-100' : 'bg-slate-100'}`}>
                                                    <Banknote size={32} />
                                                </div>
                                                <span className="font-bold text-lg">Efectivo</span>
                                            </button>

                                            <button
                                                onClick={() => setMethod('Nequi')} // Default digital
                                                className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${method !== 'Efectivo'
                                                    ? 'border-orchid-500 bg-orchid-50/50 text-orchid-700 shadow-lg shadow-orchid-100'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <div className={`p-3 rounded-full ${method !== 'Efectivo' ? 'bg-orchid-100' : 'bg-slate-100'}`}>
                                                    <Smartphone size={32} />
                                                </div>
                                                <span className="font-bold text-lg">Digital</span>
                                            </button>
                                        </div>

                                        {/* Digital Sub-options */}
                                        <div className={`flex gap-2 justify-center mt-4 transition-all duration-300 ${method !== 'Efectivo' ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                                            {(['Nequi', 'Daviplata', 'Bancolombia', 'Datafono'] as PaymentMethod[]).map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setMethod(m)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${method === m ? 'bg-orchid-600 border-orchid-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Calculator / Confirmation */}
                            {step === 2 && (
                                <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">

                                    {/* Summary Pill */}
                                    <div className="flex justify-center">
                                        <div className="bg-slate-100 rounded-full px-5 py-2 flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <span>Pagando</span>
                                            <span className="text-slate-900">{formatCurrency(currentAmount)}</span>
                                            <span className="text-slate-400">•</span>
                                            <span className={`uppercase ${method === 'Efectivo' ? 'text-green-600' : 'text-orchid-600'}`}>{method}</span>
                                        </div>
                                    </div>

                                    {/* Content based on method */}
                                    {method === 'Efectivo' ? (
                                        <>
                                            <div className="text-center space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">¿Cuánto Recibes?</label>
                                                <div className="relative">
                                                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</div>
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={tenderedAmount ? new Intl.NumberFormat('es-CO').format(parseInt(tenderedAmount.replace(/\./g, ''))) : ''}
                                                        onChange={(e) => setTenderedAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && isSufficient) {
                                                                handleFinalConfirm();
                                                            }
                                                        }}
                                                        placeholder="0"
                                                        className="w-full bg-slate-50 border-2 border-slate-200 focus:border-slate-900 rounded-2xl pl-12 pr-4 py-6 text-4xl font-bold text-slate-900 outline-none text-center transition-colors"
                                                    />
                                                </div>
                                                {/* Suggestions */}
                                                <div className="flex gap-2 justify-center pt-2">
                                                    {suggestions.map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setTenderedAmount(s.toString())}
                                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm hover:border-orchid-300 hover:text-orchid-600 transition-all"
                                                        >
                                                            {formatCurrency(s)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Change Box */}
                                            <div className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${isSufficient ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                                <span className={`font-bold uppercase text-xs ${isSufficient ? 'text-green-600' : 'text-red-500'}`}>
                                                    {isSufficient ? 'Cambio / Devuelta' : 'Faltante'}
                                                </span>
                                                <span className={`font-black text-4xl ${isSufficient ? 'text-green-700' : 'text-red-600'}`}>
                                                    {isSufficient ? formatCurrency(change) : formatCurrency(Math.abs(change))}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                            <div className="w-20 h-20 bg-orchid-100 rounded-full flex items-center justify-center text-orchid-600 mb-2 animate-bounce">
                                                <Smartphone size={40} />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">Transacción Digital</h3>
                                            <p className="text-slate-500 max-w-xs">
                                                Confirma que has recibido el pago por <strong>{method}</strong>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                            {step === 2 && mode !== 'change-calculator' && !data.disableClose && (
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    Atrás
                                </button>
                            )}

                            {step === 1 && mode !== 'payment-config' && !data.disableClose && (
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}

                            {step === 1 ? (
                                <button
                                    onClick={handleNextStep}
                                    className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold py-4 rounded-xl shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    {mode === 'payment-config' ? 'Confirmar Configuración' : 'Siguiente'}
                                    <ArrowRight size={24} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleFinalConfirm}
                                    disabled={(!isSufficient && method === 'Efectivo') || isProcessing}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
                                    <Check size={24} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
