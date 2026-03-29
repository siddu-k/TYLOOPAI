import { useEffect, Suspense } from 'react';
import useAppStore from '../stores/appStore';
import Sidebar from '../components/ui/Sidebar';
import ChatPanel from '../components/chat/ChatPanel';
import AvatarScene from '../components/avatar/AvatarScene';
import InterviewSetup from '../components/interview/InterviewSetup';
import UserVideo from '../components/interview/UserVideo';

export default function DashboardPage() {
    const {
        fetchSessions, isInterviewMode, exitInterview,
        currentPage, setCurrentPage, interviewStarted,
        isListening, isAiTyping
    } = useAppStore();

    useEffect(() => {
        fetchSessions();
    }, []);

    return (
        <div className="h-full w-full flex overflow-hidden bg-[#09090b] text-zinc-50">
            {/* Sidebar - Purely standard mode */}
            {!isInterviewMode && <Sidebar />}

            <div className="flex-1 flex min-w-0 h-full relative">

                {isInterviewMode ? (
                    // ─── INTERVIEW MODE (VIDEO CALL LAYOUT) ───
                    <div className="flex-1 flex h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Center Stage: Video Grid */}
                        <div className="flex-1 p-6 flex flex-col gap-6 bg-zinc-950">
                            {/* Header / Info */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`px-3 py-1 ${isListening ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-full flex items-center gap-2 transition-colors duration-300`}>
                                        <div className={`w-2 h-2 ${isListening ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full animate-pulse`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isListening ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isListening ? 'Listening...' : 'Live Interview'}
                                        </span>
                                    </div>
                                    {isAiTyping && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                                            <span className="text-[10px] text-zinc-400 font-bold uppercase animate-pulse">AI thinking...</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={exitInterview}
                                    className="px-6 py-2 bg-zinc-900 hover:bg-rose-600 text-white text-[11px] font-bold rounded-xl transition-all border border-zinc-800 shadow-xl"
                                >
                                    End Interview
                                </button>
                            </div>

                            {/* Two-Pane Video Grid */}
                            <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                                {/* AI Interviewer Pane */}
                                <div className="relative bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col group transition-all duration-300 hover:border-rose-500/30">
                                    <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Recruiter (Primary)</span>
                                    </div>
                                    <div className="flex-1 relative bg-gradient-to-b from-zinc-900 to-zinc-950">
                                        <Suspense fallback={
                                            <div className="h-full w-full flex items-center justify-center">
                                                <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        }>
                                            <AvatarScene />
                                        </Suspense>
                                    </div>
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-500 w-[15%] animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* User Webcam Pane */}
                                <UserVideo />
                            </div>
                        </div>

                        {/* Right Sidebar: Conversation Log / Transcript */}
                        <div className="w-[400px] border-l border-zinc-800 bg-[#0c0c0e] flex flex-col shadow-2xl">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Interview Transcript</h3>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <ChatPanel />
                            </div>
                        </div>
                    </div>
                ) : (
                    // ─── STANDARD DASHBOARD MODE ───
                    <div className="flex-1 flex min-w-0">
                        <div className="flex-1 min-w-0 flex flex-col">
                            <ChatPanel />
                        </div>
                        <div className="hidden lg:flex w-[400px] xl:w-[480px] flex-col border-l border-zinc-800 bg-zinc-950/50 backdrop-blur-sm relative transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 via-transparent to-transparent pointer-events-none" />
                            <div className="flex-1 relative">
                                <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>}>
                                    <AvatarScene />
                                </Suspense>
                            </div>
                            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-50">Tyloop AI Assistant</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Multipurpose Assistant</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Interview Setup Modal */}
            {currentPage === 'interview' && (
                <InterviewSetup onClose={() => setCurrentPage('dashboard')} />
            )}
        </div>
    );
}
