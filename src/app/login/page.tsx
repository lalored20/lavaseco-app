"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Check, AlertCircle, ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
// import { useRouter } from 'next/navigation'; // Uncomment when routing is ready

export default function LoginPage() {
    const [step, setStep] = useState<'LOGIN' | 'VERIFY'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Password Strength Logic
    const getPasswordStrength = (pass: string) => {
        let score = 0;
        if (pass.length > 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;
        return score; // 0-4
    };
    const strength = getPasswordStrength(password);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        setIsLoading(true);
        try {
            console.log("Enviando petición de login...");
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log("Status respuesta:", res.status);

            // Check content type before parsing JSON
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text();
                console.error("Respuesta NO-JSON:", text);
                throw new Error("Error del Servidor (500). Revisa la terminal negra.");
            }

            const data = await res.json();
            console.log("Datos recibidos:", data);

            if (!res.ok) throw new Error(data.error || "Error desconocido");

            if (data.status === 'VERIFY_NEEDED') {
                setStep('VERIFY');
                toast.message('ATENCIÓN:', {
                    description: data.message,
                    duration: 8000,
                });
            } else if (data.status === 'SUCCESS') {
                toast.success("¡Bienvenido de nuevo!");
                window.location.href = '/dashboard/reception';
            }
        } catch (error: any) {
            console.error("Login Error Catch:", error);
            toast.error("Error al Ingresar:", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const code = verificationCode.join('');

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success("¡Identidad verificada! Ingresando...");
            // router.push('/dashboard/reception');
        } catch (error: any) {
            toast.error(error.message || "Código inválido");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            const res = await fetch('/api/auth/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Código reenviado. Intentos restantes: ${data.attemptsLeft}`);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orchid-300/30 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-orchid-500/10 border border-white/50 backdrop-blur-xl overflow-hidden relative z-10"
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-orchid-600 to-orchid-800 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Lavaseco Orquídeas</h1>
                        <p className="text-orchid-100 opacity-90">Gestión Inteligente & Premium</p>
                    </div>
                </div>

                <div className="p-8">
                    {step === 'LOGIN' ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 ml-1">Correo Electrónico</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-500 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                        placeholder="admin@lavaseco.com"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 ml-1">Contraseña Maestra</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-500 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setIsTyping(true)}
                                        // onBlur={() => setIsTyping(false)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {/* Password Strength Meter */}
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: isTyping ? 'auto' : 0, opacity: isTyping ? 1 : 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex gap-1 h-1.5 mt-2 mb-1">
                                        <div className={clsx("flex-1 rounded-full transition-all duration-300", strength >= 1 ? "bg-red-400" : "bg-slate-200")} />
                                        <div className={clsx("flex-1 rounded-full transition-all duration-300", strength >= 2 ? "bg-orange-400" : "bg-slate-200")} />
                                        <div className={clsx("flex-1 rounded-full transition-all duration-300", strength >= 3 ? "bg-yellow-400" : "bg-slate-200")} />
                                        <div className={clsx("flex-1 rounded-full transition-all duration-300", strength >= 4 ? "bg-green-500" : "bg-slate-200")} />
                                    </div>
                                    <p className="text-xs text-slate-500 ml-1 flex items-center gap-1">
                                        <ShieldCheck size={12} />
                                        {strength === 0 && "Demasiado débil"}
                                        {strength === 1 && "Débil"}
                                        {strength === 2 && "Regular"}
                                        {strength === 3 && "Buena"}
                                        {strength === 4 && "Excelente seguridad"}
                                    </p>
                                </motion.div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-orchid-600 hover:bg-orchid-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orchid-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Ingresar al Sistema
                                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-orchid-100 text-orchid-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Smartphone size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Verificación de Identidad</h2>
                                <p className="text-slate-500 text-sm mt-1">Hemos enviado un código a<br /> <span className="text-slate-800 font-medium">{email}</span></p>
                            </div>

                            <div className="flex justify-between gap-2">
                                {verificationCode.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        value={digit}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length <= 1) {
                                                const newCode = [...verificationCode];
                                                newCode[idx] = val;
                                                setVerificationCode(newCode);
                                                // Auto-focus next
                                                if (val && idx < 5) {
                                                    const nextInput = document.querySelector(`input[name="code-${idx + 1}"]`) as HTMLInputElement;
                                                    if (nextInput) nextInput.focus();
                                                }
                                            }
                                        }}
                                        name={`code-${idx}`}
                                        type="text"
                                        maxLength={1}
                                        className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold text-slate-800 focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 outline-none transition-all"
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-4"
                            >
                                {isLoading ? "Verificando..." : "Confirmar Acceso"}
                            </button>

                            <div className="flex items-center justify-between text-sm mt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep('LOGIN')}
                                    className="text-slate-400 hover:text-slate-600 font-medium"
                                >
                                    Cambiar Correo
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    className="text-orchid-600 hover:text-orchid-700 font-medium"
                                >
                                    Reenviar Código
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Sistema protegido por <span className="font-semibold text-orchid-600">Antigravity™ Protocol</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
