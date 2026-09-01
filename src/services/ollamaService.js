const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';

const SYSTEM_PROMPT = `You are Tyloop, a versatile and intelligent multipurpose AI assistant. 

Your goal is to help users with a wide range of tasks, including:
- Preparing for interviews (mock interviews, feedback).
- Creating and conducting quizzes on any topic.
- Facilitating learning by explaining complex concepts simply.
- General productivity and creative assistance.

CRITICAL RULES:
1. Speak naturally and helpfuly, like a knowledgeable friend or mentor.
2. Be concise but thorough when explaining concepts.
3. For interviews: Act as a professional interviewer, ask one question at a time, and provide constructive feedback.
4. For quizzes: Present questions clearly, wait for the user's answer, and then provide the correct explanation.
5. NEVER mention being a doctor or a healthcare assistant. You are Tyloop.`;

/**
 * Extract Mermaid diagram code from markdown response if present
 */
export function extractMermaidDiagram(markdown) {
    if (!markdown) return null;
    const match = markdown.match(/```(?:mermaid)\s*([\s\S]*?)```/i);
    if (match) {
        const candidate = match[1].trim();
        // Verify it starts with a recognized mermaid diagram type
        if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|xychart)/i.test(candidate)) {
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
             MUST use 'graph LR' with component symbols and circuit rails.
             Example:
             \`\`\`mermaid
             graph LR
                 subgraph Circuit ["DC Series Circuit"]
                     V1["( + ) 9V Battery Source"] --> SW["[ / ] Power Switch (Closed)"]
                     SW --> R1["[ -vvv- ] Resistor (220 Ohm)"]
                     R1 --> LED["[ ->| - ] LED Diode (Emitting Light)"]
                     LED --> GND["( - ) Ground / Negative Rail"]
                     GND -.->|Return Path| V1
                 end
             \`\`\`

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

           - FOR ALGORITHMS & DATA STRUCTURES (e.g. Binary Search, Merge Sort, QuickSort, Two Pointers, BFS/DFS, Dijkstra, DP, Sliding Window):
             DO NOT give abstract or vague logic boxes.
             YOU MUST PROVIDE A CONCRETE VISUAL TRACE WITH ACTUAL NUMBERS/DATA:
             1. Show the sample input data (e.g. Array: [2, 5, 8, 12, 16, 23, 38], Target: 23).
             2. Show each step/pass with pointer positions (Low, High, Mid, Left, Right) and comparison outcomes.
             3. Show the final output and Big-O Complexity.
             Example:
             \`\`\`mermaid
             graph TD
                 subgraph Input ["Initial Array: [2, 5, 8, 12, 16, 23, 38] | Target = 23"]
                     Arr["[0: 2] [1: 5] [2: 8] [3: 12] [4: 16] [5: 23] [6: 38]"]
                 end

                 subgraph Pass1 ["Pass 1: Low=0, High=6 -> Mid=3 (Val: 12)"]
                     P1["Compare: 12 < 23 (Target is Greater)"]
                     P1_Action["Action: Discard Left Half [0..3] -> Move Low = 4"]
                     P1 --> P1_Action
                 end

                 subgraph Pass2 ["Pass 2: Low=4, High=6 -> Mid=5 (Val: 23)"]
                     P2["Compare: 23 == 23 (Target Found!)"]
                     P2_Action["Action: Return Index 5"]
                     P2 --> P2_Action
                 end

                 subgraph Summary ["Complexity & Verdict"]
                     C1["Target 23 located in 2 comparisons"]
                     C2["Time Complexity: O(log N) | Space: O(1)"]
                     C1 --- C2
                 end

                 Input --> Pass1
                 Pass1_Action --> Pass2
                 P2_Action --> Summary
             \`\`\`

           - FOR DATABASES / DATA MODELS:
             MUST use 'erDiagram' with keys, field types, and relationships.

           - FOR CONCEPT BREAKDOWNS / TAXONOMIES / BRAINSTORMING:
             MUST use 'mindmap' with multi-level branches.

           - FOR MULTI-TIER SYSTEM ARCHITECTURES:
             Use 'graph TD' or 'graph LR' with styled subgraphs for Client Tier, API Gateway, Microservice Mesh, and Database/Cache Clusters.

        2. SYNTAX RULES:
           - ALWAYS enclose text in double quotes inside brackets: Node["Clean text here"].
           - Avoid unescaped parentheses or quotes inside node IDs.
           - Keep diagrams clean, intuitive, and mathematically/technically accurate.

        3. Follow the diagram with a warm, spoken teacher explanation explaining the intuition, line-by-line pointer movement, and why the algorithm is optimal.`;
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
