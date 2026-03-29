import { useState, useRef, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import VoiceControls from '../voice/VoiceControls';
import { streamChat, fileToBase64 } from '../../services/ollamaService';
import { speak, stopSpeaking, enqueueSpeech, startListening as startSTT, stopListening as stopSTT, isSTTSupported } from '../../services/voiceService';

export default function ChatPanel() {
    const {
        messages, addMessage, updateLastMessage,
        sessions, currentSession, isAiTyping, setIsAiTyping,
        saveMessage, toggleSidebar, setIsSpeaking,
        isSpeaking, isListening, setIsListening,
        selectedModel, userName, isInterviewMode,
        interviewStarted, setInterviewStarted
    } = useAppStore();

    const [input, setInput] = useState('');
    const [attachedImage, setAttachedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [showSummary, setShowSummary] = useState(false);

    // Voice Call Mode States
    const [isCallMode, setIsCallMode] = useState(false);
    const [triggerRestart, setTriggerRestart] = useState(false);

    const messagesEndRef = useRef(null);
    const abortRef = useRef(null);
    const inputRef = useRef(null);
    const isProcessingRef = useRef(false); // keep local ref for sub-tick protection
    const currentRequestIdRef = useRef(0);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-enable Voice Call for Interview Mode
    useEffect(() => {
        if (isInterviewMode && interviewStarted) {
            setIsCallMode(true);
        }
    }, [isInterviewMode, interviewStarted]);

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
        if (!currentSession) return;

        store.setIsProcessing(true);

        // Clear input state immediately
        setInput('');
        const currentImage = attachedImage;
        const currentPreview = imagePreview;
        setAttachedImage(null);
        setImagePreview(null);

        try {
            // 1. Save and add User message (saveMessage internally calls addMessage)
            const userMsg = await saveMessage(currentSession.id, 'user', trimmed, currentPreview);

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

            // Critical: clear queue and start speaking indicator
            speak('', () => setIsSpeaking(true), () => setIsSpeaking(false));

            let spokenLength = 0;
            const fullResponse = await streamChat(
                chatHistory,
                (partial) => {
                    if (requestId !== currentRequestIdRef.current) return;
                    updateLastMessage(partial);

                    // Improved Sentence Splitting Logic
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
                },
                abortRef.current.signal,
                selectedModel,
                { isInterviewMode: store.isInterviewMode, jobDescription: store.activeJobDescription }
            );

            if (requestId === currentRequestIdRef.current) {
                const remainingText = fullResponse.substring(spokenLength);
                if (remainingText.trim()) {
                    enqueueSpeech(remainingText);
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                updateLastMessage(`⚠️ Connection Error: ${err.message}`);
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
        if (abortRef.current) abortRef.current.abort();
        stopSpeaking();
    };

    return (
        <div className={`flex flex-col h-full bg-transparent ${isInterviewMode ? 'border-none' : ''}`}>
            {/* Header - Hide in Interview Mode */}
            {!isInterviewMode && (
                <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-sm font-semibold text-zinc-50">{currentSession?.title || 'New Chat'}</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{selectedModel}</p>
                    </div>
                    {isSTTSupported() && (
                        <button
                            onClick={() => setIsCallMode(!isCallMode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${isCallMode ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-50'}`}
                        >
                            {isCallMode ? 'End Call' : 'Voice Call'}
                        </button>
                    )}
                </header>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
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
                <div ref={messagesEndRef} />
            </div>

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
                    {isAiTyping ? (
                        <button onClick={handleStopGeneration} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all border border-rose-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                        </button>
                    ) : (
                        <button onClick={() => handleSend()} disabled={!input.trim() && !attachedImage} className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-20 flex-shrink-0 shadow-lg shadow-white/5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
