import { useState, useRef, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import VoiceControls from '../voice/VoiceControls';
import { streamChat, fileToBase64, extractMermaidDiagram, extract3DCode, isGeminiModel, listLocalModels, POPULAR_GEMINI_MODELS } from '../../services/aiService';
import { speak, stopSpeaking, enqueueSpeech, startListening as startSTT, stopListening as stopSTT, isSTTSupported } from '../../services/voiceService';

export default function ChatPanel() {
    const {
        messages, addMessage, updateLastMessage,
        sessions, currentSession, isAiTyping, setIsAiTyping,
        saveMessage, toggleSidebar, setIsSpeaking,
        isSpeaking, isListening, setIsListening,
        selectedModel, setSelectedModel, userName, isInterviewMode,
        interviewStarted, setInterviewStarted,
        isVisualizeMode, activeConcept, setBoardDiagram,
        activeBoardDiagram, isAvatarEnabled, toggleAvatarEnabled,
        localModels, setLocalModels
    } = useAppStore();

    const [input, setInput] = useState('');
    const [attachedImage, setAttachedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [showSummary, setShowSummary] = useState(false);

    // Voice Call Mode States
    const [isCallMode, setIsCallMode] = useState(false);
    const [triggerRestart, setTriggerRestart] = useState(false);

    const chatContainerRef = useRef(null);
    const abortRef = useRef(null);
    const inputRef = useRef(null);
    const isProcessingRef = useRef(false); // keep local ref for sub-tick protection
    const currentRequestIdRef = useRef(0);
    const isAutoScrollLockedRef = useRef(false);

    // Detect if user has scrolled up away from bottom
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        isAutoScrollLockedRef.current = distanceFromBottom > 90;
    };

    useEffect(() => {
        if (chatContainerRef.current && !isAutoScrollLockedRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isAiTyping]);

    // Auto-enable Voice Call for Interview Mode
    useEffect(() => {
        if (isInterviewMode && interviewStarted) {
            setIsCallMode(true);
        }
    }, [isInterviewMode, interviewStarted]);

    // Fetch local Ollama models on mount if needed
    useEffect(() => {
        if (!localModels || localModels.length === 0) {
            listLocalModels().then((models) => {
                if (models && models.length > 0) {
                    setLocalModels(models);
                }
            }).catch(() => {});
        }
    }, []);

    // Cleanup state when session changes
    useEffect(() => {
        setInput('');
        setAttachedImage(null);
        setImagePreview(null);
        if (abortRef.current) {
            abortRef.current.abort();
        }
    }, [currentSession?.id]);

    // Auto-start Interview Trigger
    useEffect(() => {
        if (isInterviewMode && interviewStarted && messages.length === 0 && !isAiTyping) {
            handleSend("Let's begin the interview. Please introduce yourself and ask the first question.");
            setInterviewStarted(false);
        }
    }, [isInterviewMode, interviewStarted, messages.length, isAiTyping]);

    // Auto-start Visualize Class Trigger
    useEffect(() => {
        const store = useAppStore.getState();
        if (isVisualizeMode && activeConcept && messages.length === 0 && !isAiTyping && !activeBoardDiagram && !store.active3DCode) {
            if (store.visualDimension === '3d') {
                handleSend(`Create an interactive 3D spatial model for "${activeConcept}". Output verified Three.js scene code inside a javascript code block with animated kinematics.`);
            } else {
                handleSend(`Teach me about "${activeConcept}". Draw a detailed 2D visual schematic or Mermaid diagram on the blackboard and explain it step-by-step.`);
            }
        }
    }, [isVisualizeMode, activeConcept, messages.length, isAiTyping, activeBoardDiagram]);

    // Real-time Voice-to-Voice Loop
    useEffect(() => {
        if (!isCallMode) {
            if (isListening) {
                stopSTT();
                setIsListening(false);
            }
            return;
        }

        // Auto-start Mic when AI is done processing and speaking
        if (!isAiTyping && !isSpeaking && !isListening) {
            // Adaptive Delay: 2.5s for dynamic interviews, 700ms for quick chat
            const thinkingDelay = isInterviewMode ? 2500 : 700;

            const timer = setTimeout(() => {
                setIsListening(true);
                startSTT(
                    (text, isFinal) => {
                        setInput(text);
                    },
                    (finalText) => {
                        setIsListening(false);
                        if (finalText && finalText.trim()) {
                            handleSend(finalText);
                            setInput('');
                        } else if (isCallMode) {
                            setTriggerRestart(p => !p); // Restart loop if silence
                        }
                    },
                    (err) => {
                        setIsListening(false);
                        if (isCallMode) {
                            if (err === 'not-allowed') {
                                setIsCallMode(false);
                            } else {
                                setTriggerRestart(p => !p); // Auto-recover
                            }
                        }
                    }
                );
            }, thinkingDelay);

            return () => {
                clearTimeout(timer);
                stopSTT();
                setIsListening(false);
            };
        }
    }, [isCallMode, isAiTyping, isSpeaking, triggerRestart, isInterviewMode]);

    const handleSend = async (text = input) => {
        const store = useAppStore.getState();
        if (store.isProcessing) return;
        const trimmed = typeof text === 'string' ? text.trim() : '';
        if (!trimmed && !attachedImage) return;

        let activeSession = currentSession;
        if (!activeSession) {
            activeSession = store.createSession();
        }

        store.setIsProcessing(true);
        isAutoScrollLockedRef.current = false;

        // Clear input state immediately
        setInput('');
        const currentImage = attachedImage;
        const currentPreview = imagePreview;
        setAttachedImage(null);
        setImagePreview(null);

        try {
            // Update session title if default
            if (activeSession.title === 'New Chat' && trimmed) {
                const newTitle = trimmed.length > 25 ? trimmed.substring(0, 25) + '...' : trimmed;
                const updatedSessions = store.sessions.map(s => s.id === activeSession.id ? { ...s, title: newTitle } : s);
                store.setSessions(updatedSessions);
            }

            // 1. Save and add User message (saveMessage internally calls addMessage)
            const userMsg = await saveMessage(activeSession.id, 'user', trimmed, currentPreview);

            // 2. Prepare history for Ollama
            const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
            chatHistory.push({ role: 'user', content: trimmed });

            if (currentImage) {
                try {
                    const base64 = await fileToBase64(currentImage);
                    chatHistory[chatHistory.length - 1].images = [base64];
                } catch (e) {
                    console.error('Image encoding error:', e);
                }
            }

            // 3. Add placeholder assistant message with metadata
            setIsAiTyping(true);
            addMessage({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                created_at: new Date().toISOString()
            });

            const requestId = ++currentRequestIdRef.current;
            if (abortRef.current) abortRef.current.abort();
            abortRef.current = new AbortController();

            // Only speak automatically if 3D Avatar is enabled or in Call Mode
            const shouldAutoSpeak = (isAvatarEnabled || isCallMode);
            if (shouldAutoSpeak) {
                speak('', () => setIsSpeaking(true), () => setIsSpeaking(false));
            }

            let spokenLength = 0;
            const fullResponse = await streamChat(
                chatHistory,
                (partial) => {
                    if (requestId !== currentRequestIdRef.current) return;
                    updateLastMessage(partial);

                    // Extract and update live Mermaid whiteboard diagram or SVG if present
                    const liveDiagram = extractMermaidDiagram(partial);
                    if (liveDiagram) {
                        store.setBoardDiagram(liveDiagram);
                    }

                    // Extract and update live 3D Three.js code if in 3D mode
                    const live3D = extract3DCode(partial);
                    if (live3D) {
                        store.setActive3DCode(live3D);
                    }

                    // Improved Sentence Splitting Logic
                    if (shouldAutoSpeak) {
                        let workingText = partial.substring(spokenLength);
                        const sentenceRegex = /[^.?!]+[.?!](?:\s+|$)/g;
                        let match;

                        while ((match = sentenceRegex.exec(workingText)) !== null) {
                            const sentence = match[0];
                            if (sentence.trim()) {
                                enqueueSpeech(sentence);
                                spokenLength += (match.index + sentence.length);
                                // Adjust workingText for the next possible match in SAME chunk
                                workingText = partial.substring(spokenLength);
                                sentenceRegex.lastIndex = 0;
                            }
                        }
                    }
                },
                abortRef.current.signal,
                selectedModel,
                {
                    isInterviewMode: store.isInterviewMode,
                    jobDescription: store.activeJobDescription,
                    isVisualizeMode: store.isVisualizeMode,
                    visualDimension: store.visualDimension,
                    activeConcept: store.activeConcept
                }
            );

            if (requestId === currentRequestIdRef.current) {
                const finalDiagram = extractMermaidDiagram(fullResponse);
                if (finalDiagram) {
                    store.setBoardDiagram(finalDiagram);
                }

                const final3D = extract3DCode(fullResponse);
                if (final3D) {
                    store.setActive3DCode(final3D);
                }

                if (shouldAutoSpeak) {
                    const remainingText = fullResponse.substring(spokenLength);
                    if (remainingText.trim()) {
                        enqueueSpeech(remainingText);
                    }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                updateLastMessage(`Connection Error: ${err.message}`);
            }
        } finally {
            setIsAiTyping(false);
            useAppStore.getState().setIsProcessing(false);
            abortRef.current = null;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleImageSelect = (file) => {
        setAttachedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const handleVoiceResult = (transcript) => {
        if (transcript) {
            setInput(transcript);
            // Focus and adjust height
            if (inputRef.current) {
                inputRef.current.focus();
                // Manually trigger height adjustment
                setTimeout(() => {
                    inputRef.current.style.height = 'auto';
                    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
                }, 0);
            }
        }
    };

    const handleStopGeneration = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        stopSpeaking();
        setIsSpeaking(false);
        setIsAiTyping(false);
        useAppStore.getState().setIsProcessing(false);
    };

    return (
        <div className={`flex flex-col h-full bg-transparent ${isInterviewMode ? 'border-none' : ''}`}>
            {/* Header - Hide in Interview Mode */}
            {!isInterviewMode && (
                <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm flex-shrink-0">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-semibold text-zinc-50 truncate">{currentSession?.title || 'New Chat'}</h1>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="relative inline-flex items-center">
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="appearance-none bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-medium text-[11px] rounded-lg pl-2 pr-6 py-1 cursor-pointer transition-all focus:outline-none focus:border-blue-500"
                                    title="Switch between Google Gemini & Local AI models"
                                >
                                    <optgroup label="✨ Google GenAI (Cloud)">
                                        {POPULAR_GEMINI_MODELS.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.tag})
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="💻 Local AI (Ollama)">
                                        {localModels && localModels.length > 0 ? (
                                            localModels.map((m) => (
                                                <option key={m.name} value={m.name}>
                                                    {m.name} (Local)
                                                </option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="qwen2.5-coder:7b">Qwen 2.5 Coder 7B (Local)</option>
                                                <option value="qwen3-vl:4b">Qwen 3 VL 4B (Local)</option>
                                                <option value="llama3.2:3b">Llama 3.2 3B (Local)</option>
                                                <option value="mistral:latest">Mistral 7B (Local)</option>
                                            </>
                                        )}
                                    </optgroup>
                                </select>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2 pointer-events-none text-zinc-500"><path d="m6 9 6 6 6-6" /></svg>
                            </div>

                            {isGeminiModel(selectedModel) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    Google Cloud
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Local Offline
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 3D Assistant Toggle */}
                        <button
                            onClick={toggleAvatarEnabled}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${isAvatarEnabled
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                }`}
                            title={isAvatarEnabled ? 'Turn 3D Assistant OFF' : 'Turn 3D Assistant ON'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                            <span>3D {isAvatarEnabled ? 'ON' : 'OFF'}</span>
                        </button>

                        {isSTTSupported() && (
                            <button
                                onClick={() => setIsCallMode(!isCallMode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${isCallMode ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-50'}`}
                            >
                                {isCallMode ? 'End Call' : 'Voice Call'}
                            </button>
                        )}
                    </div>
                </header>
            )}

            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6 max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 flex items-center justify-center">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                        </div>
                        <h2 className={`${isInterviewMode ? 'text-sm' : 'text-xl'} font-bold text-zinc-50 mb-2`}>
                            {isInterviewMode ? 'Connecting with Recruiter...' : `Welcome, ${userName || 'Friend'}`}
                        </h2>
                        <p className="text-zinc-500 text-xs leading-relaxed mb-10">
                            {isInterviewMode ? 'The AI is preparing your first interview question.' : 'How can I help you learn or build today?'}
                        </p>

                        {!isInterviewMode && (
                            <div className="grid grid-cols-1 gap-2 w-full">
                                {[
                                    'Mock interview: React Developer',
                                    'Explain neural networks simply',
                                    'Python script to scrape data',
                                    'Quiz me on modern history'
                                ].map((text, i) => (
                                    <button key={i} onClick={() => handleSend(text)} className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-50 transition-all text-left">
                                        {text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {messages.map((msg, i) => (
                    <ChatMessage key={i} message={msg} isTyping={isAiTyping && i === messages.length - 1 && msg.role === 'assistant'} />
                ))}
            </div>

            {/* Stop Pill when AI is generating or speaking */}
            {(isAiTyping || isSpeaking) && (
                <div className="px-4 pb-2 flex justify-center">
                    <button
                        onClick={handleStopGeneration}
                        className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-500/60 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-[1.02] group animate-fade-in"
                    >
                        <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 group-hover:scale-90 transition-transform" />
                        <span>{isAiTyping ? 'Stop Generating' : 'Stop Speaking'}</span>
                    </button>
                </div>
            )}

            {imagePreview && (
                <div className="px-4 pb-2">
                    <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                        <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                        <button onClick={() => { setAttachedImage(null); setImagePreview(null); }} className="p-1 hover:text-rose-500 text-zinc-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <ImageUpload onImageSelect={handleImageSelect} />
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Tyloop..."
                            rows={1}
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all resize-none text-sm leading-relaxed"
                            style={{ minHeight: '44px', maxHeight: '150px' }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                            }}
                        />
                    </div>
                    <VoiceControls onResult={handleVoiceResult} />
                    {(isAiTyping || isSpeaking) ? (
                        <button
                            onClick={handleStopGeneration}
                            title={isAiTyping ? "Stop generating" : "Stop speaking"}
                            className="p-3 bg-rose-500/15 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/25 transition-all border border-rose-500/30 flex-shrink-0 shadow-lg shadow-rose-500/10 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="6" width="12" height="12" rx="2" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() && !attachedImage}
                            className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-20 flex-shrink-0 shadow-lg shadow-white/5"
                            title="Send message"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
