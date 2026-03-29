import { useState, useRef, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import VoiceControls from '../voice/VoiceControls';
import MedicalSummary from '../medical/MedicalSummary';
import { streamChat, fileToBase64 } from '../../services/ollamaService';
import { speak, stopSpeaking, enqueueSpeech, startListening as startSTT, stopListening as stopSTT, isSTTSupported } from '../../services/voiceService';

export default function ChatPanel() {
    const {
        messages, addMessage, updateLastMessage,
        currentSession, isAiTyping, setIsAiTyping,
        saveMessage, toggleSidebar, setIsSpeaking,
        isSpeaking, isListening, setIsListening
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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
            const timer = setTimeout(() => {
                setIsListening(true);
                startSTT(
                    (text, isFinal) => {
                        // Just update the UI text preview as the user speaks.
                        // We will actually send the message in the onEnd callback below.
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
                            // Only drop the call if the user explicitly denied microphone permissions
                            if (err === 'not-allowed') {
                                setIsCallMode(false);
                            } else {
                                setTriggerRestart(p => !p); // Auto-recover from timeouts, aborts, etc.
                            }
                        }
                    }
                );
            }, 600); // Wait slightly after speaking to avoid feedback

            return () => {
                clearTimeout(timer);
                stopSTT();
                setIsListening(false);
            };
        }
    }, [isCallMode, isAiTyping, isSpeaking, triggerRestart]);

    const handleSend = async (text = input) => {
        const trimmed = text.trim();
        if (!trimmed && !attachedImage) return;
        if (!currentSession) return;

        // Clear input
        setInput('');
        const currentImage = attachedImage;
        const currentPreview = imagePreview;
        setAttachedImage(null);
        setImagePreview(null);

        // Add user message
        const userMsg = { role: 'user', content: trimmed, image_url: currentPreview };
        addMessage(userMsg);
        await saveMessage(currentSession.id, 'user', trimmed, currentPreview);

        // Prepare messages for Ollama
        const chatHistory = [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
        }));

        // Add image if attached
        let images = [];
        if (currentImage) {
            try {
                const base64 = await fileToBase64(currentImage);
                images = [base64];
                chatHistory[chatHistory.length - 1].images = images;
            } catch (e) {
                console.error('Image encoding error:', e);
            }
        }

        // Add placeholder AI message
        addMessage({ role: 'assistant', content: '' });
        setIsAiTyping(true);

        try {
            abortRef.current = new AbortController();

            // Initial clear queue and trigger speaking indicator
            speak('', () => setIsSpeaking(true), () => setIsSpeaking(false));

            let spokenLength = 0;
            const fullResponse = await streamChat(
                chatHistory,
                (partial) => {
                    updateLastMessage(partial);

                    // Streaming TTS implementation
                    const newText = partial.substring(spokenLength);
                    // Find sentence boundaries: punctuation followed by space or newline
                    const sentenceEndMatch = newText.match(/([.?!]|\n)\s+/);
                    if (sentenceEndMatch) {
                        const idx = newText.indexOf(sentenceEndMatch[0]) + sentenceEndMatch[0].length;
                        const sentenceToSpeak = newText.substring(0, idx);
                        enqueueSpeech(sentenceToSpeak);
                        spokenLength += sentenceToSpeak.length;
                    }
                },
                abortRef.current.signal
            );

            // Save complete response
            await saveMessage(currentSession.id, 'assistant', fullResponse);

            // Speak any remaining text at the end
            const remainingText = fullResponse.substring(spokenLength);
            if (remainingText.trim()) {
                enqueueSpeech(remainingText);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                updateLastMessage('⚠️ Failed to connect to Dhanvantari AI. Make sure Ollama is running with `qwen3-vl:4b` model.\n\nError: ' + err.message);
            }
        } finally {
            setIsAiTyping(false);
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
            handleSend(transcript);
        }
    };

    const handleStopGeneration = () => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        stopSpeaking();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </button>
                <div className="flex-1">
                    <h1 className="text-sm font-semibold text-foreground">
                        {currentSession?.title || 'Consultation'}
                    </h1>
                    <p className="text-xs text-muted-foreground">AI-Assisted Healthcare Consultation</p>
                </div>

                {isSTTSupported() && (
                    <button
                        onClick={() => setIsCallMode(!isCallMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isCallMode ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 pulse-ring' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                        title={isCallMode ? "End Voice Call" : "Start Hands-free Voice Call"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {isCallMode ? <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /> : <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />}
                        </svg>
                        {isCallMode ? 'End Call' : 'Start Call'}
                    </button>
                )}

                <button
                    onClick={() => setShowSummary(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
                    title="End session &amp; generate summary"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                    Summary
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800">
                            <div className="w-6 h-6 rounded-full border border-zinc-500 flex items-center justify-center">
                                <div className="w-3 h-3 bg-zinc-50 rounded-full" />
                            </div>
                        </div>
                        <h2 className="text-xl font-semibold text-zinc-50 mb-2">Hello! I'm Dhanvantari AI</h2>
                        <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                            Describe your symptoms or upload medical images for AI triage assistance.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-10 max-w-md w-full">
                            {[
                                { text: 'I have a headache' },
                                { text: 'Skin rash analysis' },
                                { text: 'Medical medicine info' },
                                { text: 'See a specialist?' },
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(suggestion.text)}
                                    className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-[13px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all text-center"
                                >
                                    {suggestion.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <ChatMessage key={i} message={msg} isTyping={isAiTyping && i === messages.length - 1 && msg.role === 'assistant'} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {imagePreview && (
                <div className="px-4 pb-2 animate-fade-in">
                    <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-lg p-2">
                        <img src={imagePreview} alt="Attached" className="w-16 h-16 object-cover rounded-md" />
                        <button
                            onClick={() => { setAttachedImage(null); setImagePreview(null); }}
                            className="p-1 hover:bg-background rounded-md transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Input bar */}
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    <ImageUpload onImageSelect={handleImageSelect} />

                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe your symptoms or ask a health question..."
                            rows={1}
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-all resize-none text-[13px] leading-relaxed"
                            style={{ minHeight: '40px', maxHeight: '120px' }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                        />
                    </div>

                    <VoiceControls onResult={handleVoiceResult} />

                    {isAiTyping ? (
                        <button
                            onClick={handleStopGeneration}
                            className="p-2.5 bg-rose-600/10 text-rose-500 rounded-md hover:bg-rose-600/20 transition-colors flex-shrink-0 border border-rose-600/20"
                            title="Stop generation"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() && !attachedImage}
                            className="p-2.5 bg-white text-black rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-10 disabled:grayscale flex-shrink-0"
                            title="Send message"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        </button>
                    )}
                </div>
                <p className="text-center text-xs text-muted-foreground/60 mt-2">
                    Dhanvantari AI provides educational health information, not medical diagnoses.
                </p>
            </div>

            {/* Medical Summary Modal */}
            {showSummary && (
                <MedicalSummary onClose={() => setShowSummary(false)} />
            )}
        </div>
    );
}
