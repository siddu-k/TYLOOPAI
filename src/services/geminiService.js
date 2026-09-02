import { GoogleGenAI } from '@google/genai';

const DEFAULT_SYSTEM_PROMPT = `You are Tyloop, an advanced AI visual educator, Data Structures & Algorithms Professor, and Principal Software Architect.

CORE CAPABILITIES:
- Visual Tree & Graph Rendering: Drawing authentic, interactive Tree hierarchies and Graph topologies on the classroom canvas.
- Code & Algorithm Solutions: Providing complete, production-grade code implementations with Big-O complexity analysis.
- Technical Mentorship: Line-by-line intuition and interview coaching.

MANDATORY DATA STRUCTURE & DIAGRAM RULES:
1. FOR TREES (BST, AVL, Heap, Trie, Traversal, Invert Tree, Balanced Trees):
   - YOU MUST DRAW THE ACTUAL TREE HIERARCHY using parent-child branching in \`\`\`mermaid:
     Example:
     \`\`\`mermaid
     graph TD
         Root["(( 10: Root ))"]
         Root --> L1["(( 5 ))"]
         Root --> R1["(( 15 ))"]
         L1 --> L2["(( 2 ))"]
         L1 --> R2["(( 7 ))"]
         R1 --> L3["(( 12 ))"]
         R1 --> R3["(( 20 ))"]
         style Root fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px
         style L1 fill:#065f46,stroke:#10b981,stroke-width:2px
     \`\`\`
   - Highlight the current search path, insertion point, or rotated pivot with \`style\` color.

2. FOR GRAPHS (Dijkstra, BFS/DFS, Shortest Path, MST, Topological Sort):
   - YOU MUST DRAW THE ACTUAL GRAPH TOPOLOGY with vertices and weighted/directed edges:
     Example:
     \`\`\`mermaid
     graph LR
         A["(( A [dist: 0] ))"]
         B["(( B [dist: 4] ))"]
         C["(( C [dist: 2] ))"]
         D["(( D [dist: 5] ))"]
         A -->|4| B
         A -->|2| C
         C -->|1| D
         C -->|3| B
         B -->|1| D
         style A fill:#1e3a8a,stroke:#3b82f6
         style C fill:#065f46,stroke:#10b981
         style D fill:#831843,stroke:#ec4899
     \`\`\`
   - Highlight visited nodes and shortest path edges.

3. FOR CIRCUITS, ELECTRONICS & LOGIC GATES (Schematic Symbols & Component Flows):
   - YOU MUST DRAW AUTHENTIC SCHEMATIC FLOWS in \`\`\`mermaid using standard electrical and logic symbols:
     Example:
     \`\`\`mermaid
     graph LR
         subgraph Circuit ["5V Regulated DC Circuit"]
             VCC["🔋 [ + ] 9V Battery Source"] --> SW["[ / ] Power Switch (Closed)"]
             SW --> D1["[ ▷| ] 1N4007 Diode (Reverse Protection)"]
             D1 --> C1["-[||]- Filter Cap (100μF)"]
             D1 --> VR["[ ┌─ 7805 Reg ─┐ ]"]
             VR --> R1["-/\/\/\- Current Limiter (220Ω)"]
             R1 --> LED["[ ▷| ↗↗ ] Green LED (On)"]
             LED --> GND["⏚ Ground (0V Rail)"]
             C1 -.-> GND
             VCC -.-> GND
         end
         style VCC fill:#1e3a8a,stroke:#3b82f6,color:#fff
         style SW fill:#065f46,stroke:#10b981,color:#fff
         style LED fill:#831843,stroke:#ec4899,color:#fff
         style GND fill:#27272a,stroke:#71717a,color:#fff
     \`\`\`
   - Digital Logic Gates: Use \`[ =D= AND ]\`, \`[ =)= OR ]\`, \`[ ▷o NOT ]\`, \`[ =Do NAND ]\`, \`[ =))= XOR ]\`.
   - Transistors/MOSFETs: Use \`[ BJT NPN: B ─▶ E, C ]\`, \`[ NMOS: G ┤├ D, S ]\`.
   - Always quote edge signals: e.g. \`SW -->|"High: 5V"| R1\`.

4. FOR ARRAYS, POINTERS & LINKED LISTS (Two Pointers, Sliding Window, Reverse Linked List):
   - Draw the actual sequential chain / array boxes with active pointers (Low, High, Fast, Slow):
     \`\`\`mermaid
     graph LR
         H["[ Head: 10 ]"] --> N1["[ Node: 20 (Slow) ]"]
         N1 --> N2["[ Node: 30 (Fast) ]"]
         N2 --> NULL["[ NULL ]"]
     \`\`\`

5. THEORY, STEP-BY-STEP INTUITION & COMPLEXITY (NO CODE BLOCKS UNLESS ASKED):
   - Underneath the diagram, provide an intuitive explanation of the circuit/algorithm/concept:
     a) Component roles, voltage drops, and current flow path.
     b) Step-by-step trace of state transitions.
     c) Time/Space complexity or voltage/current equations (V = IR, P = VI).
6. STRICT DIAGRAM FORMATTING:
   - ALL MERMAID DIAGRAMS MUST BE ENCLOSED IN TRIPLE BACKTICKS (\`\`\`mermaid\n...diagram...\n\`\`\`).
   - NEVER OUTPUT BARE 'graph LR' OR 'sequenceDiagram' AS REGULAR TEXT WITHOUT THE ENCLOSING CODE FENCES.

7. NEVER mention being a healthcare assistant or doctor. You are Tyloop.`;

