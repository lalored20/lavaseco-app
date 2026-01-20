"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Play, Wallet, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export default function ShiftProtection({ children }: { children: React.ReactNode }) {
    const { user, loading, updateShift } = useAuth();
    const [isOpening, setIsOpening] = useState(false);
    const [baseAmount, setBaseAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-orchid-50">
                <div className="w-10 h-10 border-4 border-orchid-200 border-t-orchid-600 rounded-full animate-spin" />
            </div>
        );
    }

    // Redirect if no user (should rely on middleware, but this is client-side guard)
    if (!user) {
        // Optionally redirect here if you want to force login
        // window.location.href = '/login'; 
        // But for now let's just show a debug message
    }

    // Admins pass through
    if (user?.role === 'ADMIN') {
        return <>{children}</>;
    }

    // Staff with active shift pass through
    if (user?.role === 'STAFF' && user.activeShiftId) {
        return <>{children}</>;
    }

    // Staff without shift -> Show Force Open Shift Modal
    const handleOpenShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/shifts/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    baseAmount: parseFloat(baseAmount) || 0
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al abrir turno");

            toast.success("Turno Iniciado Correctamente");
            updateShift(data.shiftId);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-900 text-white flex items-center justify-center p-4">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-orchid-950" />
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orchid-500/20 rounded-full blur-[100px] animate-pulse" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl shadow-black/50"
            >
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-orchid-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-orchid-500/30">
                        <Lock size={32} className="text-white" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
                    <p className="text-slate-300">Hola {user?.name || 'Colaborador'}, para acceder al sistema debes iniciar tu turno de trabajo.</p>
                </div>

                <form onSubmit={handleOpenShift} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Base de Caja Inicial</label>
                        <div className="relative group">
                            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-400 transition-colors" size={20} />
                            <input
                                type="number"
                                value={baseAmount}
                                onChange={(e) => setBaseAmount(e.target.value)}
                                min="0"
                                step="100"
                                required
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-white outline-none focus:ring-2 focus:ring-orchid-500/50 focus:border-orchid-500 transition-all placeholder:text-slate-600"
                                placeholder="$ 0"
                            />
                        </div>
                        <p className="text-xs text-slate-500 ml-2">Ingresa el dinero en efectivo que recibes al iniciar.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-orchid-600 to-purple-600 hover:from-orchid-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orchid-500/20 transform hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Play size={20} fill="currentColor" />
                                Iniciar Turno
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => window.location.href = '/login'}
                        className="w-full py-2 text-slate-400 hover:text-white transition-colors text-sm"
                    >
                        Cambiar Usuario
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
