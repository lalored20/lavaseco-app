import React from 'react';
import { getInvoices } from '@/lib/actions/billing';
import { InvoiceListClient } from '@/components/billing/InvoiceListClient';

export const dynamic = 'force-dynamic'; // Force real-time data

export default async function InvoiceListPage() {
    const { success, data: invoices, error } = await getInvoices();

    if (!success || !invoices) {
        return (
            <div className="p-8 text-center text-red-500 font-bold bg-red-50 rounded-xl border border-red-100 m-8">
                Error al cargar facturas: {error}
            </div>
        );
    }

    return (
        <InvoiceListClient invoices={invoices} />
    );
}
