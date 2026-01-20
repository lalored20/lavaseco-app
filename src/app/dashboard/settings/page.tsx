"use client";

import React from 'react';
import AdminSettingsHelper from '@/components/admin/AdminSettingsHelper';
import AdminGuard from '@/components/auth/AdminGuard';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <AdminGuard>
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-orchid-100">
                        <Settings className="text-orchid-600" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h1>
                        <p className="text-gray-500">Gestiona roles, permisos y preferencias globales.</p>
                    </div>
                </div>

                {/* Admin Management Panel */}
                <AdminSettingsHelper />

                {/* Future settings (Notifications, Global Variables, etc.) can go here */}
            </div>
        </AdminGuard>
    );
}
