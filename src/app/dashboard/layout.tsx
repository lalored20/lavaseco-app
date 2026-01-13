"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Shirt,
    Truck,
    ShoppingBag,
    Settings,
    LogOut,
    Menu,
    LayoutDashboard
} from 'lucide-react';
import clsx from 'clsx';
// import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // const router = useRouter();

    const navItems = [
        { name: 'Recepción (Módulo A)', href: '/dashboard/reception', icon: Shirt },
        { name: 'Logística (Módulo B)', href: '/dashboard/logistics', icon: Truck },
        { name: 'Entrega (Módulo C)', href: '/dashboard/delivery', icon: ShoppingBag },
    ];

    const handleLogout = () => {
        // Clear cookies/tokens
        // router.push('/login');
        window.location.href = '/login';
    };

    return (
        <div className="flex h-screen bg-orchid-50 text-slate-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-orchid-200 hidden md:flex flex-col z-20 shadow-xl shadow-orchid-500/5">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orchid-500 to-orchid-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orchid-500/30">
                        <LayoutDashboard size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight text-slate-900">Lavaseco</h1>
                        <p className="text-xs text-orchid-600 font-medium">Orquídeas App</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "bg-orchid-100 text-orchid-800 shadow-sm"
                                        : "text-slate-500 hover:bg-orchid-50 hover:text-orchid-600"
                                )}>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute left-0 top-0 bottom-0 w-1 bg-orchid-500 rounded-r-full"
                                        />
                                    )}
                                    <item.icon size={20} className={clsx(isActive ? "text-orchid-600" : "text-slate-400 group-hover:text-orchid-500")} />
                                    <span className="font-medium">{item.name}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-orchid-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                {/* Top Mobile Bar (Visible only on small screens) */}
                <div className="md:hidden h-16 bg-white/80 backdrop-blur-md border-b border-orchid-200 flex items-center justify-between px-4 z-20">
                    <span className="font-bold text-orchid-700">Lavaseco Orquídeas</span>
                    <Menu className="text-slate-600" />
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative scrollbar-thin scrollbar-thumb-orchid-200 hover:scrollbar-thumb-orchid-300">
                    {/* Background Blobs for Atmosphere */}
                    <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-orchid-300/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

                    <div className="relative z-10 max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
