"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Trash2, UserPlus, Shield } from "lucide-react";
import AdminGuard from "@/components/auth/AdminGuard";

interface AllowedAdmin {
    id: string;
    email: string;
    addedBy: string;
    createdAt: string;
}

export default function AdminSettingsHelper() {
    const { user } = useAuth();
    const [admins, setAdmins] = useState<AllowedAdmin[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch Admins on mount
    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchAdmins();
        }
    }, [user]);

    const fetchAdmins = async () => {
        try {
            const res = await fetch('/api/admin/whitelist');
            if (res.ok) {
                const data = await res.json();
                setAdmins(data);
            }
        } catch (e) {
            console.error("Error fetching admins", e);
        }
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch('/api/admin/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, addedBy: user?.email })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Error al agregar");
            }

            setNewEmail("");
            fetchAdmins();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (email: string) => {
        if (!confirm(`¿Estás seguro de quitar acceso admin a ${email}?`)) return;

        try {
            const res = await fetch('/api/admin/whitelist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                fetchAdmins();
            } else {
                alert("No se pudo eliminar (¿Es Super Admin?)");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <AdminGuard>
            <div className="bg-white rounded-xl shadow-lg p-6 mt-8 border border-indigo-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Shield className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Administradores del Sistema</h2>
                        <p className="text-sm text-gray-500">Gestiona quién tiene acceso a funciones sensibles</p>
                    </div>
                </div>

                {/* Add New Admin Form */}
                <form onSubmit={handleAddAdmin} className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserPlus size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="email"
                            placeholder="Nuevo correo admin..."
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Agregando..." : "Agregar"}
                    </button>
                </form>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                {/* Admin List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Lista Actual</h3>

                    {/* Always show YOU (The Viewer) if you are admin */}
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                YO
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{user?.email}</p>
                                <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                                    Activo (Tú)
                                </span>
                            </div>
                        </div>
                    </div>

                    {admins.filter(a => a.email !== user?.email).map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                                    {admin.email.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{admin.email}</p>
                                    <p className="text-xs text-gray-500">Agregado el {new Date(admin.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveAdmin(admin.email)}
                                className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                                title="Revocar Acceso"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}

                    {admins.length === 0 && (
                        <p className="text-sm text-gray-500 italic text-center py-2">
                            Solo los Super Admins tienen acceso por ahora.
                        </p>
                    )}
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800">
                    <strong>Nota:</strong> Los usuarios "Super Admin" (rutaexitosa2 y rmendivilmora2) no pueden ser eliminados y no siempre aparecen en esta lista si no están en la Base de Datos.
                </div>
            </div>
        </AdminGuard>
    );
}
