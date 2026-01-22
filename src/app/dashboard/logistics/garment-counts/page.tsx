'use client';

import { useState, useEffect } from 'react';
import {
    Loader2, Save, Truck, Home,
    ArrowUpRight, ArrowDownLeft, Calendar,
    Search
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DailyGarmentCountPage() {
    // Date logic moved to useEffect to ensure client-side accuracy

    // --- STATE: Daily Input ---
    const [plantCount, setPlantCount] = useState<number | string>(0);
    const [homeCount, setHomeCount] = useState<number | string>(0);
    const [savingPlant, setSavingPlant] = useState(false);
    const [savingHome, setSavingHome] = useState(false);

    // --- STATE: Data Table ---
    const [today, setToday] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tableData, setTableData] = useState<any[]>([]);
    const [loadingTable, setLoadingTable] = useState(false);

    // --- STATE: Notes Modal ---
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [noteType, setNoteType] = useState<'plant' | 'home' | null>(null);
    const [currentNote, setCurrentNote] = useState('');
    const [targetDate, setTargetDate] = useState(''); // Date of the record being edited
    const [savingNote, setSavingNote] = useState(false);

    // Initial Load & Date Setup
    useEffect(() => {
        // Set Today on Client Mount
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const localToday = `${year}-${month}-${day}`;

        setToday(localToday);
        setStartDate(localToday);
        setEndDate(localToday);

        const fetchTodayInput = async () => {
            try {
                const res = await fetch(`/api/logistics/daily-counts?limit=5`);
                const data = await res.json();
                if (data.success) {
                    const record = data.data.find((r: any) =>
                        r.date.startsWith(localToday) || new Date(r.date).toISOString().startsWith(localToday)
                    );
                    if (record) {
                        setPlantCount(record.plantCount);
                        setHomeCount(record.homeCount);
                    }
                }
            } catch (e) { console.error(e) }
        };

        const fetchInitialTable = async () => {
            setLoadingTable(true);
            try {
                const res = await fetch(`/api/logistics/daily-counts?mode=summary&startDate=${localToday}&endDate=${localToday}`);
                const data = await res.json();
                if (data.success) setTableData(data.data);
            } catch (e) { console.error(e) } finally { setLoadingTable(false) }
        };

        fetchTodayInput();
        fetchInitialTable();
    }, []);

    const fetchTableData = async () => {
        setLoadingTable(true);
        try {
            const res = await fetch(`/api/logistics/daily-counts?mode=summary&startDate=${startDate}&endDate=${endDate}`);
            const data = await res.json();
            if (data.success) setTableData(data.data);
        } catch (e) { console.error(e) } finally { setLoadingTable(false) }
    };

    const handleSave = async (type: 'plant' | 'home') => {
        if (type === 'plant') setSavingPlant(true);
        else setSavingHome(true);

        try {
            const res = await fetch('/api/logistics/daily-counts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: today,
                    plantCount: Number(plantCount || 0),
                    homeCount: Number(homeCount || 0)
                })
            });
            const data = await res.json();
            if (data.success) {
                if (today >= startDate && today <= endDate) fetchTableData();
            }
        } catch (error) {
            alert("Error de conexión");
        } finally {
            if (type === 'plant') setSavingPlant(false);
            else setSavingHome(false);
        }
    };

    const openNoteModal = (date: string, type: 'plant' | 'home', existingNote: string | null) => {
        setTargetDate(date);
        setNoteType(type);
        setCurrentNote(existingNote || '');
        setIsNotesModalOpen(true);
    };

    const saveNote = async () => {
        if (!targetDate || !noteType) return;
        setSavingNote(true);

        // Find existing counts to preserve them
        const record = tableData.find(r => r.date === targetDate);
        const pCount = record?.plant || 0;
        const hCount = record?.home || 0;
        // Determine payload based on type
        const payload: any = {
            date: targetDate,
            plantCount: pCount,
            homeCount: hCount,
        };

        // We need to send BOTH notes to avoid overwriting the other one with null/undefined if the API is strict?
        // Actually our API logic: "plantNotes: plantNotes || undefined"
        // So passing only the changed one is safer if we want to update only one. 
        // BUT upsert needs all fields? No, 'update' inputs are optional.
        // However, our API destructured: const { ... plantNotes, homeNotes } = body.
        // And passed them to update. 
        // Let's pass what we have in the record for the OTHER note to be safe.

        if (noteType === 'plant') {
            payload.plantNotes = currentNote;
            // payload.homeNotes = record?.homeNotes; // Optional: send existing if needed, but API handles undefined
        } else {
            payload.homeNotes = currentNote;
            // payload.plantNotes = record?.plantNotes;
        }

        try {
            const res = await fetch('/api/logistics/daily-counts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setIsNotesModalOpen(false);
                fetchTableData(); // Refresh table
            } else {
                alert("Error guardando nota");
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión");
        } finally {
            setSavingNote(false);
        }
    };

    // Calculations for Footer
    const totalIngress = tableData.reduce((acc, curr) => acc + (curr.ingress || 0), 0);
    const totalEgress = tableData.reduce((acc, curr) => acc + (curr.egress || 0), 0);
    const totalPlant = tableData.reduce((acc, curr) => acc + (curr.plant || 0), 0);
    const totalHome = tableData.reduce((acc, curr) => acc + (curr.home || 0), 0);

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Logística</h1>
                <p className="text-slate-500 text-sm font-medium">Control de Flujo y Salidas</p>
            </div>

            {/* SECTION 1: HORIZONTAL CARDS (FLEX FIT-CONTENT) */}
            <div className="flex flex-wrap items-center justify-center gap-6"> {/* CHANGED TO FLEX CENTER WITH AUTO WIDTH */}

                {/* CARD 1: PLANTA */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md border border-indigo-100 p-4 transition-shadow hover:shadow-lg w-auto" // w-auto instead of full width
                >
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-50 p-2 rounded-lg shrink-0">
                                <Truck className="h-5 w-5 text-indigo-600" />
                            </div>
                            <span className="font-bold text-slate-700 text-sm uppercase tracking-wide truncate">Planta</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <input
                                type="number"
                                value={plantCount}
                                onChange={(e) => setPlantCount(e.target.value)}
                                min="0"
                                className="w-20 bg-slate-50 border-2 border-slate-200 rounded-lg text-center text-xl font-bold text-slate-800 py-1 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                placeholder="0"
                            />

                            <button
                                onClick={() => handleSave('plant')}
                                disabled={savingPlant}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                            >
                                {savingPlant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                GUARDAR
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* CARD 2: CASA */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md border border-emerald-100 p-4 transition-shadow hover:shadow-lg w-auto" // w-auto
                >
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-emerald-50 p-2 rounded-lg shrink-0">
                                <Home className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="font-bold text-slate-700 text-sm uppercase tracking-wide truncate">Casa</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <input
                                type="number"
                                value={homeCount}
                                onChange={(e) => setHomeCount(e.target.value)}
                                min="0"
                                className="w-20 bg-slate-50 border-2 border-slate-200 rounded-lg text-center text-xl font-bold text-slate-800 py-1 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                                placeholder="0"
                            />

                            <button
                                onClick={() => handleSave('home')}
                                disabled={savingHome}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                            >
                                {savingHome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                GUARDAR
                            </button>
                        </div>
                    </div>
                </motion.div>

            </div>

            {/* SECTION 2: FULL WIDTH TABLE */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        Historial de Movimientos
                    </h3>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <input
                            type="date"
                            value={startDate}
                            max={today}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-xs font-medium text-slate-600 bg-transparent outline-none px-2 py-1 border-r border-slate-100 placeholder:text-slate-300"
                        />
                        <span className="text-slate-300 px-1 text-xs">→</span>
                        <input
                            type="date"
                            value={endDate}
                            max={today}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-xs font-medium text-slate-600 bg-transparent outline-none px-2 py-1 border-r border-slate-100"
                        />
                        <button
                            onClick={fetchTableData}
                            disabled={loadingTable}
                            className="h-7 w-7 bg-indigo-50 hover:bg-indigo-100 rounded flex items-center justify-center text-indigo-600 transition-colors"
                        >
                            {loadingTable ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3 text-center text-emerald-600 bg-emerald-50/30 border-l border-r border-emerald-100">Personas (Ingresan)</th>
                                <th className="px-6 py-3 text-center text-amber-600 bg-amber-50/30 border-r border-amber-100">Personas (Retiran)</th>
                                <th className="px-6 py-3 text-center text-indigo-600 bg-indigo-50/30 border-r border-indigo-100">Envío Planta</th>
                                <th className="px-6 py-3 text-center text-teal-600 bg-teal-50/30">Envío Casa</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium divide-y divide-slate-50">
                            {loadingTable && (
                                <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-xs">Cargando datos...</td></tr>
                            )}

                            {!loadingTable && tableData.length === 0 && (
                                <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No hay datos para hoy.</td></tr>
                            )}

                            {!loadingTable && tableData.map((row) => (
                                <tr key={row.date} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-3 text-slate-600 font-normal">
                                        {/* Use consistent date formatting for display */}
                                        {new Date(row.date + 'T12:00:00').toLocaleDateString('es-CO', {
                                            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                    </td>

                                    <td className="px-6 py-3 text-center text-emerald-700 bg-emerald-50/10 border-l border-r border-slate-100">
                                        {row.ingress > 0 ? (
                                            <span className="inline-flex items-center gap-1 font-bold">
                                                <ArrowDownLeft className="h-3 w-3 opacity-50" /> {row.ingress}
                                            </span>
                                        ) : <span className="text-slate-200">-</span>}
                                    </td>

                                    <td className="px-6 py-3 text-center text-amber-700 bg-amber-50/10 border-r border-slate-100">
                                        {row.egress > 0 ? (
                                            <span className="inline-flex items-center gap-1 font-bold">
                                                {row.egress} <ArrowUpRight className="h-3 w-3 opacity-50" />
                                            </span>
                                        ) : <span className="text-slate-200">-</span>}
                                    </td>

                                    <td className="px-6 py-3 text-center text-indigo-700 bg-indigo-50/10 border-r border-slate-100 font-bold hover:bg-indigo-100 cursor-pointer transition-colors"
                                        onClick={() => openNoteModal(row.date, 'plant', row.plantNotes)}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            {row.plant > 0 ? row.plant : <span className="text-slate-200">-</span>}
                                            {row.plantNotes && (
                                                <span className="h-2 w-2 rounded-full bg-indigo-500 block relative"></span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-3 text-center text-teal-700 bg-teal-50/10 font-bold hover:bg-teal-100 cursor-pointer transition-colors"
                                        onClick={() => openNoteModal(row.date, 'home', row.homeNotes)}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            {row.home > 0 ? row.home : <span className="text-slate-200">-</span>}
                                            {row.homeNotes && (
                                                <span className="h-2 w-2 rounded-full bg-teal-500 block relative"></span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs uppercase">
                            <tr className="text-slate-800">
                                <td className="px-6 py-3">TOTALES</td>
                                <td className="px-6 py-3 text-center text-emerald-800 border-l border-r border-slate-200">{totalIngress}</td>
                                <td className="px-6 py-3 text-center text-amber-800 border-r border-slate-200">{totalEgress}</td>
                                <td className="px-6 py-3 text-center text-indigo-800 border-r border-slate-200">{totalPlant}</td>
                                <td className="px-6 py-3 text-center text-teal-800">{totalHome}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* MODAL for Notes */}
            {isNotesModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4"
                    >
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {noteType === 'plant' ? <Truck className="h-5 w-5 text-indigo-600" /> : <Home className="h-5 w-5 text-emerald-600" />}
                                Nota para {noteType === 'plant' ? 'Planta' : 'Casa'}
                            </h3>
                            <button
                                onClick={() => setIsNotesModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500 mb-2">
                                Fecha: {new Date(targetDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <textarea
                                value={currentNote}
                                onChange={(e) => setCurrentNote(e.target.value)}
                                className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-700 text-sm resize-none"
                                placeholder="Escribe una nota aquí..."
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsNotesModalOpen(false)}
                                className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveNote}
                                disabled={savingNote}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-[0.95]"
                            >
                                {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar Nota
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
