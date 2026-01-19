import React from 'react';
import { CreditCard, User, Search } from 'lucide-react';

interface ClientFormProps {
    clientCedula: string;
    setClientCedula: (value: string) => void;
    clientName: string;
    setClientName: (value: string) => void;
    clientPhone: string;
    setClientPhone: (value: string) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({
    clientCedula,
    setClientCedula,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone
}) => {
    return (
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Datos del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative group">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Cédula"
                        value={clientCedula}
                        onChange={(e) => setClientCedula(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all font-medium text-slate-800"
                    />
                </div>
                <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Nombre del Cliente"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value.replace(/[^a-zA-Z\sñÑáéíóúÁÉÍÓÚ]/g, ''))} // Allow letters, spaces, accents
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all font-medium text-slate-800"
                    />
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Teléfono (Opcional)"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all font-medium text-slate-800"
                    />
                </div>
            </div>
        </div>
    );
};
