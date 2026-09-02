import { useState, useEffect, useId, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import useAppStore from '../../stores/appStore';
import { renderCachedMermaid, cleanMermaidCode, mermaidSvgCache } from '../../services/mermaidCache';

function MermaidBlock({ code }) {
    const clean = cleanMermaidCode(code);
    const [svg, setSvg] = useState(() => clean ? (mermaidSvgCache.get(clean) || '') : '');
    const [error, setError] = useState(null);
    const { openDiagramOnBoard } = useAppStore();
    const id = useId().replace(/:/g, '-');

    useEffect(() => {
        let isMounted = true;
        async function renderMermaid() {
            if (!clean) return;

            if (mermaidSvgCache.has(clean)) {
                setSvg(mermaidSvgCache.get(clean));
                setError(null);
                return;
            }

            const { svg: renderedSvg, error: renderErr } = await renderCachedMermaid(clean, `mermaid-chat-${id}`);
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
                <button
                    onClick={handleSendToBoard}
                    className="text-[10px] font-semibold text-zinc-400 hover:text-white px-2 py-0.5 bg-zinc-800 hover:bg-emerald-950 hover:border-emerald-700/50 border border-zinc-700 rounded-lg transition-all flex items-center gap-1"
                    title="View on Blackboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
                    <span>Open on Board</span>
                </button>
            </div>
            <div
                className="p-4 flex items-center justify-center overflow-x-auto select-none"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
        </div>
    );
}

import { speak, stopSpeaking } from '../../services/voiceService';

function ensureMermaidFences(text) {
    if (!text) return '';
    if (text.includes('```mermaid')) return text;

    const regex = /(?:^|\n)((?:graph\s+(?:TD|TB|LR|RL|BT)|flowchart\s+(?:TD|TB|LR|RL|BT)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart)[\s\S]*?)(?=\n(?:[A-Z0-9#*-]|Teacher Breakdown|Step-by-Step Trace|Key Takeaways|Intuition|Big-O|Complexity|Explanation|\n\n\n|$))/i;

    const match = text.match(regex);
    if (match) {
        const diagramCode = match[1].trim();
        return text.replace(match[1], `\n\`\`\`mermaid\n${diagramCode}\n\`\`\`\n`);
    }

    return text;
}

export default function ChatMessage({ message, isTyping }) {
    const isUser = message.role === 'user';
    const { isSpeaking, setIsSpeaking } = useAppStore();
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
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div>
                            <div className="chat-markdown text-sm leading-relaxed">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code({ node, inline, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const language = match ? match[1] : '';
                                            const codeContent = String(children).replace(/\n$/, '');

                                            if (!inline && language === 'mermaid') {
                                                return <MermaidBlock code={codeContent} />;
                                            }

                                            return !inline ? (
                                                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto my-2">
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                </pre>
                                            ) : (
                                                <code className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-xs font-mono" {...props}>
                                                    {children}
                                                </code>
                                            );
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