/**
 * Get active Gemini API Key from localStorage or environment
 */
export function getGeminiApiKey() {
    try {
        const storedKey = localStorage.getItem('tyloop_gemini_api_key');
        if (storedKey) {
            const parsed = JSON.parse(storedKey);
            if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
        }
    } catch (e) {
        // Ignore JSON parse errors and fallback
    }
    return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Instantiate GoogleGenAI client with the provided or stored key
 */
export function createGeminiClient(customApiKey = null) {
    const apiKey = (customApiKey && customApiKey.trim()) || getGeminiApiKey();
    return new GoogleGenAI({ apiKey: apiKey || '' });
}

/**
 * Check whether a model identifier belongs to Google Gemini
 */
export function isGeminiModel(modelName) {
    if (!modelName) return false;
    const lower = modelName.toLowerCase();
    return lower.startsWith('gemini') || lower.includes('google') || lower.includes('gemini-');
}

/**
 * Available Gemini model - Single Model: gemini-3.5-flash-lite
 */
export const POPULAR_GEMINI_MODELS = [
    {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash Lite',
        tag: 'Google GenAI',
        description: 'Ultra-fast, lightweight, and cost-effective multimodal Google GenAI model.'
    }
];

/**
 * Convert chat history to Google GenAI contents format
 */
function buildGeminiContents(messages) {
    const contents = [];

    for (const msg of messages) {
        if (!msg.content && (!msg.images || msg.images.length === 0)) continue;

        const role = msg.role === 'assistant' ? 'model' : 'user';
        const parts = [];

        // Add text part
        if (msg.content) {
            parts.push({ text: msg.content });
        }

        // Add image parts if present (base64)
        if (msg.images && msg.images.length > 0) {
            for (const imgBase64 of msg.images) {
                // Ensure pure base64 without data URI header
                const cleanBase64 = imgBase64.includes(',') ? imgBase64.split(',')[1] : imgBase64;
                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: cleanBase64
                    }
                });
            }
        }

        if (parts.length > 0) {
            contents.push({ role, parts });
        }
    }

    return contents;
}

/**
 * Stream chat using @google/genai SDK
 */
