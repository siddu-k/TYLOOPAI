import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import useAppStore from '../../stores/appStore';
import { renderCachedMermaid, cleanMermaidCode, mermaidSvgCache } from '../../services/mermaidCache';

// Initialize mermaid with dark chalkboard configuration and suppressed error DOM injection
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    suppressErrorRendering: true,
    fontFamily: 'Inter, -apple-system, sans-serif',
    fontSize: 12,
    flowchart: {
        htmlLabels: true,
        padding: 24,
        nodeSpacing: 50,
        rankSpacing: 55,
        curve: 'basis',
        useMaxWidth: false
    },
    sequence: {
        useMaxWidth: false,
        actorMargin: 50,
        boxMargin: 15,
        boxTextMargin: 8,
        noteMargin: 15,
        messageMargin: 40
    },
    themeVariables: {
        fontSize: '12px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        darkMode: true,
        background: 'transparent',
        mainBkg: '#18181b',
        nodeBorder: '#3f3f46',
        clusterBkg: '#09090b',
        titleColor: '#fafafa',
        edgeLabelBackground: '#18181b',
        lineColor: '#e4e4e7',
        textColor: '#fafafa',
        primaryColor: '#27272a',
        primaryTextColor: '#fafafa',
        primaryBorderColor: '#71717a',
        secondaryColor: '#18181b',
        tertiaryColor: '#09090b'
    }
});

