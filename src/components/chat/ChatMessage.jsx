import { useState, useEffect, useId, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import useAppStore from '../../stores/appStore';
import { renderMermaidFresh, cleanMermaidCode } from '../../services/mermaidCache';

// Helper to request in-depth theory for an exact diagram
function requestDiagramTheory(diagramCode, label = 'Diagram') {
    const { setPendingUserPrompt, activeConcept, activeBoardTitle } = useAppStore.getState();
    const topic = activeConcept || activeBoardTitle || label;
    const cleanSnippet = diagramCode ? diagramCode.trim().slice(0, 2500) : '';
    const prompt = `Please provide a thorough scientific theory and step-by-step technical breakdown for "${topic}" based on this exact diagram:

\`\`\`
${cleanSnippet}
\`\`\`

IMPORTANT INSTRUCTIONS:
- Explain in detail using clear technical prose, bullet points, and equations.
- Do NOT output or repeat any diagram code, SVG code, or Three.js code blocks in your reply. Provide ONLY the scientific theory:
1. Core Theory & Fundamental Governing Principles
2. Step-by-Step Breakdown of each component and its physical/systemic role
3. Dynamic Energy/Mass/Data Transfer mechanisms
4. Key Equations / Physical Laws and Real-World Applications`;

    setPendingUserPrompt({
        prompt,
        autoSend: true
    });
}

function MermaidBlock({ code }) {
    const { openDiagramOnBoard } = useAppStore();
    const id = useId().replace(/:/g, '');
    const [svg, setSvg] = useState('');
    const [error, setError] = useState(null);
    const clean = useMemo(() => cleanMermaidCode(code), [code]);

    useEffect(() => {
        let isMounted = true;
        async function renderMermaid() {
            if (!clean) return;

            const { svg: renderedSvg, error: renderErr } = await renderMermaidFresh(clean, `mermaid-chat-${id}`);
            if (isMounted) {
                if (renderedSvg) {
                    setSvg(renderedSvg);
                    setError(null);
                } else if (renderErr) {
                    setError(renderErr);
                }
            }
        }
        renderMermaid();
        return () => { isMounted = false; };
    }, [clean, id]);

    const handleSendToBoard = () => {
        openDiagramOnBoard(clean, 'Diagram from Chat');
    };

    if (error) {
        return (
            <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 overflow-x-auto my-2">
                <code>{code}</code>
            </pre>
        );
    }

    return (
        <div className="my-3 rounded-2xl overflow-hidden border border-emerald-500/20 bg-zinc-950/80 shadow-xl group">
            <div className="px-3 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Flowchart / Diagram</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => requestDiagramTheory(clean, 'Flowchart / Diagram')}
                        className="text-[11px] font-bold text-blue-300 hover:text-white px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                        title="Generate in-depth technical theory for this exact diagram"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <span>Theory</span>
                    </button>
                    <button
                        onClick={handleSendToBoard}
                        className="text-[10px] font-semibold text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 hover:bg-emerald-950 hover:border-emerald-700/50 border border-zinc-700 rounded-lg transition-all flex items-center gap-1"
                        title="View on Blackboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
                        <span>Open on Board</span>
                    </button>
                </div>
            </div>
            <div
                className="p-4 flex items-center justify-center overflow-x-auto select-none"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            {/* Bottom Action Footer with Theory button below diagram */}
            <div className="px-3 py-2 border-t border-white/5 bg-zinc-950/90 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Want step-by-step scientific theory?</span>
                <button
                    onClick={() => requestDiagramTheory(clean, 'Flowchart / Diagram')}
                    className="px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    title="Generate in-depth technical theory for this exact diagram"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    <span>Theory</span>
                </button>
            </div>
        </div>
    );
}

function SvgBlock({ code }) {
    const { openDiagramOnBoard } = useAppStore();
    const [isReplaying, setIsReplaying] = useState(false);
    const [displaySvg, setDisplaySvg] = useState(code);

    useEffect(() => {
        setDisplaySvg(code);
    }, [code]);

    const handleReplay = () => {
        if (isReplaying) return;
        setIsReplaying(true);

        const cleanSvg = code.trim();
        const startTagEnd = cleanSvg.indexOf('>');
        let currentLength = startTagEnd !== -1 ? startTagEnd + 1 : 20;
        const totalLength = cleanSvg.length;
        const totalDuration = 2200;
        const frameInterval = 30;
        const totalSteps = totalDuration / frameInterval;
        const chunkSize = Math.max(16, Math.ceil(totalLength / totalSteps));

        const timer = setInterval(() => {
            currentLength += chunkSize;
            if (currentLength >= totalLength) {
                setDisplaySvg(cleanSvg);
                setIsReplaying(false);
                clearInterval(timer);
            } else {
                // Ensure chunks only break at tag closures ('>') or whitespace to prevent truncated attribute values
                let chunk = cleanSvg.slice(0, currentLength);
                const lastCloseTag = chunk.lastIndexOf('>');
                if (lastCloseTag > 0) {
                    chunk = chunk.slice(0, lastCloseTag + 1);
                }
                if (chunk.includes('<svg') && !chunk.includes('</svg>')) {
                    chunk += '\n</svg>';
                }
                // Verify chunk is valid XML before setting to DOM
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(chunk, 'image/svg+xml');
                    if (!doc.querySelector('parsererror')) {
                        setDisplaySvg(chunk);
                    }
                } catch (e) {
                    // Ignore transient chunk parse errors during replay
                }
            }
        }, frameInterval);
    };

    return (
        <div className="my-3 rounded-2xl border border-emerald-500/30 bg-zinc-950 p-3 relative group shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold text-emerald-300">2D Vector Schematic</span>
                    {isReplaying && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                            Re-streaming HTML...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Theory Button in Header */}
                    <button
                        onClick={() => requestDiagramTheory(code, '2D Vector Schematic')}
                        className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        title="Generate in-depth technical theory for this exact diagram"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <span>Theory</span>
                    </button>
                    <button
                        onClick={handleReplay}
                        disabled={isReplaying}
                        className={`px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${isReplaying ? 'opacity-70 cursor-not-allowed' : ''}`}
                        title="Re-stream live SVG code construction"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isReplaying ? 'animate-spin text-emerald-400' : ''}>
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                            <path d="M16 21h5v-5"/>
                        </svg>
                        <span>{isReplaying ? 'Streaming...' : 'Replay'}</span>
                    </button>
                    <button
                        onClick={() => openDiagramOnBoard(code, '2D Vector Schematic')}
                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                        <span>Open on Blackboard</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                </div>
            </div>

            <div className="relative overflow-hidden bg-black/40 rounded-xl p-2 flex items-center justify-center min-h-[160px]">
                <div
                    className="max-h-72 w-full overflow-auto flex items-center justify-center [&>svg]:w-full [&>svg]:h-auto transition-all"
                    dangerouslySetInnerHTML={{ __html: displaySvg }}
                />
            </div>

            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>2D Vector • Live Streamed SVG</span>
                </span>
                <div className="flex items-center gap-2">
                    {/* Small button below diagram named Theory as requested */}
                    <button
                        onClick={() => requestDiagramTheory(code, '2D Vector Schematic')}
                        className="px-2.5 py-1 bg-blue-950/90 hover:bg-blue-900 border border-blue-500/50 text-blue-300 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        title="Generate in-depth technical theory for this exact diagram"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <span>Theory</span>
                    </button>
                    <button
                        onClick={handleReplay}
                        disabled={isReplaying}
                        className="hover:text-emerald-300 text-zinc-400 transition-colors flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        <span>Re-stream Code</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

import { speak, stopSpeaking } from '../../services/voiceService';

function ensureMermaidFences(text) {
    if (!text) return '';
    if (text.includes('```mermaid')) return text;

    const regex = /(?:^|\n)((?:graph\s+(?:TD|TB|LR|RL|BT)|flowchart\s+(?:TD|TB|LR|RL|BT)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart)[\s\S]*?)(?=\n(?:[A-Z0-9#*-]|Teacher Breakdown|Step-by-Step|The Problem|Key Takeaways|Intuition|Big-O|Complexity|Explanation|Look at the|To understand|\n\n\n|$))/i;

    const match = text.match(regex);
    if (match) {
        const diagramCode = match[1].trim();
        return text.replace(match[1], `\n\`\`\`mermaid\n${diagramCode}\n\`\`\`\n`);
    }

    return text;
}

function renderUserMessageContent(content) {
    if (!content) return null;

    // Detect if this prompt is a Theory request containing an embedded diagram/3D code block
    const isTheoryRequest =
        content.includes('Please provide a thorough scientific theory') ||
        content.includes('based on this exact diagram') ||
        content.includes('based on this exact 3D spatial model');

    if (isTheoryRequest) {
        // Extract topic
        const topicMatch = content.match(/for ["']?([^"'\n:]+)["']? based on/i);
        const topic = topicMatch ? topicMatch[1].trim() : '';

        // Completely hide the embedded code block from chat display!
        const cleanedText = content
            .replace(/```[\s\S]*?```/g, '')
            .replace(/IMPORTANT INSTRUCTIONS:[\s\S]*?(?=(?:1\. Core Theory|Explain in detail|\n\n|$))/i, '')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();

        return (
            <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-900 font-semibold text-xs">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <span>Theory Request {topic ? `• ${topic}` : ''}</span>
                    <span className="text-[10px] text-zinc-500 font-normal ml-0.5">(Model code attached to AI)</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-900 font-medium">
                    {cleanedText}
                </p>
            </div>
        );
    }

    // Also check if any other user message has an embedded code block (e.g. selection context with diagram/SVG)
    if (content.includes('```')) {
        const withoutCode = content.replace(/```[\s\S]*?```/g, '').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
        if (withoutCode) {
            return (
                <div className="space-y-1.5">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-900">{withoutCode}</p>
                    <div className="inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-200/70 px-2 py-0.5 rounded-md font-mono">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        <span>[ Attached code hidden from chat ]</span>
                    </div>
                </div>
            );
        }
    }

    return <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-900">{content}</p>;
}

export default function ChatMessage({ message, isTyping }) {
    const isUser = message.role === 'user';
    const { isSpeaking, setIsSpeaking, openDiagramOnBoard, open3DOnBoard, startPptMode, startQuizMode } = useAppStore();
    const [isReadingThis, setIsReadingThis] = useState(false);
    const [copied, setCopied] = useState(false);
    const formattedContent = useMemo(() => isUser ? message.content : ensureMermaidFences(message.content), [message.content, isUser]);

    // Keep isReadingThis synced if speaking stops globally
    useEffect(() => {
        if (!isSpeaking && isReadingThis) {
            setIsReadingThis(false);
        }
    }, [isSpeaking, isReadingThis]);

    const handleReadAloud = () => {
        if (isReadingThis) {
            stopSpeaking();
            setIsReadingThis(false);
            setIsSpeaking(false);
        } else {
            // Strip code blocks and raw symbols before reading aloud
            const textToSpeak = (message.content || '')
                .replace(/```[\s\S]*?```/g, ' [Diagram omitted] ')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/[*_#>-]/g, '')
                .trim();
            if (!textToSpeak) return;

            setIsReadingThis(true);
            speak(
                textToSpeak,
                () => {
                    setIsReadingThis(true);
                    setIsSpeaking(true);
                },
                () => {
                    setIsReadingThis(false);
                    setIsSpeaking(false);
                }
            );
        }
    };

    const handleCopy = () => {
        if (message.content) {
            navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={`flex gap-3 animate-fade-in group ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar */}
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mt-1">
                    <div className="w-4 h-4 rounded-full border border-zinc-500 flex items-center justify-center">
                        <div className="w-2 h-2 bg-zinc-50 rounded-full" />
                    </div>
                </div>
            )}

            {/* Bubble */}
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] relative ${isUser
                    ? 'bg-zinc-100 text-zinc-950 ml-12 shadow-md'
                    : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 mr-12 shadow-xl'
                    }`}
            >
                {/* Image if attached */}
                {message.image_url && (
                    <img
                        src={message.image_url}
                        alt="Attached"
                        className="max-w-full max-h-48 rounded-lg mb-2 object-cover"
                    />
                )}

                {/* Content */}
                {message.content ? (
                    isUser ? (
                        renderUserMessageContent(message.content)
                    ) : (
                        <div>
                            <div className="chat-markdown text-sm leading-relaxed">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        code({ node, inline, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const language = match ? match[1] : '';
                                            const codeContent = String(children).replace(/\n$/, '');

                                            if (!inline && language === 'mermaid') {
                                                return <MermaidBlock code={codeContent} />;
                                            }

                                            const isSvgCode = !inline && (language === 'svg' || (codeContent.trim().startsWith('<svg') && codeContent.trim().includes('</svg>')));
                                            if (isSvgCode) {
                                                return <SvgBlock code={codeContent} />;
                                            }

                                            // AI Slide Deck Presentation Block
                                            const isPptDeckBlock = !inline && (language === 'json:ppt-deck' || (language === 'json' && codeContent.includes('"slides"') && codeContent.includes('"slideNumber"')));
                                            if (isPptDeckBlock) {
                                                let parsedDeck = null;
                                                try {
                                                    parsedDeck = JSON.parse(codeContent);
                                                } catch (e) {
                                                    // fallback to raw json block if parsing fails
                                                }

                                                if (parsedDeck) {
                                                    return (
                                                        <div className="my-3 rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-4 relative group shadow-2xl overflow-hidden">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <rect width="18" height="14" x="3" y="3" rx="2" />
                                                                            <path d="M7 21h10" />
                                                                            <path d="M12 17v4" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                                            <h4 className="text-sm font-bold text-zinc-100">{parsedDeck.topic || parsedDeck.title || 'Slide Deck Ready'}</h4>
                                                                        </div>
                                                                        <p className="text-xs text-zinc-400 mt-0.5">{parsedDeck.slides?.length || 0} slides • Visual Diagrams Included</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => startPptMode(parsedDeck)}
                                                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                                                >
                                                                    <span>Launch Slide Studio</span>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }

                                            // AI Quiz Assessment Block
                                            const isQuizDataBlock = !inline && (language === 'json:quiz-data' || (language === 'json' && codeContent.includes('"questions"') && codeContent.includes('"correctAnswerIndex"')));
                                            if (isQuizDataBlock) {
                                                let parsedQuiz = null;
                                                try {
                                                    parsedQuiz = JSON.parse(codeContent);
                                                } catch (e) {
                                                    // fallback
                                                }

                                                if (parsedQuiz) {
                                                    return (
                                                        <div className="my-3 rounded-2xl border border-amber-500/30 bg-zinc-950/90 p-4 relative group shadow-2xl overflow-hidden">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <circle cx="12" cy="12" r="10" />
                                                                            <path d="m9 12 2 2 4-4" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                                            <h4 className="text-sm font-bold text-zinc-100">{parsedQuiz.title || parsedQuiz.topic || 'Assessment Quiz Ready'}</h4>
                                                                        </div>
                                                                        <p className="text-xs text-zinc-400 mt-0.5">{parsedQuiz.questions?.length || 0} Questions • {parsedQuiz.difficulty || 'Standard'} Rigor</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => startQuizMode(parsedQuiz)}
                                                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                                                                >
                                                                    <span>Take Quiz Now</span>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }

                                            const isThreeJsCode = !inline && (codeContent.includes('THREE.') || codeContent.includes('group.add') || codeContent.includes('createTextSprite'));
                                            if (isThreeJsCode) {
                                                return (
                                                    <div className="my-3 rounded-2xl border border-indigo-500/30 bg-zinc-950/90 p-4 relative group shadow-2xl overflow-hidden">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                                                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                                        <h4 className="text-sm font-bold text-zinc-100">3D Spatial Scene Generated</h4>
                                                                    </div>
                                                                    <p className="text-xs text-zinc-400 mt-0.5">Interactive Three.js 3D model is ready</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {/* Theory Button for 3D */}
                                                                <button
                                                                    onClick={() => requestDiagramTheory(codeContent, '3D Spatial Model')}
                                                                    className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-purple-500/50 text-zinc-300 hover:text-purple-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                                                                    title="Generate in-depth technical theory for this 3D model"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                                                    <span>Theory</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => open3DOnBoard(codeContent, '3D Spatial Scene')}
                                                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white hover:text-black font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                                                >
                                                                    <span>Open in 3D Viewer</span>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Bottom footer with Theory helper */}
                                                        <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex items-center justify-between">
                                                            <span className="text-[10px] text-zinc-400">Want step-by-step scientific theory?</span>
                                                            <button
                                                                onClick={() => requestDiagramTheory(codeContent, '3D Spatial Model')}
                                                                className="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                                                                title="Generate in-depth technical theory for this 3D model"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                                                <span>Theory</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return !inline ? (
                                                <code className={`block p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto my-2 whitespace-pre ${className || ''}`} {...props}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <code className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-xs font-mono" {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        pre({ children }) {
                                            return <div className="my-2">{children}</div>;
                                        },
                                        p({ children }) {
                                            return <div className="mb-2 leading-relaxed last:mb-0">{children}</div>;
                                        }
                                    }}
                                >
                                    {formattedContent}
                                </ReactMarkdown>
                            </div>

                            {/* Message Bottom Action Row (Read Aloud & Copy) */}
                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={handleReadAloud}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${isReadingThis
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                            : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        title={isReadingThis ? 'Stop Reading Aloud' : 'Read Text Aloud'}
                                    >
                                        {isReadingThis ? (
                                            <>
                                                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                                                <span className="font-semibold text-rose-300">Speaking...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                                                <span>Read Aloud</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                                        title="Copy Message Text"
                                    >
                                        {copied ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>
                                                <span className="text-emerald-400 font-medium">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                ) : isTyping ? (
                    <div className="flex items-center gap-1 py-1">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
