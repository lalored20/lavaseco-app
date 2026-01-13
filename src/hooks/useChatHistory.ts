import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface ChatSession {
    id: string;
    title: string;
    timestamp: string;
    preview: string;
    messages: any[];
    lastModified: number;
}

export function useChatHistory() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('lavaseco_chat_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                setSessions(parsed.sort((a: ChatSession, b: ChatSession) => b.lastModified - a.lastModified));
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);

    const persistSessions = (newSessions: ChatSession[]) => {
        setSessions(newSessions);
        localStorage.setItem('lavaseco_chat_history', JSON.stringify(newSessions));
    };

    const createSession = useCallback((firstMessage: string) => {
        const newId = Date.now().toString();
        const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage;

        const newSession: ChatSession = {
            id: newId,
            title: title || "Nueva Consulta",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            preview: firstMessage,
            messages: [],
            lastModified: Date.now()
        };

        setSessions(prev => {
            const updated = [newSession, ...prev];
            localStorage.setItem('lavaseco_chat_history', JSON.stringify(updated));
            return updated;
        });
        setCurrentSessionId(newId);
        return newId;
    }, []);

    const saveMessageToSession = useCallback((sessionId: string, message: any) => {
        setSessions(prev => {
            const sessionIndex = prev.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) return prev;

            const updatedSessions = [...prev];
            const session = { ...updatedSessions[sessionIndex] };

            session.messages = [...session.messages, message];
            session.lastModified = Date.now();
            session.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (session.messages.length === 1 && message.role === 'user') {
                session.title = message.content.length > 30 ? message.content.substring(0, 30) + "..." : message.content;
            }

            updatedSessions[sessionIndex] = session;
            updatedSessions.sort((a, b) => b.lastModified - a.lastModified);

            localStorage.setItem('lavaseco_chat_history', JSON.stringify(updatedSessions));
            return updatedSessions;
        });
    }, []);

    const loadSession = useCallback((id: string) => {
        const session = sessions.find(s => s.id === id);
        return session ? session.messages : [];
    }, [sessions]);

    const deleteSession = useCallback((id: string) => {
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            localStorage.setItem('lavaseco_chat_history', JSON.stringify(updated));
            return updated;
        });

        setCurrentSessionId(current => current === id ? null : current);
        toast.success("Conversación eliminada");
    }, []);

    const clearHistory = useCallback(() => {
        if (confirm("¿Borrar todo el historial?")) {
            setSessions([]);
            localStorage.setItem('lavaseco_chat_history', JSON.stringify([]));
            toast.success("Memoria borrada");
        }
    }, []);

    return {
        sessions,
        currentSessionId,
        setCurrentSessionId,
        createSession,
        saveMessageToSession,
        loadSession,
        deleteSession,
        clearHistory
    };
}