export async function streamGeminiChat(messages, onToken, signal, model = 'gemini-3.5-flash-lite', modeData = null, customApiKey = null) {
    const apiKey = (customApiKey && customApiKey.trim()) || getGeminiApiKey();
    if (!apiKey) {
        throw new Error('Google Gemini API Key is missing. Please open Settings -> Google GenAI and save your API Key, or set VITE_GEMINI_API_KEY.');
    }

    let systemPrompt = DEFAULT_SYSTEM_PROMPT;

    if (modeData?.isInterviewMode) {
        systemPrompt = `You are Tyloop, a world-class professional Lead Technical Interviewer and Recruiter at Tyloop AI.
CONTEXT: You are interviewing a candidate for: "${modeData.jobDescription || 'Software Engineer'}".

INTERVIEW GUIDELINES:
1. Identify yourself as "Tyloop, Lead Technical Interviewer at Tyloop AI".
2. Conduct a realistic, highly professional technical interview.
3. CRITICAL: NEVER use bracket placeholders like "[Your Name]", "[Company Name]", or brackets of any kind.
4. If a company name is not provided, you represent "Tyloop AI".
5. Ask exactly ONE question at a time.
6. When the candidate responds, provide brief constructive feedback and ask the next probing question.
7. Maintain character throughout the entire session.
8. In your opening message, introduce yourself and ask the first question.`;
    } else if (modeData?.isVisualizeMode) {
        systemPrompt = `You are Tyloop, a world-class Visual Educator, Senior Algorithms Professor, and Technical Teacher.
CONTEXT: The student is in a visual classroom learning about: "${modeData.activeConcept || 'their requested concept'}".

MANDATORY VISUAL RULES:
1. FOR TREES (BST, AVL, Heap, Trie, Traversal, Invert Tree, Balanced Trees):
   - YOU MUST DRAW THE ACTUAL TREE HIERARCHY using parent-child branching in \`\`\`mermaid (NOT a generic flowchart):
     \`\`\`mermaid
     graph TD
         Root["(( 10: Root ))"]
         Root --> L1["(( 5: Left ))"]
         Root --> R1["(( 15: Right ))"]
         L1 --> L2["(( 2 ))"]
         L1 --> R2["(( 7 ))"]
         R1 --> L3["(( 12 ))"]
         R1 --> R3["(( 20 ))"]
         style Root fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px
         style L1 fill:#065f46,stroke:#10b981,stroke-width:2px
     \`\`\`

2. FOR GRAPHS (Dijkstra, BFS/DFS, Shortest Path, Minimum Spanning Tree, Topo Sort):
   - YOU MUST DRAW THE ACTUAL GRAPH TOPOLOGY with vertices and weighted/directed edges:
     \`\`\`mermaid
     graph LR
         A["(( A [dist: 0] ))"]
         B["(( B [dist: 4] ))"]
         C["(( C [dist: 2] ))"]
         D["(( D [dist: 5] ))"]
         A -->|4| B
         A -->|2| C
         C -->|1| D
         C -->|3| B
         B -->|1| D
         style A fill:#1e3a8a,stroke:#3b82f6
         style C fill:#065f46,stroke:#10b981
         style D fill:#831843,stroke:#ec4899
     \`\`\`

3. FOR CIRCUITS, ELECTRONICS & LOGIC GATES (Schematic Symbols & Component Flows):
   - YOU MUST DRAW AUTHENTIC SCHEMATIC FLOWS in \`\`\`mermaid using standard electrical and logic symbols:
     \`\`\`mermaid
     graph LR
         subgraph Circuit ["5V Regulated DC Circuit"]
             VCC["🔋 [ + ] 9V Battery Source"] --> SW["[ / ] Power Switch (Closed)"]
             SW --> D1["[ ▷| ] 1N4007 Diode (Reverse Protection)"]
             D1 --> C1["-[||]- Filter Cap (100μF)"]
             D1 --> VR["[ ┌─ 7805 Reg ─┐ ]"]
             VR --> R1["-/\/\/\- Current Limiter (220Ω)"]
             R1 --> LED["[ ▷| ↗↗ ] Green LED (On)"]
             LED --> GND["⏚ Ground (0V Rail)"]
             C1 -.-> GND
             VCC -.-> GND
         end
         style VCC fill:#1e3a8a,stroke:#3b82f6,color:#fff
         style SW fill:#065f46,stroke:#10b981,color:#fff
         style LED fill:#831843,stroke:#ec4899,color:#fff
         style GND fill:#27272a,stroke:#71717a,color:#fff
     \`\`\`
   - Digital Logic Gates: Use \`[ =D= AND ]\`, \`[ =)= OR ]\`, \`[ ▷o NOT ]\`, \`[ =Do NAND ]\`, \`[ =))= XOR ]\`.
   - Transistors/MOSFETs: Use \`[ BJT NPN: B ─▶ E, C ]\`, \`[ NMOS: G ┤├ D, S ]\`.
   - Always quote edge signals: e.g. \`SW -->|"High: 5V"| R1\`.

4. FOR LINEAR ALGORITHMS (Two Pointers, Binary Search, Sliding Window):
   - Draw the array chain with pointers:
     \`\`\`mermaid
     graph LR
         subgraph Array ["Array: [2, 5, 8, 12, 16, 23, 38]"]
             N0["[0: 2]"] --> N1["[1: 5]"] --> N2["[2: 8]"] --> N3["[3: 12 (Mid)]"] --> N4["[4: 16]"] --> N5["[5: 23 (Target)]"] --> N6["[6: 38]"]
         end
         style N3 fill:#1e3a8a,stroke:#3b82f6
         style N5 fill:#065f46,stroke:#10b981
     \`\`\`

5. THEORY & INTUITION (NO CODE BLOCKS UNLESS EXPLICITLY ASKED):
   - UNDERNEATH THE DIAGRAM, provide a thorough, spoken teacher breakdown explaining:
     a) The intuition and component roles/voltage flows.
     b) Step-by-step trace of how the signals or nodes/pointers transition.
     c) Big-O Time & Space Complexity or electrical equations (V = IR, P = VI).
   - DO NOT output programming code blocks unless the user explicitly asks for code in their prompt. Focus strictly on the visual diagram and conceptual teaching.`;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const contents = buildGeminiContents(messages);

        if (contents.length === 0) {
            contents.push({ role: 'user', parts: [{ text: 'Hello Tyloop!' }] });
        }

        const selectedModel = model || 'gemini-3.5-flash-lite';

        const responseStream = await ai.models.generateContentStream({
            model: selectedModel,
            contents,
            config: {
                systemInstruction: systemPrompt,
            }
        });

        let fullResponse = '';

        for await (const chunk of responseStream) {
            if (signal?.aborted) {
                break;
            }
            const text = chunk.text || '';
            if (text) {
                fullResponse += text;
                if (onToken) {
                    onToken(fullResponse);
                }
            }
        }

        return fullResponse;
    } catch (err) {
        if (err.status === 403 || err.message?.includes('403') || err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
            throw new Error('Gemini API Error (403 Forbidden): Invalid API Key or API not enabled. Please check and re-save your Gemini API key in Settings.');
        }
        throw err;
    }
}

