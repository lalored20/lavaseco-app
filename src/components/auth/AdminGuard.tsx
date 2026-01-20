"use client";

import { useAuth } from "@/context/AuthContext";
import React from "react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    if (!user || user.role !== 'ADMIN') {
        return null;
    }

    return <>{children}</>;
}
