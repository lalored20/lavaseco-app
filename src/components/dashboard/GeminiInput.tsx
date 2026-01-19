"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Mic, Send, Plus, Image as ImageIcon, FileText, Video as VideoIcon, Square, Command, Zap, MessageSquare, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { classifyIntent } from "@/lib/dispatcher";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// --- DATA CONSTANTS ---
const COMMANDS = [
    { id: 'nuevo', label: 'Nuevo Ingreso', icon: <Plus size={14} />, desc: 'Registrar nuevas prendas' },
    { id: 'buscar', label: 'Buscar Orden', icon: <Search size={14} />, desc: 'Consultar estado por recibo/nombre' },
    { id: 'ayuda', label: 'Ayuda', icon: <MessageSquare size={14} />, desc: 'Ver comandos disponibles' },
];

// File Preview Component
const FilePreview = ({ file, onRemove }: { file: File, onRemove: () => void }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const isImage = file.type.startsWith('image/');

    useEffect(() => {
        if (isImage) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file, isImage]);

    const getIcon = () => {
        if (file.name.endsWith('.pdf')) return <FileText size={20} className="text-red-500" />;
        return <FileText size={20} className="text-gray-500" />;
    };

    return (
        <div className="relative group flex flex-col items-center gap-1 w-16">
            <div className="w-full aspect-square rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center overflow-hidden relative">
                {isImage && previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center gap-1 p-1 text-center">
                        {getIcon()}
                    </div>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                    ×
                </button>
            </div>
            <span className="text-[9px] text-zinc-500 truncate w-full text-center px-0.5 leading-tight">
                {file.name}
            </span>
        </div>
    );
};

interface GeminiInputProps {
    onSend?: (text: string, files: File[]) => void;
    placeholder?: string;
    className?: string;
    isThinking?: boolean;
}

export function GeminiInput({ onSend, placeholder, className, isThinking }: GeminiInputProps = {}) {
    const router = useRouter();
    const [inputValue, setInputValue] = useState("");

    // Suggestion State
    const [suggestionMode, setSuggestionMode] = useState<'COMMAND' | null>(null);
    const [suggestionQuery, setSuggestionQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);

    const [isRecording, setIsRecording] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const dragCounter = useRef(0);
    const recognitionRef = useRef<any>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Drag Events
        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault(); e.stopPropagation();
            dragCounter.current += 1;
            if (e.dataTransfer?.types) setIsDragging(true);
        };
        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault(); e.stopPropagation();
            dragCounter.current -= 1;
            if (dragCounter.current === 0) setIsDragging(false);
        };
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault(); e.stopPropagation();
        };
        const handleDrop = (e: DragEvent) => {
            e.preventDefault(); e.stopPropagation();
            setIsDragging(false);
            dragCounter.current = 0;
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                setPendingFiles(prev => [...prev, ...Array.from(e.dataTransfer!.files)]);
            }
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, []);

    // Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'es-ES';

                recognition.onresult = (event: any) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    if (finalTranscript) {
                        setInputValue(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
                    }
                };
                recognition.onerror = () => setIsRecording(false);
                recognitionRef.current = recognition;
            }
        }
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 200) + 'px';
        }
    }, [inputValue]);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            toast.error("Voz no soportada en este navegador");
            return;
        }
        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    const handleSend = () => {
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }

        if (!inputValue.trim() && pendingFiles.length === 0) return;

        // Classify intent for routing if needed (can be used by parent)
        const intent = classifyIntent(inputValue);
        console.log("Intent detected:", intent);

        if (onSend) {
            onSend(inputValue, pendingFiles);
            setInputValue("");
            setPendingFiles([]);
            if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
        }
    };

    // Suggestions match
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInputValue(value);

        const words = value.split(" ");
        const lastWord = words[words.length - 1];

        if (lastWord.startsWith("/")) {
            setSuggestionMode('COMMAND');
            setSuggestionQuery(lastWord.slice(1));
            setSelectedIndex(0);
        } else {
            setSuggestionMode(null);
        }
    };

    const insertSuggestion = (item: any) => {
        const words = inputValue.split(" ");
        words.pop();
        const newValue = [...words, `/${item.id} `].join(" ");
        setInputValue(newValue);
        setSuggestionMode(null);
        textAreaRef.current?.focus();
    };

    const filteredSuggestions = suggestionMode === 'COMMAND'
        ? COMMANDS.filter(c => c.id.includes(suggestionQuery.toLowerCase()) || c.label.toLowerCase().includes(suggestionQuery.toLowerCase()))
        : [];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (suggestionMode && filteredSuggestions.length > 0) {
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => prev > 0 ? prev - 1 : filteredSuggestions.length - 1); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : 0); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertSuggestion(filteredSuggestions[selectedIndex]); return; }
            if (e.key === 'Escape') { setSuggestionMode(null); return; }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`w-full max-w-3xl mx-auto relative z-50 ${className || ''}`}>
            {/* Drag Overlay */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isDragging && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                        >
                            <div className="p-10 border-4 border-dashed border-white/50 rounded-3xl flex flex-col items-center gap-4 text-white">
                                <Plus size={80} />
                                <h2 className="text-4xl font-bold">SUELTA TUS ARCHIVOS</h2>
                                <p className="text-xl opacity-80">Fotos de prendas, recibos, etc.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Suggestions */}
            <AnimatePresence>
                {suggestionMode && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-50"
                    >
                        <div className="bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Command size={12} /> Comandos
                        </div>
                        {filteredSuggestions.map((item, index) => (
                            <button
                                key={item.id}
                                onClick={() => insertSuggestion(item)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">/{item.id}</div>
                                    <div className="text-xs text-zinc-400">{item.desc}</div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Input Box */}
            <motion.div className="bg-white dark:bg-zinc-900 rounded-3xl p-2 shadow-2xl shadow-black/10 border border-zinc-200 dark:border-zinc-800 flex flex-col" layout>
                {/* Pending Files */}
                <AnimatePresence>
                    {pendingFiles.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex gap-2 p-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto"
                        >
                            {pendingFiles.map((file, idx) => (
                                <FilePreview key={idx} file={file} onRemove={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-end gap-2 w-full pt-1 px-1">
                    {/* Media Button */}
                    <button
                        onClick={() => imageInputRef.current?.click()}
                        className="p-3 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                    >
                        <ImageIcon size={20} />
                    </button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={(e) => e.target.files && setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)])} />

                    <textarea
                        ref={textAreaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={isRecording ? "Escuchando..." : (placeholder || "Escribe una orden...")}
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 text-lg py-3 resize-none max-h-[200px]"
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-2 pb-1">
                        {isThinking ? (
                            <div className="p-3">
                                <span className="block w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></span>
                            </div>
                        ) : isRecording ? (
                            <button onClick={toggleRecording} className="p-3 bg-red-500 text-white rounded-full animate-pulse shadow-lg shadow-red-500/30">
                                <Square size={16} fill="currentColor" />
                            </button>
                        ) : inputValue.trim() || pendingFiles.length > 0 ? (
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                onClick={handleSend}
                                className="p-3 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                            >
                                <Send size={20} />
                            </motion.button>
                        ) : (
                            <button onClick={toggleRecording} className="p-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full">
                                <Mic size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
