"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shirt,
    Truck,
    ShoppingBag,
    Settings,
    LogOut,
    Menu,
    ChevronDown,
    Joystick,
    Calculator,
    LayoutDashboard,
    Receipt
} from 'lucide-react';
import clsx from 'clsx';
// import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // const router = useRouter();

    const [expandedSteps, setExpandedSteps] = React.useState<Record<string, boolean>>({
        '/dashboard/billing-a': true, // Default open for better UX
        '/dashboard/delivery': true
    });

    const toggleExpand = (href: string) => {
        setExpandedSteps(prev => ({ ...prev, [href]: !prev[href] }));
    };

    const navItems = [
        {
            name: 'Caja Registradora',
            href: '/dashboard/cash',
            icon: Calculator,
        },

        {
            name: 'Nueva Factura',
            href: '/dashboard/billing-a',
            icon: Shirt,
        },
        {
            name: 'Facturas Creadas',
            href: '/dashboard/billing-a/list',
            icon: Receipt,
        },
        {
            name: 'Logística',
            href: '/dashboard/logistics',
            icon: Truck,
            children: [
                { name: 'Organizar Entrada', href: '/dashboard/logistics/organize' },
                { name: 'Prendas Faltantes', href: '/dashboard/logistics/missing' },
            ]
        },
        {
            name: 'Entrega',
            href: '/dashboard/delivery',
            icon: ShoppingBag,
            children: [
                { name: 'Prendas por entregar', href: '/dashboard/delivery' },
                { name: 'Entregados', href: '/dashboard/delivery/history' },
            ]
        },
    ];

    const handleLogout = () => {
        // Clear cookies/tokens
        // router.push('/login');
        window.location.href = '/login';
    };

    return (
        <div className="flex h-screen bg-orchid-50 text-slate-900 overflow-hidden font-sans">
            <CashRegisterProvider>
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

                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const hasChildren = item.children && item.children.length > 0;
                            const isExpanded = expandedSteps[item.href];
                            const isActiveParent = pathname.startsWith(item.href);

                            // Content of the menu item (Icon + Text + Arrow)
                            const ItemContent = (
                                <div className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden cursor-pointer",
                                    isActiveParent && !hasChildren
                                        ? "bg-orchid-100/50 text-orchid-800"
                                        : "text-slate-500 hover:bg-orchid-50 hover:text-orchid-600"
                                )}>
                                    {isActiveParent && !hasChildren && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute left-0 top-0 bottom-0 w-1 bg-orchid-500 rounded-r-full"
                                        />
                                    )}
                                    <item.icon size={20} className={clsx(isActiveParent ? "text-orchid-600" : "text-slate-400 group-hover:text-orchid-500")} />
                                    <span className="font-medium flex-1">{item.name}</span>
                                    {hasChildren && (
                                        <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={16} />
                                        </div>
                                    )}
                                </div>
                            );

                            return (
                                <div key={item.href}>
                                    {/* Toggle for Parent OR Link for Regular Item */}
                                    {hasChildren ? (
                                        <div onClick={() => toggleExpand(item.href)}>
                                            {ItemContent}
                                        </div>
                                    ) : (
                                        <Link href={item.href}>
                                            {ItemContent}
                                        </Link>
                                    )}

                                    {/* Submenu */}
                                    <AnimatePresence>
                                        {hasChildren && isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pl-4 pr-2 py-1 space-y-1">
                                                    {item.children?.map((child) => {
                                                        const isChildActive = pathname === child.href;
                                                        return (
                                                            <Link key={child.href} href={child.href} className="block">
                                                                <div className={clsx(
                                                                    "py-2 px-3 rounded-lg text-sm font-medium transition-colors relative flex items-center gap-2",
                                                                    isChildActive
                                                                        ? "text-orchid-700 bg-orchid-100"
                                                                        : "text-slate-500 hover:text-orchid-600 hover:bg-orchid-50"
                                                                )}>
                                                                    {isChildActive && (
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-orchid-500" />
                                                                    )}
                                                                    <span className={isChildActive ? "font-bold" : ""}>{child.name}</span>
                                                                </div>
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
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

                {/* AI Global Assistant */}
                <AssistantOverlay />
            </CashRegisterProvider>
        </div >
    );
}

import { AssistantOverlay } from '@/components/dashboard/AssistantOverlay';
import { CashRegisterProvider } from '@/context/CashRegisterContext';