export default function MermaidBoard() {
    const { activeBoardDiagram, activeBoardTitle, isAiTyping } = useAppStore();
    const containerRef = useRef(null);
    const [svgContent, setSvgContent] = useState(() => {
        const clean = cleanMermaidCode(activeBoardDiagram);
        return clean ? (mermaidSvgCache.get(clean) || '') : '';
    });
    const [renderError, setRenderError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const [copied, setCopied] = useState(false);
    const [boardTheme, setBoardTheme] = useState('chalkboard'); // chalkboard | obsidian | slate
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function renderChart() {
            const cleanCode = cleanMermaidCode(activeBoardDiagram);
            if (!cleanCode) {
                setSvgContent('');
                setRenderError(null);
                return;
            }

            // If already in SVG cache, instant sync update
            if (mermaidSvgCache.has(cleanCode)) {
                setSvgContent(mermaidSvgCache.get(cleanCode));
                setRenderError(null);
                return;
            }

            const { svg, error } = await renderCachedMermaid(cleanCode, 'mermaid-board');
            if (isMounted) {
                if (svg) {
                    setSvgContent(svg);
                    setRenderError(null);
                } else if (error) {
                    if (isAiTyping) {
                        setRenderError(null);
                    } else {
                        setRenderError(error);
                    }
                }
            }
        }

        renderChart();

        return () => {
            isMounted = false;
        };
    }, [activeBoardDiagram, isAiTyping]);

    // Handle Pan Drag
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // only left click
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Handle Non-Passive Mouse Wheel Zoom on Canvas (eliminates passive preventDefault warnings)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleNonPassiveWheel = (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            setZoom(currentZoom => Math.min(10.0, Math.max(0.1, Number((currentZoom * factor).toFixed(2)))));
        };

        container.addEventListener('wheel', handleNonPassiveWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleNonPassiveWheel);
        };
    }, []);

    const handleResetView = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleZoomIn = () => {
        setZoom(z => Math.min(10.0, Number((z * 1.25).toFixed(2))));
    };

    const handleZoomOut = () => {
        setZoom(z => Math.max(0.1, Number((z * 0.8).toFixed(2))));
    };

    const handleFitView = () => {
        setZoom(0.85);
        setPosition({ x: 0, y: 0 });
    };

    const handleCopy = () => {
        if (activeBoardDiagram) {
            navigator.clipboard.writeText(activeBoardDiagram);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const themeStyles = {
        chalkboard: 'bg-[#0e1310] border-emerald-900/40 text-emerald-100',
        obsidian: 'bg-[#09090b] border-zinc-800 text-zinc-100',
        slate: 'bg-[#0f172a] border-slate-800 text-slate-100'
    };

    return (
        <div className={`relative flex flex-col h-full w-full rounded-3xl overflow-hidden border shadow-2xl transition-all duration-300 ${themeStyles[boardTheme]} ${isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : ''}`}>
            {/* Whiteboard Top Toolbar */}
            <header className="px-5 py-3.5 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-md z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                            Smart Blackboard
                        </span>
                    </div>
                    <h2 className="text-sm font-semibold truncate text-white max-w-[200px] sm:max-w-xs md:max-w-md">
                        {activeBoardTitle || 'Visual Learning Stage'}
                    </h2>
                </div>

                {/* Toolbar Controls */}
                <div className="flex items-center gap-2">
                    {/* Theme Selector */}
                    <div className="hidden sm:flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5">
                        <button
                            onClick={() => setBoardTheme('chalkboard')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${boardTheme === 'chalkboard' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Chalk
                        </button>
                        <button
                            onClick={() => setBoardTheme('obsidian')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${boardTheme === 'obsidian' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Dark
                        </button>
                        <button
                            onClick={() => setBoardTheme('slate')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${boardTheme === 'slate' ? 'bg-slate-800 text-blue-300' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Slate
                        </button>
                    </div>

                    {/* Zoom In/Out & Reset */}
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5">
                        <button
                            onClick={handleZoomOut}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Zoom Out (Min 10%)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                        </button>
                        <button
                            onClick={handleResetView}
                            className="px-2.5 py-0.5 text-[11px] font-mono font-bold text-zinc-300 hover:text-emerald-300 hover:bg-white/5 rounded transition-colors"
                            title="Reset to 100% & Center"
                        >
                            {Math.round(zoom * 100)}%
                        </button>
                        <button
                            onClick={handleZoomIn}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Zoom In (Max 1000%)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                        </button>
                    </div>

                    {/* Copy Code */}
                    {activeBoardDiagram && (
                        <button
                            onClick={handleCopy}
                            className="px-3 py-1.5 bg-black/40 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                            title="Copy Mermaid Code"
                        >
                            {copied ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>
                                    <span className="text-[10px] text-emerald-400 font-bold">Copied</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
                                    <span className="text-[10px]">Code</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1.5 bg-black/40 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 rounded-xl transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                        )}
                    </button>
                </div>
            </header>

            {/* Draggable & Highly-Zoomable Board Canvas */}
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`flex-1 relative overflow-hidden flex items-center justify-center select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
                {/* Chalkboard subtle grid texture background */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Floating Bottom Left Navigation / Presets */}
                {svgContent && (
                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[11px] text-zinc-300 flex items-center gap-2 shadow-lg">
                            <span className="text-emerald-400 font-mono font-bold">{Math.round(zoom * 100)}%</span>
                            <span className="text-zinc-600">•</span>
                            <span>Drag to pan</span>
                            <span className="text-zinc-600">•</span>
                            <span>Scroll to zoom</span>
                        </div>
                        <button
                            onClick={handleFitView}
                            className="px-2.5 py-1.5 bg-black/60 hover:bg-zinc-800 backdrop-blur-md rounded-xl border border-white/10 text-[10px] font-bold text-zinc-300 hover:text-white transition-all shadow-lg"
                            title="Fit diagram to view"
                        >
                            Fit
                        </button>
                    </div>
                )}

                {/* Floating Bottom Right Quick Zoom Controls */}
                {svgContent && (
                    <div className="absolute bottom-4 right-4 z-10 flex items-center bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1 shadow-lg gap-1">
                        <button
                            onClick={handleZoomOut}
                            className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg text-sm font-bold transition-all"
                            title="Zoom Out"
                        >
                            -
                        </button>
                        <button
                            onClick={handleResetView}
                            className="px-2 text-[10px] font-mono text-zinc-300 hover:text-emerald-400"
                            title="Reset 100%"
                        >
                            1x
                        </button>
                        <button
                            onClick={handleZoomIn}
                            className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg text-sm font-bold transition-all"
                            title="Zoom In"
                        >
                            +
                        </button>
                    </div>
                )}

                {svgContent ? (
                    <div
                        className="transition-transform duration-75 ease-out origin-center flex items-center justify-center will-change-transform max-w-none"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`
                        }}
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                ) : renderError ? (
                    <div className="text-center p-8 max-w-md mx-auto space-y-3 bg-red-950/20 border border-red-900/40 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        </div>
                        <h4 className="text-sm font-semibold text-red-300">Diagram Rendering Issue</h4>
                        <p className="text-xs text-red-400/80 font-mono overflow-auto max-h-24 p-2 bg-black/40 rounded-lg text-left">
                            {renderError}
                        </p>
                    </div>
                ) : isAiTyping ? (
                    <div className="text-center space-y-4">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/30 animate-ping absolute inset-0" />
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.21-8.58" /><path d="M15 3h6v6" /></svg>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-emerald-300">Drawing on Board...</p>
                            <p className="text-xs text-zinc-500">Tyloop is generating the visual flowchart</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-8 max-w-sm mx-auto space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-white">Classroom Whiteboard Ready</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Ask any concept, system, algorithm, or process in the chat to see it diagrammed live on the board.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
