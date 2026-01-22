"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ShiftProtection({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-orchid-50">
                <div className="w-10 h-10 border-4 border-orchid-200 border-t-orchid-600 rounded-full animate-spin" />
            </div>
        );
    }

    // Allow all authenticated users through - no shift requirement
    return <>{children}</>;
}
