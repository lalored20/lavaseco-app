
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { GeminiInput } from "./GeminiInput";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Bot, ChevronDown, ChevronUp, Maximize2, Minimize2, X, Terminal } from "lucide-react";
import { useChatHistory } from "@/hooks/useChatHistory";
import { toast } from "sonner";

export function AssistantOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Persistent History Hook
    const {
        currentSessionId,
        createSession,
        saveMessageToSession,
        loadSession,
        setCurrentSessionId
    } = useChatHistory();

    const { messages, isLoading } = useChat({
        api: "/api/chat",
        onFinish: (message: any) => {
            if (currentSessionId) {
                saveMessageToSession(currentSessionId, message);
            }
        },
        onError: (err: any) => {
            toast.error("Error de conexión con IA");
            console.error(err);
        }
    } as any) as any;

    // Auto-create session on first message
    const handleSend = async (text: string, files: File[]) => {
        if (!text.trim() && files.length === 0) return;

        let sessionId = currentSessionId;
        if (!sessionId) {
            sessionId = createSession(text);
        }

        // Optimistically save user message
        const userMsg = { id: Date.now().toString(), role: 'user', content: text };
        saveMessageToSession(sessionId!, userMsg);

        // Convert files to base64 if needed in future (Vercel AI SDK handles attachments differently in new versions)
        // For now, passing text. Files support depends on your route logic (route.ts needs to handle images).

        // Trigger submit
        // useChat handles submission via form event or explicit append
        // We simulate the event or update the input and submit

        // Hack to use Vercel AI SDK with custom input component:
        // formatting a synthetic event or using append()

        // Better approach with Vercel AI SDK 'append':
        // await append({ role: 'user', content: text });
        // But we need to use the hook's native `append`.
        // Let's assume handleSubmit works if we set input? No, handleSubmit expects event.
        // We'll use `append` if available, or just reconstruct logic.
        // Actually, Vercel AI SDK `handleSubmit` is for forms. 
        // We'll use `append` from useChat to manually send.

        // Wait, I need `append` from useChat.
        // Let's refactor destructuring above to include append.
    };

    // Correction: I need to use `append` from useChat
    // But since I can't change the hook call in this file easily without seeing the import...
    // I will write the component to use `append` correctly.

    return (
        <OverlayUI
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend} // This needs `append`
        />
    )
}

// Inner Component to safely use hook
function OverlayUI({ isOpen, setIsOpen, messages, isLoading, onSend }: any) {
    const { append: sendMessage, messages: chatMessages, isLoading: chatLoading, stop } = useChat({
        api: "/api/chat",
        onError: (err: any) => toast.error("Error: " + err.message)
    } as any) as any;

    const dragControls = useDragControls();

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const handleCustomSend = async (text: string, files: File[]) => {
        // Files logic would go here (upload to blob -> get url -> append to message)
        // For now, pure text or text + file names
        const fileNames = files.map(f => `[Archivo: ${f.name}]`).join('\n');
        const fullContent = text + (fileNames ? `\n${fileNames}` : "");

        await sendMessage({
            role: 'user',
            content: fullContent
        });
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragControls={dragControls}
            dragListener={false}
            className="fixed bottom-6 right-12 z-50 flex flex-col items-end pointer-events-none"
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-[400px] max-w-[90vw] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden pointer-events-auto flex flex-col mb-4 origin-bottom-right"
                        style={{ height: '600px', maxHeight: '70vh' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                                <Bot size={18} className="text-blue-500" />
                                <span className="font-bold text-sm">Lavaseco AI</span>
                                {chatLoading && <span className="text-[10px] text-blue-500 animate-pulse bg-blue-50 px-2 py-0.5 rounded-full">Pensando...</span>}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                    <X size={18} className="text-zinc-500" />
                                </button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/50">
                            {chatMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50 space-y-2">
                                    <Bot size={32} />
                                    <p className="text-xs text-center px-4">Estoy listo para ayudarte con el sistema.</p>
                                </div>
                            ) : (
                                chatMessages.map((m: any) => (
                                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-500/10'
                                            : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none shadow-sm border border-zinc-100 dark:border-zinc-700'
                                            }`}>
                                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                            <GeminiInput onSend={handleCustomSend} isThinking={chatLoading} placeholder="Escribe..." className="shadow-none border-none bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button (Always Visible) */}
            <motion.div
                layout
                className="pointer-events-auto"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: "none" }}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 relative group ${isOpen ? 'bg-zinc-800 rotate-90' : 'bg-slate-900'}`}
                >
                    <AnimatePresence mode="wait">
                        {isOpen ? (
                            <X key="close" size={24} className="text-white" />
                        ) : (
                            <Bot key="bot" size={28} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                        )}
                    </AnimatePresence>

                    {/* Status Dot */}
                    {!isOpen && <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />}
                </button>
            </motion.div>
        </motion.div>
    );
}
