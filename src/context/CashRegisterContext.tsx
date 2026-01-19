"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CashRegisterModal } from '@/components/billing/CashRegisterModal';

export type PaymentMethod = 'Efectivo' | 'Nequi' | 'Daviplata' | 'Bancolombia' | 'Datafono';

export interface TransactionResult {
    amount: number;      // Amount actually paid (should match amountToPay usually, or less for partial) - wait, Register confirms the Transaction Amount.
    tendered: number;    // Cash hand over
    change: number;      // Devuelta
    method: PaymentMethod;
    note: string;        // Constructed note
}

export interface TransactionData {
    amountToPay: number;       // The amount the system EXPECTS to collect
    allowAmountEdit?: boolean; // If true, the user can change the amount to pay (e.g. Abono)
    totalInvoiced?: number;    // For display "Total Factura: $50.000"
    clientName?: string;
    reference?: string;        // "Factura #1040"
    mode?: 'full' | 'payment-config' | 'change-calculator';
    onConfirm: (result: TransactionResult) => Promise<void> | void;
}

interface CashRegisterContextType {
    openRegister: (data: TransactionData) => void;
    closeRegister: () => void;
    isRegisterOpen: boolean;
}

const CashRegisterContext = createContext<CashRegisterContextType | undefined>(undefined);

export function CashRegisterProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [transactionData, setTransactionData] = useState<TransactionData | null>(null);

    const openRegister = (data: TransactionData) => {
        setTransactionData(data);
        setIsOpen(true);
    };

    const closeRegister = () => {
        setIsOpen(false);
        // Wait a bit to clear data for animation? Managed by Modal usually
        setTimeout(() => setTransactionData(null), 300);
    };

    return (
        <CashRegisterContext.Provider value={{ openRegister, closeRegister, isRegisterOpen: isOpen }}>
            {children}
            {transactionData && (
                <CashRegisterModal
                    isOpen={isOpen}
                    onClose={closeRegister}
                    data={transactionData}
                />
            )}
        </CashRegisterContext.Provider>
    );
}

export function useCashRegister() {
    const context = useContext(CashRegisterContext);
    if (!context) {
        throw new Error("useCashRegister must be used within a CashRegisterProvider");
    }
    return context;
}
