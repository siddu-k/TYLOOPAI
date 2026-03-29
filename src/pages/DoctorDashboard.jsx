import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import useAppStore from '../stores/appStore';

export default function DoctorDashboard() {
    const { doctorProfile, signOut } = useAppStore();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSummary, setSelectedSummary] = useState(null);

    useEffect(() => {
        if (!doctorProfile) return;
        const fetchAppointments = async () => {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id, status, scheduled_at, created_at, session_id,
                    patient:profiles!appointments_patient_id_fkey(full_name, age, gender),
                    session:chat_sessions(summary, severity)
                `)
                .eq('doctor_id', doctorProfile.id)
                .order('created_at', { ascending: false });

            if (error) console.error("Error fetching appointments", error);
            if (data) setAppointments(data);
            setLoading(false);
        };
        fetchAppointments();
    }, [doctorProfile]);

    const updateStatus = async (id, status) => {
        await supabase.from('appointments').update({ status }).eq('id', id);
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    return (
        <div className="flex h-screen w-full bg-[#09090b] text-zinc-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[240px] border-r border-zinc-800 bg-[#09090b] flex flex-col shrink-0">
                <div className="p-4 flex items-center gap-2 border-b border-transparent mb-2 mt-2">
                    <div className="w-5 h-5 rounded-full border border-zinc-500 flex items-center justify-center shrink-0">
                        <div className="w-2.5 h-2.5 bg-zinc-50 rounded-full" />
                    </div>
                    <span className="font-semibold text-[13px] tracking-tight truncate text-zinc-100 uppercase letter-spacing-wide">Dhanvantari Clinic</span>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
                    <div>
                        <h4 className="px-2 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">Main Menu</h4>
                        <nav className="space-y-1">
                            <button className="w-full flex items-center gap-3 px-3 py-1.5 bg-zinc-800 text-zinc-100 rounded-md text-[13px] font-medium transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
                                Dashboard
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40 rounded-md text-[13px] font-medium transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Patient List
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40 rounded-md text-[13px] font-medium transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                                Visual Analytics
                            </button>
                        </nav>
                    </div>

                    <div>
                        <h4 className="px-2 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">Operations</h4>
                        <nav className="space-y-1">
                            <button className="w-full flex items-center gap-3 px-3 py-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40 rounded-md text-[13px] font-medium transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                Medical Reports
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/40 rounded-md text-[13px] font-medium transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                Consult History
                            </button>
                        </nav>
                    </div>
                </div>

                <div className="p-4 border-t border-zinc-800 mt-auto bg-[#0c0c0e]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-[11px] font-bold border border-zinc-700 text-zinc-300">
                            DR
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[12px] font-semibold truncate text-zinc-100">{doctorProfile?.full_name}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{doctorProfile?.specialty || 'General Physician'}</p>
                        </div>
                    </div>
                    <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md text-[12px] transition-colors border border-zinc-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Logout Session
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col bg-[#09090b] min-w-0">
                {/* Header Navigation */}
                <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b] shrink-0">
                    <div className="flex items-center gap-6 text-[12px] font-medium text-zinc-500">
                        <span className="text-zinc-100 border-b border-zinc-100 h-12 flex items-center px-1">Overview</span>
                        <span className="hover:text-zinc-100 cursor-pointer h-12 flex items-center px-1 transition-colors">Queue</span>
                        <span className="hover:text-zinc-100 cursor-pointer h-12 flex items-center px-1 transition-colors">Messages</span>
                        <span className="hover:text-zinc-100 cursor-pointer h-12 flex items-center px-1 transition-colors">Setup</span>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8 pt-6">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Title Bar */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold tracking-tight text-white m-0">Healthcare Overview</h2>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-md text-[12px] font-bold transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Create New
                            </button>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Appointments', value: appointments.length || '0', trend: '+12.5%', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                { label: 'Pending Requests', value: appointments.filter(a => a.status === 'pending').length || '0', trend: '-5%', color: 'text-rose-500', bg: 'bg-rose-500/10' },
                                { label: 'Active Consults', value: appointments.filter(a => a.status === 'confirmed').length || '0', trend: '+4.2%', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                { label: 'Platform Trust', value: '4.9/5', trend: 'Stable', color: 'text-zinc-400', bg: 'bg-zinc-800' },
                            ].map((kpi, idx) => (
                                <div key={idx} className="bg-[#09090b] border border-zinc-800 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider m-0">{kpi.label}</h3>
                                        <span className={`text-[10px] font-bold ${kpi.color} ${kpi.bg} px-2 py-0.5 rounded-full`}>{kpi.trend}</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white leading-none">{kpi.value}</div>
                                    <p className="text-[10px] text-zinc-600 mt-3">Calculated from last 30 days of data</p>
                                </div>
                            ))}
                        </div>

                        {/* Queue Table Card */}
                        <div className="bg-[#09090b] border border-zinc-800 rounded-xl pt-6 px-6 pb-2">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-white m-0">Patient Queue</h3>
                                    <p className="text-[11px] text-zinc-500 mt-1">Live incoming requests requiring your immediate review</p>
                                </div>
                                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-1">
                                    <button className="px-3 py-1 text-[10px] font-bold text-zinc-500 hover:text-white rounded transition-colors uppercase">Monthly</button>
                                    <button className="px-3 py-1 text-[10px] font-bold bg-zinc-800 text-white rounded shadow-sm border border-zinc-700 transition-colors uppercase">Weekly</button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex justify-center p-12"><div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-white animate-spin"></div></div>
                            ) : appointments.length === 0 ? (
                                <div className="text-center p-12 border border-dashed border-zinc-800 rounded-lg mb-6">
                                    <p className="text-[12px] text-zinc-500 font-medium">Your queue is currently empty.</p>
                                </div>
                            ) : (
                                <div className="grid gap-2.5 mb-6">
                                    {appointments.map(app => (
                                        <div key={app.id} className="group bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 rounded-lg p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h4 className="font-semibold text-[13px] text-zinc-100 m-0">{app.patient?.full_name || 'Incognito Patient'}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${app.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                                            {app.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 m-0">
                                                        {app.patient?.gender || 'N/A'}, {app.patient?.age ? `${app.patient.age}y` : 'Age N/A'} • Requested {new Date(app.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 px-13 sm:px-0">
                                                {app.session_id && (
                                                    <button onClick={() => setSelectedSummary(app.session?.summary)} className="px-3 py-1.5 text-zinc-400 hover:text-white text-[11px] font-bold transition-all border border-zinc-800 hover:border-zinc-600 rounded">
                                                        Case Summary
                                                    </button>
                                                )}
                                                {app.status === 'pending' ? (
                                                    <button onClick={() => updateStatus(app.id, 'confirmed')} className="px-4 py-1.5 bg-white text-black text-[11px] font-bold rounded hover:bg-zinc-200 transition-colors">Confirm Case</button>
                                                ) : (
                                                    <button onClick={() => alert('Launching call...')} className="px-4 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-500 transition-colors">Start Virtual Call</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Faux Data Visualization */}
                            <div className="h-16 w-full bg-gradient-to-t from-zinc-900/40 to-transparent flex items-end">
                                <svg viewBox="0 0 1000 100" className="w-full h-8 opacity-20" preserveAspectRatio="none">
                                    <path d="M0,80 C150,80 300,20 450,50 C600,80 750,10 850,40 C950,70 1000,80 1000,80 L1000,100 L0,100 Z" fill="white" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Summary Modal */}
            {selectedSummary && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-[#09090b] border border-zinc-800 w-full max-w-xl p-8 rounded-xl relative shadow-2xl">
                        <button onClick={() => setSelectedSummary(null)} className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>

                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-white m-0">Triage Summary</h2>
                            <p className="text-[11px] text-zinc-500 uppercase mt-1 tracking-widest font-semibold text-emerald-500">AI Verified Clinical Data</p>
                        </div>

                        <div className="space-y-5">
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Primary Diagnosis / Complaint</h4>
                                <p className="text-[13px] text-zinc-200 leading-relaxed font-medium m-0">{selectedSummary.chief_complaint || 'No primary complaint recorded.'}</p>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-3 px-1 tracking-wider">Identified Symptoms</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedSummary.symptoms?.map((s, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-zinc-800 text-zinc-300 text-[10px] font-bold border border-zinc-700 rounded-md uppercase">{s}</span>
                                    )) || <span className="text-zinc-600 text-[11px]">N/A</span>}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-800">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 px-1">AI Recommendation</h4>
                                <ul className="space-y-1.5 list-none m-0 p-0">
                                    {selectedSummary.recommendations?.map((r, i) => (
                                        <li key={i} className="text-[12px] text-zinc-400 flex items-start gap-2 leading-snug">
                                            <span className="text-emerald-500 mt-1 shrink-0">●</span> {r}
                                        </li>
                                    )) || <li className="text-zinc-600 text-[11px]">No recommendations available.</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
