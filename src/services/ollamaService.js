const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';

const SYSTEM_PROMPT = `You are Tyloop, an advanced AI visual educator, Data Structures & Algorithms Professor, and Principal Software Architect.

CORE TEACHING & ALGORITHM RULES:
1. ALGORITHMS & DATA STRUCTURES:
   - Provide authentic visual tree/graph/array diagrams in a valid \`\`\`mermaid block.
   - Underneath the diagram, provide conceptual intuition, step-by-step trace of the node/pointer transitions, and Big-O Time/Space complexity.
   - DO NOT output programming code blocks unless explicitly requested by the user. Focus on the visual diagram and conceptual teaching.
2. Speak naturally and helpfully like a knowledgeable mentor.
3. NEVER mention being a doctor or a healthcare assistant. You are Tyloop.`;

/**
 * Extract Mermaid diagram code from markdown response if present (completed or in-progress stream)
 */
export function extractMermaidDiagram(markdown) {
    if (!markdown) return null;

    // 1. Completed mermaid block
    const match = markdown.match(/```(?:mermaid)\s*([\s\S]*?)```/i);
    if (match) {
        const candidate = match[1].trim();
        if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart)/i.test(candidate)) {
            return candidate;
        }
    }

    // 2. In-progress streamed block (before trailing ``` is written)
    const streamMatch = markdown.match(/```(?:mermaid)\s*([\s\S]*)$/i);
    if (streamMatch) {
        const candidate = streamMatch[1].trim();
        if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart)/i.test(candidate) && candidate.split('\n').length >= 3) {
            return candidate;
        }
    }

    // 3. Fallback: Raw mermaid block printed without backticks
    const rawMatch = markdown.match(/(?:^|\n)((?:graph\s+(?:TD|TB|LR|RL|BT)|flowchart\s+(?:TD|TB|LR|RL|BT)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart)[\s\S]*?)(?=\n(?:[A-Z0-9#*-]|Teacher Breakdown|Step-by-Step Trace|Key Takeaways|Intuition|Big-O|Complexity|Explanation|\n\n\n|$))/i);
    if (rawMatch) {
        const candidate = rawMatch[1].trim();
        if (candidate.split('\n').length >= 2) {
            return candidate;
        }
    }

    return null;
}

/**
 * Send a message to Ollama and stream the response
 */
export async function streamChat(messages, onToken, signal, model = null, modeData = null) {
    let systemPrompt = SYSTEM_PROMPT;

    if (modeData?.isInterviewMode) {
        systemPrompt = `You are Tyloop, a world-class professional Lead Interviewer at Tyloop AI.
        CONTEXT: You are interviewing a candidate for the following role/description: ${modeData.jobDescription}
        
        DIRECTIONS:
        1. Identify yourself as "Tyloop, Lead Recruiter at Tyloop AI".
        2. Conduct a realistic, high-pressure yet professional interview.
        3. CRITICAL: NEVER use placeholders like "[Your Name]", "[Company Name]", or brackets of any kind. 
        4. If a company name is not in the description, you represent "Tyloop AI". 
        5. Ask exactly ONE question at a time.
        6. Do not break character. Wait for the candidate's response.
        7. In your first message, introduce yourself professionally as Tyloop and ask the first opening question.
        8. Use a sophisticated, corporate tone.`;
    } else if (modeData?.isVisualizeMode) {
        systemPrompt = `You are Tyloop, a world-class Visual Educator and Technical Teacher.
        CONTEXT: The student is in a visual classroom learning about: ${modeData.activeConcept || 'their requested topic'}.

        DIRECTIONS:
        1. YOU MUST SELECT THE BEST DIAGRAM TYPE FOR THE SPECIFIC TOPIC:
           - 📡 FOR PROTOCOLS / NETWORKING / CLIENT-SERVER (e.g. Stop & Wait, TCP 3-way handshake, DNS, OAuth, API exchange):
             MUST use 'sequenceDiagram' with participants, sequential numbered arrows, and notes.
             Example:
             \`\`\`mermaid
             sequenceDiagram
                 autonumber
                 participant S as "Sender (Host A)"
                 participant R as "Receiver (Host B)"
                 Note over S,R: Stop-and-Wait Transmission Cycle
                 S->>R: Frame 0 (Data Packet)
                 R-->>S: ACK 0 (Acknowledged)
                 S->>R: Frame 1 (Data Packet)
                 R-->>S: ACK 1 (Acknowledged)
             \`\`\`

           - FOR CIRCUITS / ELECTRONICS / HARDWARE / LOGIC GATES:
             MUST use 'graph LR' with authentic schematic symbols and component rails:
             Example:
             \`\`\`mermaid
             graph LR
                 subgraph Circuit ["5V Regulated DC Circuit"]
                     VCC["🔋 [ + ] 9V Battery Source"] --> SW["[ / ] Power Switch (Closed)"]
                     SW --> D1["[ ▷| ] 1N4007 Diode (Protection)"]
                     D1 --> C1["-[||]- Filter Cap (100μF)"]
                     D1 --> VR["[ ┌─ 7805 Reg ─┐ ]"]
                     VR --> R1["-/\/\/\- Limiting Resistor (220Ω)"]
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
             Digital Logic Gates: Use \`[ =D= AND ]\`, \`[ =)= OR ]\`, \`[ ▷o NOT ]\`, \`[ =Do NAND ]\`, \`[ =))= XOR ]\`.
             Transistors/MOSFETs: Use \`[ BJT NPN: B ─▶ E, C ]\`, \`[ NMOS: G ┤├ D, S ]\`.
             Always quote edge signals: e.g. \`SW -->|"High: 5V"| R1\`.

           - FOR LIFECYCLES / PROCESS STATES / CPU SCHEDULING:
             MUST use 'stateDiagram-v2' with state transitions.
             Example:
             \`\`\`mermaid
             stateDiagram-v2
                 [*] --> Ready: Process Spawned
                 Ready --> Running: CPU Scheduled
                 Running --> Blocked: I/O Wait
                 Blocked --> Ready: I/O Complete
                 Running --> Terminated: Exit
                 Terminated --> [*]
             \`\`\`

           - FOR TREES (BST, AVL, Heap, Trie, Tree Traversal):
             YOU MUST DRAW THE ACTUAL TREE HIERARCHY using parent-child branching in \`\`\`mermaid (NOT a procedural flowchart):
             Example:
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

           - FOR GRAPHS (Dijkstra, BFS/DFS, Shortest Path, MST, Topo Sort):
             YOU MUST DRAW THE ACTUAL GRAPH TOPOLOGY with vertices and weighted/directed edges:
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

           - FOR LINEAR ALGORITHMS (Two Pointers, Binary Search, Sliding Window):
             Draw the array chain with pointers and highlighted mid/target nodes.

           - THEORY & INTUITION (NO CODE BLOCKS UNLESS ASKED):
             UNDERNEATH THE DIAGRAM, explain the concept, step-by-step state transitions, node visits, and Big-O complexities. DO NOT output code blocks unless explicitly requested by the user.`;
    }

    const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => {
            const ollamaMsg = { role: msg.role, content: msg.content };
            if (msg.images && msg.images.length > 0) {
                ollamaMsg.images = msg.images;
            }
            return ollamaMsg;
        }),
    ];

    // Use requested model or fallback to image-capable one if needed
    let selectedModel = model;
    if (!selectedModel) {
        const hasImage = messages.some(msg => msg.images && msg.images.length > 0);
        selectedModel = hasImage ? 'qwen3-vl:4b' : 'qwen2.5-coder:7b';
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: selectedModel,
            messages: ollamaMessages,
            stream: true,
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let lineBuffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop();

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                    fullResponse += json.message.content;
                    onToken(fullResponse);
                }
            } catch (e) {
                console.warn('Malformed JSON chunk:', line);
            }
        }
    }

    return fullResponse;
}

/**
 * Generate a summary of the conversation
 */
export async function generateSummary(messages) {
    const summaryPrompt = `Based on the following conversation, generate a short, descriptive title for this chat session.
Respond ONLY with the title string, no quotes or extra text.

CONVERSATION:
${messages.slice(0, 5).map((m) => `${m.role}: ${m.content}`).join('\n')}
`;

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'qwen2.5-coder:7b',
            messages: [{ role: 'user', content: summaryPrompt }],
            stream: false,
        }),
    });

    const data = await response.json();
    return data.message?.content?.trim() || 'New Chat';
}

/**
 * List locally downloaded models
 */
export async function listLocalModels() {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        return data.models || [];
    } catch (e) {
        console.error('List models error:', e);
        return [];
    }
}

/**
 * Pull (download) a new model from Ollama
 */
export async function pullModel(modelName, onProgress) {
    const response = await fetch(`${OLLAMA_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const json = JSON.parse(line);
                if (onProgress) onProgress(json);
            } catch (e) {
                console.warn('Malformed JSON chunk in pull:', line);
            }
        }
    }
}

export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
