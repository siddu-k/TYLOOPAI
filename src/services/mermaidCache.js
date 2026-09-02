import mermaid from 'mermaid';

// Global in-memory cache for rendered Mermaid SVGs
export const mermaidSvgCache = new Map();

/**
 * Clean and auto-repair raw mermaid code with comprehensive edge/node label quoting
 */
export function cleanMermaidCode(raw) {
    if (!raw) return '';
    let cleaned = raw
        .replace(/^```(?:mermaid)?/i, '')
        .replace(/```$/, '')
        .trim();

    // Decode any escaped HTML entities
    cleaned = cleaned
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');

    // If there is preceding text before the diagram header, isolate the diagram
    const headerMatch = cleaned.match(/(?:^|\n)((?:graph\s+(?:TD|TB|LR|RL|BT)|flowchart\s+(?:TD|TB|LR|RL|BT)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart)[\s\S]*)/i);
    if (headerMatch) {
        cleaned = headerMatch[1].trim();
    }

    // If there is trailing explanation text, isolate just the diagram block
    const trailingTextMatch = cleaned.match(/^([\s\S]*?)(?=\n(?:Teacher Breakdown|Step-by-Step|The Problem|Key Takeaways|Intuition|Big-O|Complexity|Explanation|Look at the|To understand))/i);
    if (trailingTextMatch) {
        cleaned = trailingTextMatch[1].trim();
    }

    // Auto-fix unquoted subgraph titles with special characters/spaces/parentheses:
    // e.g. subgraph Unbalanced Tree (Skewed) => subgraph Unbalanced_Tree_Skewed ["Unbalanced Tree (Skewed)"]
    cleaned = cleaned.replace(/subgraph\s+([^\n\[\]]+)/gi, (match, title) => {
        const trimmed = title.trim();
        if (trimmed.includes('["') || trimmed.includes("['") || /^[a-zA-Z0-9_]+$/.test(trimmed)) {
            return match;
        }
        const safeId = trimmed.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'sub';
        return `subgraph ${safeId} ["${trimmed.replace(/"/g, "'")}"]`;
    });

    // Auto-quote unquoted pipe edge labels: e.g. -->|Blocked (0V)| => -->|"Blocked (0V)"|
    cleaned = cleaned.replace(/\|([^"|\r\n]+)\|/g, (match, inner) => {
        const trimmed = inner.trim();
        if (!trimmed.startsWith('"')) {
            return `|"${trimmed.replace(/"/g, "'")}"|`;
        }
        return match;
    });

    // Auto-quote unquoted bracket node labels: e.g. Node[Step 1 (Init)] => Node["Step 1 (Init)"]
    cleaned = cleaned.replace(/([a-zA-Z0-9_-]+)\[([^"\[\]\r\n]+)\]/g, (match, nodeId, inner) => {
        const trimmed = inner.trim();
        if (!trimmed.startsWith('"')) {
            return `${nodeId}["${trimmed.replace(/"/g, "'")}"]`;
        }
        return match;
    });

    // Auto-quote circular node labels: e.g. Node((10: Root)) => Node(("(10: Root)"))
    cleaned = cleaned.replace(/([a-zA-Z0-9_-]+)\(\(\s*([^"()\r\n]+)\s*\)\)/g, (match, nodeId, inner) => {
        const trimmed = inner.trim();
        if (!trimmed.startsWith('"')) {
            return `${nodeId}(("${trimmed.replace(/"/g, "'")}"))`;
        }
        return match;
    });

    // Auto-fix if diagram starts with a node directly instead of diagram header
    const validHeaderRegex = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart|architecture|C4Context)/i;
    if (!validHeaderRegex.test(cleaned.trim())) {
        if (cleaned.includes('-->') || cleaned.includes('---') || cleaned.includes('subgraph')) {
            cleaned = `graph TD\n${cleaned}`;
        }
    }

    return cleaned.trim();
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
        // Fallback auto-repair: quote all unquoted labels & sanitize parentheses
        try {
            let fallbackCode = clean
                .replace(/\|([^"|\r\n]+)\|/g, (match, inner) => `|"${inner.trim().replace(/"/g, "'")}"|`)
                .replace(/\[([^"\[\]\r\n]+)\]/g, (match, inner) => `["${inner.trim().replace(/"/g, "'")}"]`)
                .replace(/\(\(\s*([^"()\r\n]+)\s*\)\)/g, (match, inner) => `(("${inner.trim().replace(/"/g, "'")}"))`);

            await mermaid.parse(fallbackCode, { suppressErrors: true });
            const uniqueId = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const { svg } = await mermaid.render(uniqueId, fallbackCode);
            mermaidSvgCache.set(clean, svg);
            return { svg, error: null, cached: false };
        } catch (e2) {
            // Second fallback: strip all parentheses inside edge pipes
            try {
                let stripCode = clean.replace(/\|([^|\r\n]+)\|/g, (match, inner) => `|"${inner.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()}"|`);
                await mermaid.parse(stripCode, { suppressErrors: true });
                const uniqueId = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const { svg } = await mermaid.render(uniqueId, stripCode);
                mermaidSvgCache.set(clean, svg);
                return { svg, error: null, cached: false };
            } catch (e3) {
                return { svg: '', error: err.message || 'Diagram syntax error', cached: false };
            }
        }
    }
}
