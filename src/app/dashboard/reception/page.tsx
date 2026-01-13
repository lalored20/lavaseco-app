"use client";

import React, { useState } from 'react';
import { GeminiInput } from '@/components/dashboard/GeminiInput';
import { motion } from 'framer-motion';
import { ArrowUpRight, Search, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

// Fetcher function
const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Error al cargar órdenes');
    return res.json();
};

export default function ReceptionPage() {
    const [lastOrder, setLastOrder] = useState<any>(null);

    // TanStack Query for Real-Time Data and Caching
    const { data: orders, isLoading, isError } = useQuery({
        queryKey: ['orders'],
        queryFn: fetchOrders,
        refetchInterval: 5000,
    });

    const handleInput = (text: string, files: File[]) => {
        // This is where the magic happens.
        // For now, we simulate an intelligent response.

        console.log("Input received:", text, files);

        if (text.toLowerCase().includes('nuevo') || text.toLowerCase().includes('ingreso')) {
            toast.info("Procesando Nuevo Ingreso...");
            // Logic to extract entities (Client, Clothes) would go here (Brain Engine)
            setTimeout(() => {
                setLastOrder({ id: '#1049', client: 'Juan Perez', items: 3, status: 'PENDIENTE' });
                toast.success("Orden #1049 Creada (Simulado)");
            }, 1000);
        } else if (text.toLowerCase().includes('buscar')) {
            toast.info("Buscando...");
        } else {
            toast("Comando recibido", { description: text });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Módulo de Recepción</h1>
                    <p className="text-slate-500 mt-1">"God Mode": Habla, escribe o arrastra fotos para gestionar.</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-orchid-100 flex items-center gap-2 text-sm font-medium text-orchid-700">
                        <Clock size={16} />
                        <span>Turno Activo: 08:00 AM</span>
                    </div>
                </div>
            </div>

            {/* INTELLIGENT INPUT BAR (Central Nervous System) */}
            <section className="relative z-50">
                <GeminiInput
                    onSend={handleInput}
                    placeholder="Ej: 'Nuevo cliente Pedro, trae 2 camisas y 1 pantalón roto'..."
                    className="shadow-2xl shadow-orchid-500/20"
                />
            </section>

            {/* Recent Activity / Context Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions / Recent */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Search size={20} className="text-orchid-500" />
                        Actividad Reciente
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading && (
                            <div className="col-span-2 flex justify-center py-10 opacity-50">
                                <Loader2 className="animate-spin text-orchid-500" />
                            </div>
                        )}

                        {isError && (
                            <div className="col-span-2 text-red-500 bg-red-50 p-4 rounded-xl text-center">
                                Error cargando actividad reciente.
                            </div>
                        )}

                        {orders?.map((order: any) => (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-orchid-200 transition-colors group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${order.status === 'PENDIENTE' ? 'bg-orange-100 text-orange-700' :
                                            order.status === 'ENTREGADO' ? 'bg-green-100 text-green-700' :
                                                'bg-slate-100 text-slate-700'
                                        }`}>
                                        {order.status}
                                    </span>
                                    <span className="text-slate-400 text-xs">
                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg group-hover:text-orchid-600 transition-colors">
                                    Orden #{order.id.toString().slice(-4)}
                                </h3>
                                <p className="text-slate-500 text-sm">
                                    {order.client?.name || 'Cliente Mostrador'} • {order.items?.length || 0} Prendas
                                </p>
                            </motion.div>
                        ))}

                        {!isLoading && orders?.length === 0 && (
                            <p className="text-slate-400 text-center col-span-2 py-10">No hay órdenes recientes.</p>
                        )}
                    </div>
                </div>

                {/* Alerts / Brain Notifications */}
                <div className="bg-orchid-50/50 rounded-3xl p-6 border border-orchid-100/50">
                    <h2 className="text-lg font-bold text-orchid-900 mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        Alertas del Cerebro
                    </h2>
                    <div className="space-y-3">
                        <div className="bg-white/80 p-3 rounded-xl border border-orchid-100 text-sm text-slate-600 shadow-sm">
                            <span className="font-bold text-orchid-600">Recordatorio:</span> El cliente Juan Perez no ha recogido su orden #1030 (15 días).
                        </div>
                        <div className="bg-white/80 p-3 rounded-xl border border-orchid-100 text-sm text-slate-600 shadow-sm">
                            <span className="font-bold text-orchid-600">Stock:</span> Quedan pocos ganchos de camisa.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
