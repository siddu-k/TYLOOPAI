import mermaid from 'mermaid';

// Global in-memory cache for rendered Mermaid SVGs
export const mermaidSvgCache = new Map();

/**
 * Clean raw mermaid code by stripping markdown fences
 */
export function cleanMermaidCode(raw) {
    if (!raw) return '';
    return raw
        .replace(/^```(?:mermaid)?/i, '')
        .replace(/```$/, '')
        .trim();
}

/**
 * Render or retrieve cached SVG for mermaid diagram code
 */
export async function renderCachedMermaid(code, prefix = 'mermaid') {
    const clean = cleanMermaidCode(code);
    if (!clean) return { svg: '', error: null };

    if (mermaidSvgCache.has(clean)) {
        return { svg: mermaidSvgCache.get(clean), error: null, cached: true };
    }

    try {
        await mermaid.parse(clean, { suppressErrors: true });
        const uniqueId = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { svg } = await mermaid.render(uniqueId, clean);
        mermaidSvgCache.set(clean, svg);
        return { svg, error: null, cached: false };
    } catch (err) {
        return { svg: '', error: err.message || 'Diagram syntax error', cached: false };
    }
}
