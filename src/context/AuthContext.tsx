"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
// import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
    name?: string;
    role: 'ADMIN' | 'STAFF';
    activeShiftId?: string | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    updateShift: (shiftId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    // const router = useRouter();

    useEffect(() => {
        // Load from localStorage on mount
        const stored = localStorage.getItem("lavaseco_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user session", e);
                localStorage.removeItem("lavaseco_user");
            }
        }
        setLoading(false);
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem("lavaseco_user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("lavaseco_user");
        window.location.href = "/login";
    };

    const updateShift = (shiftId: string | null) => {
        if (!user) return;
        const updatedUser = { ...user, activeShiftId: shiftId };
        setUser(updatedUser);
        localStorage.setItem("lavaseco_user", JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateShift }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
