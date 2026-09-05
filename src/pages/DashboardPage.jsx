import { useEffect, useState, useRef, Suspense } from 'react';
import useAppStore from '../stores/appStore';
import Sidebar from '../components/ui/Sidebar';
import ChatPanel from '../components/chat/ChatPanel';
import AvatarScene from '../components/avatar/AvatarScene';
import InterviewSetup from '../components/interview/InterviewSetup';
import UserVideo from '../components/interview/UserVideo';
import MermaidBoard from '../components/visualize/MermaidBoard';
import CanvasEngine3D from '../components/visualize/CanvasEngine3D';
import VisualizeSetup from '../components/visualize/VisualizeSetup';
import Visualize2DSetup from '../components/visualize/Visualize2DSetup';
import Visualize3DSetup from '../components/visualize/Visualize3DSetup';
import AvatarCustomizerModal from '../components/avatar/AvatarCustomizerModal';
import PptSetupModal from '../components/ppt/PptSetupModal';
import PptDeckViewer from '../components/ppt/PptDeckViewer';
import QuizSetupModal from '../components/quiz/QuizSetupModal';
import QuizViewer from '../components/quiz/QuizViewer';

function ResizeDivider({ onMouseDown }) {
    return (
        <div
            onMouseDown={onMouseDown}
            className="group relative z-30 flex items-center justify-center cursor-col-resize hover:bg-emerald-500/10 active:bg-emerald-500/20 transition-all select-none w-2.5 -mx-1.5 flex-shrink-0"
            title="Drag to resize panels"
        >
            <div className="w-[1px] h-full bg-zinc-800 group-hover:bg-emerald-500/80 transition-colors" />
            <div className="absolute w-3.5 h-9 rounded-md bg-zinc-900 border border-zinc-700 group-hover:border-emerald-400 group-hover:scale-110 flex items-center justify-center gap-0.5 shadow-xl transition-all">
                <div className="w-[1.5px] h-3 bg-zinc-500 group-hover:bg-emerald-400 rounded-full" />
                <div className="w-[1.5px] h-3 bg-zinc-500 group-hover:bg-emerald-400 rounded-full" />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const {
        fetchSessions, isInterviewMode, exitInterview,
        isVisualizeMode, exitVisualizeMode, activeBoardTitle,
        visualDimension, setVisualDimension, active3DCode,
        isPptMode, exitPptMode, activePptDeck,
        isQuizMode, exitQuizMode, activeQuiz,
        currentPage, setCurrentPage, interviewStarted,
        isListening, isAiTyping, isSpeaking, isAvatarEnabled
    } = useAppStore();

    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

    // Resizable Pane Widths
    const [visSplitPercent, setVisSplitPercent] = useState(() => {
        const saved = localStorage.getItem('tyloop_vis_split');
        return saved ? Number(saved) : 63;
    });

    const [stdAvatarWidth, setStdAvatarWidth] = useState(() => {
        const saved = localStorage.getItem('tyloop_std_avatar_width');
        return saved ? Number(saved) : 420;
    });

    const [interviewChatWidth, setInterviewChatWidth] = useState(() => {
        const saved = localStorage.getItem('tyloop_interview_chat_width');
        return saved ? Number(saved) : 400;
    });

    const isResizingRef = useRef(false);

    // Draggable Resizing for Visualize Mode (Blackboard vs Chat)
    const startResizeVisualize = (e) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            if (!isResizingRef.current) return;
            const containerWidth = window.innerWidth;
            const newPercent = (moveEvent.clientX / containerWidth) * 100;
            const clamped = Math.min(82, Math.max(25, Number(newPercent.toFixed(1))));
            setVisSplitPercent(clamped);
            localStorage.setItem('tyloop_vis_split', clamped);
        };

        const onMouseUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Draggable Resizing for Standard Mode (Chat vs 3D Avatar)
    const startResizeStandard = (e) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            if (!isResizingRef.current) return;
            const newWidth = window.innerWidth - moveEvent.clientX;
            const clamped = Math.min(650, Math.max(260, newWidth));
            setStdAvatarWidth(clamped);
            localStorage.setItem('tyloop_std_avatar_width', clamped);
        };

        const onMouseUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Draggable Resizing for Interview Mode (Video Grid vs Transcript)
    const startResizeInterview = (e) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            if (!isResizingRef.current) return;
            const newWidth = window.innerWidth - moveEvent.clientX;
            const clamped = Math.min(600, Math.max(280, newWidth));
            setInterviewChatWidth(clamped);
            localStorage.setItem('tyloop_interview_chat_width', clamped);
        };

        const onMouseUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const isSpecialStage = isInterviewMode || isVisualizeMode || isPptMode || isQuizMode;

    return (
        <div className="h-full w-full flex overflow-hidden bg-[#09090b] text-zinc-50">
            {/* Sidebar - Purely standard mode */}
            {!isSpecialStage && <Sidebar />}

            <div className="flex-1 flex min-w-0 h-full relative">

                {isQuizMode ? (
                    // ─── AI ASSESSMENT & QUIZ STUDIO (QUIZ MODE) ───
                    <div className="flex-1 flex h-full overflow-hidden animate-in fade-in duration-500">
                        <QuizViewer />
                    </div>
                ) : isPptMode ? (
                    // ─── AI SLIDE DECK STUDIO (PPT MODE) ───
                    <div className="flex-1 flex h-full overflow-hidden animate-in fade-in duration-500">
                        <PptDeckViewer />
                    </div>
                ) : isVisualizeMode ? (
                    // ─── VISUALIZE MODE (TEACHER & SMART BOARD STAGE) ───
                    <div className="flex-1 flex h-full overflow-hidden animate-in fade-in duration-500">
                        {/* Left / Center Stage: Interactive Blackboard (Resizable) */}
                        <div
                            style={{ width: `${visSplitPercent}%` }}
                            className="p-5 flex flex-col gap-4 bg-zinc-950 min-w-[250px] overflow-hidden"
                        >
                            {/* Classroom Top Banner */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                                            Visual Classroom
                                        </span>
                                    </div>

                                    {/* Dimension Switcher: Basic Mermaid | 2D Vector | 3D Spatial */}
                                    <div className="flex items-center bg-black/50 border border-zinc-800 rounded-xl p-0.5">
                                        <button
                                            onClick={() => setVisualDimension('basic')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                                visualDimension === 'basic' || !visualDimension
                                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <span>Basic Mermaid</span>
                                        </button>
                                        <button
                                            onClick={() => setVisualDimension('2d')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                                visualDimension === '2d'
                                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <span>2D Vector</span>
                                        </button>
                                        <button
                                            onClick={() => setVisualDimension('3d')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                                visualDimension === '3d'
                                                    ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                            <span>3D Spatial</span>
                                        </button>
                                    </div>

                                    {isSpeaking && (
                                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                                            <span className="text-[10px] text-zinc-400 font-medium">Teacher Explaining...</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={exitVisualizeMode}
                                    className="px-5 py-2 bg-zinc-900 hover:bg-emerald-600 hover:text-black text-white text-[11px] font-bold rounded-xl transition-all border border-zinc-800 shadow-xl"
                                >
                                    Exit Classroom
                                </button>
                            </div>

                            {/* Live 2D Board or 3D Spatial Canvas */}
                            <div className="flex-1 min-h-0 relative rounded-2xl border border-zinc-800/80 bg-zinc-950 overflow-hidden">
                                {visualDimension === '3d' ? (
                                    <CanvasEngine3D code={active3DCode} />
                                ) : (
                                    <MermaidBoard />
                                )}
                            </div>
                        </div>

                        {/* Draggable Divider Handle */}
                        <ResizeDivider onMouseDown={startResizeVisualize} />

                        {/* Right Stage: Optional 3D Teacher Avatar (Top) + Interactive Chat / Q&A (Bottom) */}
                        <div
                            style={{ width: `${100 - visSplitPercent}%` }}
                            className="border-l border-zinc-800 bg-[#09090b] flex flex-col shadow-2xl min-w-[280px]"
                        >
                            {/* Teacher 3D Avatar Stage (Only if 3D assistant is ON) */}
                            {isAvatarEnabled && (
                                <div className="h-[220px] relative bg-gradient-to-b from-zinc-900 via-zinc-950 to-[#09090b] border-b border-zinc-800 overflow-hidden flex flex-col flex-shrink-0 group">
                                    <div className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Tyloop Educator</span>
                                    </div>
                                    <button
                                        onClick={() => setIsCustomizerOpen(true)}
                                        className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-emerald-950 border border-white/10 hover:border-emerald-500/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-zinc-300 hover:text-emerald-300 transition-all flex items-center gap-1.5 shadow-lg"
                                        title="Customize 3D Avatar & Voice Tone"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                                        <span>Studio</span>
                                    </button>
                                    <div className="flex-1 relative">
                                        <Suspense fallback={
                                            <div className="h-full w-full flex items-center justify-center">
                                                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        }>
                                            <AvatarScene />
                                        </Suspense>
                                    </div>
                                </div>
                            )}

                            {/* Synchronized Classroom Transcript & Prompt Input */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <ChatPanel />
                            </div>
                        </div>
                    </div>
                ) : isInterviewMode ? (
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
                                        {isAvatarEnabled ? (
                                            <Suspense fallback={
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            }>
                                                <AvatarScene />
                                            </Suspense>
                                        ) : (
                                            <div className="h-full w-full flex flex-col items-center justify-center p-6 space-y-4">
                                                <div className="w-24 h-24 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-2xl">
                                                    <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                                                        <div className={`w-6 h-6 rounded-full bg-rose-500 ${isSpeaking ? 'animate-ping' : ''}`} />
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-white">AI Lead Recruiter</p>
                                                    <p className="text-xs text-zinc-400">Audio Voice Connected</p>
                                                </div>
                                            </div>
                                        )}
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

                        {/* Resize Divider Handle */}
                        <ResizeDivider onMouseDown={startResizeInterview} />

                        {/* Right Sidebar: Conversation Log / Transcript (Resizable) */}
                        <div
                            style={{ width: `${interviewChatWidth}px` }}
                            className="border-l border-zinc-800 bg-[#0c0c0e] flex flex-col shadow-2xl flex-shrink-0 min-w-[280px]"
                        >
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
                        {isAvatarEnabled && (
                            <>
                                <ResizeDivider onMouseDown={startResizeStandard} />
                                <div
                                    style={{ width: `${stdAvatarWidth}px` }}
                                    className="hidden lg:flex flex-col border-l border-zinc-800 bg-zinc-950/50 backdrop-blur-sm relative transition-none flex-shrink-0 min-w-[260px]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 via-transparent to-transparent pointer-events-none" />
                                    <div className="flex-1 relative">
                                        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>}>
                                            <AvatarScene />
                                        </Suspense>
                                    </div>
                                    <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-50">Tyloop AI Assistant</p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">3D Assistant Active</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsCustomizerOpen(true)}
                                            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-emerald-950 border border-zinc-700 hover:border-emerald-500/50 text-[11px] font-bold text-zinc-300 hover:text-emerald-300 transition-all flex items-center gap-1.5 shadow-md"
                                            title="Customize 3D Avatar & Voice Tone"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                                            <span>Customize</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <AvatarCustomizerModal
                isOpen={isCustomizerOpen}
                onClose={() => setIsCustomizerOpen(false)}
            />
            {currentPage === 'quiz' && (
                <QuizSetupModal onClose={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'ppt' && (
                <PptSetupModal onClose={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'interview' && (
                <InterviewSetup onClose={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'visualize' && (
                <VisualizeSetup onClose={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'visualize2d' && (
                <Visualize2DSetup onClose={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'visualize3d' && (
                <Visualize3DSetup onClose={() => setCurrentPage('dashboard')} />
            )}
        </div>
    );
}
