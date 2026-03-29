import useAppStore from '../../stores/appStore';

export default function Sidebar() {
    const {
        sidebarOpen, toggleSidebar,
        sessions, currentSession, setCurrentSession, loadSessionMessages,
        createSession, deleteSession, signOut, setCurrentPage, profile
    } = useAppStore();

    const handleSessionClick = async (session) => {
        setCurrentSession(session);
        await loadSessionMessages(session.id);
        if (window.innerWidth < 1024) toggleSidebar();
    };

    const handleNewChat = async () => {
        await createSession();
    };

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={toggleSidebar}
                />
            )}

            <aside
                className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0 fixed lg:relative z-50 lg:z-0 h-full w-[260px] bg-[#09090b] border-r border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out`}
            >
                {/* Header */}
                <div className="p-4 flex items-center gap-2 mb-2 mt-2">
                    <div className="w-6 h-6 rounded-full border border-zinc-500 flex items-center justify-center">
                        <div className="w-3 h-3 bg-zinc-50 rounded-full" />
                    </div>
                    <span className="font-semibold text-sm tracking-tight text-zinc-50">Dhanvantari AI</span>
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden ml-auto p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="px-3 pb-4">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        New Consult
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
                    <div>
                        <h4 className="px-2 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Consultations</h4>
                        <div className="space-y-1 mt-1">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="group relative"
                                >
                                    <button
                                        onClick={() => handleSessionClick(session)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center gap-3 pr-10 ${currentSession?.id === session.id
                                            ? 'bg-zinc-800 text-zinc-50'
                                            : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-50'
                                            }`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        <span className="truncate flex-1">{session.title}</span>
                                        <span className="text-[10px] opacity-30 shrink-0 group-hover:hidden">
                                            {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Delete this consultation?')) {
                                                deleteSession(session.id);
                                            }
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Session"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                    </button>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <p className="text-[11px] text-zinc-600 text-center py-4">No sessions yet.</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="px-2 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Health Hub</h4>
                        <nav className="space-y-1">
                            <button
                                onClick={() => setCurrentPage('profile')}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-50 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                <span>Health Profile</span>
                            </button>
                            <button
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-50 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                <span>Medical Records</span>
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Bottom nav */}
                <div className="p-4 border-t border-zinc-800 mt-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium border border-zinc-700">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-zinc-100">{profile?.full_name || 'Patient'}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{profile?.email}</p>
                        </div>
                    </div>
                    <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-md text-sm transition-colors border border-zinc-800 hover:border-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
