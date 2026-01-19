"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Check, AlertCircle, ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
// import { useRouter } from 'next/navigation'; // Uncomment when routing is ready

export default function LoginPage() {
    const [step, setStep] = useState<'LOGIN' | 'VERIFY' | 'RECOVERY_EMAIL' | 'RECOVERY_CODE' | 'RECOVERY_NEW_PASS'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
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
        setIsLoading(true);
        toast.dismiss(); // Clear previous toasts

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            // Handle non-JSON responses (Server Crashes)
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("Server Crash Response:", text);
                throw new Error("Error Crítico del Servidor. Revisa la terminal.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || "Error al ingresar");
            }

            // Success Handling
            if (data.status === 'VERIFY_NEEDED') {
                setStep('VERIFY');
                toast.success('Código enviado', { description: data.message });
            } else if (data.status === 'SUCCESS') {
                toast.success('Acceso Correcto', { description: 'Redirigiendo...' });
                window.location.href = '/dashboard/billing-a';
            }

        } catch (err: any) {
            console.error("Login Error:", err);
            toast.error("Error", { description: err.message });
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
            window.location.href = '/dashboard/billing-a';
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

    const handleRecoveryRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep('RECOVERY_CODE');
            toast.success("Código enviado a su correo");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecoveryVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        // Just transition to password reset, the code will be verified nicely there or we can add a check step.
        // For fluidity, we assume code is typed and user wants to set password. 
        // Real verification happens on final submit.
        setStep('RECOVERY_NEW_PASS');
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const code = verificationCode.join('');
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Contraseña actualizada correctamente");
            setStep('LOGIN');
            setPassword('');
            setVerificationCode(['', '', '', '', '', '']);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const speculationRules = {
        prerender: [
            {
                source: "list",
                urls: ["/dashboard/billing-a", "/dashboard/cash"]
            }
        ]
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Speculation Rules for Instant Navigation */}
            <script
                type="speculationrules"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(speculationRules) }}
            />

            {/* Background Decorative Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orchid-300/30 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-orchid-500/10 border border-white/50 backdrop-blur-xl overflow-hidden relative z-10"
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-orchid-600 to-orchid-800 py-6 px-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
                    <div className="relative z-10 text-center">
                        <h1 className="text-4xl font-bold tracking-tight mb-2">Lavaseco Orquídeas</h1>
                    </div>
                </div>

                <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {step === 'LOGIN' ? (
                            <motion.form
                                key="login"
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 30 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleLogin}
                                className="space-y-6 p-8 w-full"
                            >
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 ml-1">Contraseña Maestra</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-500 transition-colors" size={20} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setIsTyping(true)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>

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

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setStep('RECOVERY_EMAIL')}
                                            className="text-sm text-orchid-600 hover:text-orchid-800 font-medium px-3 py-1.5 rounded-lg hover:bg-orchid-50 transition-colors"
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </button>
                                    </div>
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
                            </motion.form>
                        ) : step === 'VERIFY' ? (
                            <motion.form
                                key="verify"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleVerify}
                                className="space-y-6 p-8 w-full"
                            >
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
                                            id={`code-${idx}`}
                                            name={`code-${idx}`}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (/^[0-9]*$/.test(val)) {
                                                    const newCode = [...verificationCode];
                                                    if (val.length > 1) {
                                                        const pasted = val.slice(0, 6).split('');
                                                        for (let i = 0; i < 6; i++) { if (pasted[i]) newCode[i] = pasted[i]; }
                                                        setVerificationCode(newCode);
                                                        document.getElementById(`code-${Math.min(pasted.length - 1, 5)}`)?.focus();
                                                    } else {
                                                        newCode[idx] = val;
                                                        setVerificationCode(newCode);
                                                        if (val && idx < 5) document.getElementById(`code-${idx + 1}`)?.focus();
                                                    }
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !digit && idx > 0) {
                                                    const newCode = [...verificationCode];
                                                    newCode[idx - 1] = '';
                                                    setVerificationCode(newCode);
                                                    document.getElementById(`code-${idx - 1}`)?.focus();
                                                } else if (e.key === 'Backspace' && digit) {
                                                    const newCode = [...verificationCode];
                                                    newCode[idx] = '';
                                                    setVerificationCode(newCode);
                                                }
                                            }}
                                            onPaste={(e) => {
                                                e.preventDefault();
                                                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
                                                if (pastedData.length > 0) {
                                                    const newCode = [...verificationCode];
                                                    pastedData.forEach((d, i) => { if (idx + i < 6) newCode[idx + i] = d; });
                                                    setVerificationCode(newCode);
                                                    document.getElementById(`code-${Math.min(idx + pastedData.length, 5)}`)?.focus();
                                                }
                                            }}
                                            className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold text-slate-800 focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 outline-none transition-all"
                                        />
                                    ))}
                                </div>

                                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                    {isLoading ? "Verificando..." : "Confirmar Acceso"}
                                </button>

                                <div className="flex items-center justify-between text-sm mt-4 px-2">
                                    <button type="button" onClick={() => setStep('LOGIN')} className="text-slate-500 hover:text-slate-700 font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-all active:bg-slate-200">
                                        Cambiar Correo
                                    </button>
                                    <button type="button" onClick={handleResend} className="text-orchid-600 hover:text-orchid-800 font-medium px-3 py-2 rounded-lg hover:bg-orchid-50 transition-all active:bg-orchid-100">
                                        Reenviar Código
                                    </button>
                                </div>
                            </motion.form>
                        ) : step === 'RECOVERY_EMAIL' ? (
                            <motion.form
                                key="recovery-email"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleRecoveryRequest}
                                className="space-y-6 p-8 w-full"
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Recuperar Cuenta</h2>
                                    <p className="text-slate-500 text-sm mt-1">Ingresa tu correo para recibir un código de recuperación.</p>
                                </div>

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

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-4"
                                >
                                    {isLoading ? "Enviando..." : "Enviar Código"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep('LOGIN')}
                                    className="w-full text-slate-500 hover:text-slate-700 font-medium text-sm mt-4 py-3 rounded-xl hover:bg-slate-100 transition-all active:bg-slate-200"
                                >
                                    Volver al Login
                                </button>
                            </motion.form>
                        ) : step === 'RECOVERY_CODE' ? (
                            <motion.form
                                key="recovery-code"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleRecoveryVerify}
                                className="space-y-6 p-8 w-full"
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Código de Seguridad</h2>
                                    <p className="text-slate-500 text-sm mt-1">Revisa tu correo {email}</p>
                                </div>

                                <div className="flex justify-between gap-2">
                                    {verificationCode.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            id={`reccode-${idx}`}
                                            name={`reccode-${idx}`}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (/^[0-9]*$/.test(val)) {
                                                    const newCode = [...verificationCode];
                                                    if (val.length > 1) {
                                                        const pasted = val.slice(0, 6).split('');
                                                        for (let i = 0; i < 6; i++) { if (pasted[i]) newCode[i] = pasted[i]; }
                                                        setVerificationCode(newCode);
                                                        document.getElementById(`reccode-${Math.min(pasted.length - 1, 5)}`)?.focus();
                                                    } else {
                                                        newCode[idx] = val;
                                                        setVerificationCode(newCode);
                                                        if (val && idx < 5) document.getElementById(`reccode-${idx + 1}`)?.focus();
                                                    }
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !digit && idx > 0) {
                                                    const newCode = [...verificationCode];
                                                    newCode[idx - 1] = '';
                                                    setVerificationCode(newCode);
                                                    document.getElementById(`reccode-${idx - 1}`)?.focus();
                                                } else if (e.key === 'Backspace' && digit) {
                                                    const newCode = [...verificationCode];
                                                    newCode[idx] = '';
                                                    setVerificationCode(newCode);
                                                }
                                            }}
                                            onPaste={(e) => {
                                                e.preventDefault();
                                                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
                                                if (pastedData.length > 0) {
                                                    const newCode = [...verificationCode];
                                                    pastedData.forEach((d, i) => { if (idx + i < 6) newCode[idx + i] = d; });
                                                    setVerificationCode(newCode);
                                                    document.getElementById(`reccode-${Math.min(idx + pastedData.length, 5)}`)?.focus();
                                                }
                                            }}
                                            className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold text-slate-800 focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 outline-none transition-all"
                                        />
                                    ))}
                                </div>

                                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg mt-4">
                                    Verificar Código
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="recovery-new-pass"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handlePasswordReset}
                                className="space-y-6 p-8 w-full"
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Nueva Contraseña</h2>
                                    <p className="text-slate-500 text-sm mt-1">Crea una clave segura para tu cuenta.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 ml-1">Nueva Contraseña</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orchid-500 transition-colors" size={20} />
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-orchid-600 hover:bg-orchid-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orchid-500/30 transition-all active:scale-[0.98] mt-4"
                                >
                                    {isLoading ? "Actualizando..." : "Cambiar Contraseña"}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Sistema protegido por <span className="font-semibold text-orchid-600">laloret2.0</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );

}
