
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Bot, X, Sparkles, Send, WifiOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AssistantOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const dragControls = useDragControls();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial message
    const initialMessages = [
        {
            id: 'welcome',
            role: 'assistant' as const,
            content: 'Hola, soy la IA de Lavaseco. Puedo consultar ventas, clientes y procedimientos de planta. ¿En qué te ayudo?'
        }
    ];

    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: "/api/chat",
        initialMessages: initialMessages,
        onError: (err: any) => {
            console.error("AI Error:", err);
            toast.error("Error conectando con IA");
        }
    });

    // Offline Detection
    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, isOpen]);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOnline) {
            toast.error("Sin conexión a internet");
            return;
        }
        handleSubmit(e);
    };

    // If offline, we can hide the button or just show status. User requested "Graceful Degradation".
    // We will keep the button but show offline state inside.


    const safeHandleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (handleInputChange) {
            handleInputChange(e);
        }
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragControls={dragControls}
            dragListener={false}
            className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none"
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-[380px] max-w-[90vw] bg-white backdrop-blur-xl border border-orchid-100 shadow-2xl rounded-2xl overflow-hidden pointer-events-auto flex flex-col mb-4 origin-bottom-right"
                        style={{ height: '550px', maxHeight: '70vh' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-orchid-100 bg-orchid-50/50">
                            <div className="flex items-center gap-2 text-slate-700">
                                <div className="w-8 h-8 rounded-full bg-orchid-100 flex items-center justify-center text-orchid-600">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <span className="font-bold text-sm block">Orquídeas AI</span>
                                    {isOnline ? (
                                        <span className="text-[10px] text-green-600 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> En línea
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-red-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Offline
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30" ref={scrollRef}>
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.role === 'user'
                                        ? 'bg-slate-800 text-white rounded-br-none'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                        }`}>
                                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                                        {/* Tool Feedback */}
                                        {m.toolInvocations?.map((toolCall) => (
                                            <div key={toolCall.toolCallId} className="mt-2 pt-2 border-t border-white/10 text-xs opacity-70">
                                                <div className="flex items-center gap-1 font-mono uppercase">
                                                    <Sparkles size={10} /> {toolCall.toolName}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                        <Loader2 size={16} className="text-orchid-500 animate-spin" />
                                        <span className="text-xs text-slate-400">Analizando...</span>
                                    </div>
                                </div>
                            )}

                            {!isOnline && (
                                <div className="flex justify-center my-2">
                                    <span className="bg-red-50 text-red-500 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                        <WifiOff size={12} /> Sin conexión
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-slate-100">
                            <form onSubmit={onSubmit} className="relative flex items-center gap-2">
                                <input
                                    value={input || ''}
                                    onChange={safeHandleInputChange}
                                    disabled={!isOnline || isLoading}
                                    placeholder={isOnline ? "Escribe tu consulta..." : "Sin conexión"}
                                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orchid-500/20 focus:border-orchid-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="submit"
                                    disabled={!(input || '').trim() || !isOnline || isLoading}
                                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-slate-900/10"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.div
                className="pointer-events-auto"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: "none" }}
            >
                {!isOpen ? (
                    <button
                        onClick={() => setIsOpen(true)}
                        className={`w-14 h-14 rounded-full shadow-2xl shadow-orchid-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 relative group bg-slate-900 text-white`}
                    >
                        <Bot size={28} className="text-white group-hover:rotate-12 transition-transform" />
                        {/* Notify badge if online */}
                        {isOnline && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-bounce" />}
                        {!isOnline && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full" />}
                    </button>
                ) : null}
            </motion.div>
        </motion.div>
    );
}