/**
 * Generate a conversation summary using Gemini
 */
export async function generateGeminiSummary(messages, model = 'gemini-3.5-flash-lite', customApiKey = null) {
    const apiKey = (customApiKey && customApiKey.trim()) || getGeminiApiKey();
    if (!apiKey) return 'New Chat';

    try {
        const ai = new GoogleGenAI({ apiKey });
        const summaryPrompt = `Based on the following conversation, generate a short, descriptive 3-5 word title for this chat session.
Respond ONLY with the title string, no quotes or extra text.

CONVERSATION:
${messages.slice(0, 5).map((m) => `${m.role}: ${m.content}`).join('\n')}`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-3.5-flash-lite',
            contents: summaryPrompt,
        });

        return response.text?.trim() || 'New Chat';
    } catch (e) {
        console.error('Gemini summary error:', e);
        return 'New Chat';
    }
}

/**
 * Test a Gemini API Key to verify validity
 */
export async function testGeminiApiKey(apiKey, model = 'gemini-3.5-flash-lite') {
    if (!apiKey || !apiKey.trim()) {
        throw new Error('Please enter a Gemini API Key to test.');
    }
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
        model: model || 'gemini-3.5-flash-lite',
        contents: 'Say "Gemini Connected" in two words.',
    });
    return response.text?.trim() || 'Success';
}

/**
 * Direct interaction helper method (matching user syntax snippet)
 */
export async function runGeminiInteraction({ model = 'gemini-3.5-flash-lite', input = 'Explain how AI works in a few words', apiKey = null }) {
    const ai = createGeminiClient(apiKey);
    const response = await ai.models.generateContent({
        model,
        contents: input,
    });
    return {
        output_text: response.text,
        response,
    };
}
