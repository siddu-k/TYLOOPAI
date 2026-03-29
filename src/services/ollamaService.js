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
 * Send a message to Ollama and stream the response
 */
export async function streamChat(messages, onToken, signal, model = null, interviewData = null) {
    let systemPrompt = SYSTEM_PROMPT;

    if (interviewData?.isInterviewMode) {
        systemPrompt = `You are Tyloop, a world-class professional Lead Interviewer at Tyloop AI.
        CONTEXT: You are interviewing a candidate for the following role/description: ${interviewData.jobDescription}
        
        DIRECTIONS:
        1. Identify yourself as "Tyloop, Lead Recruiter at Tyloop AI".
        2. Conduct a realistic, high-pressure yet professional interview.
        3. CRITICAL: NEVER use placeholders like "[Your Name]", "[Company Name]", or brackets of any kind. 
        4. If a company name is not in the description, you represent "Tyloop AI". 
        5. Ask exactly ONE question at a time.
        6. Do not break character. Wait for the candidate's response.
        7. In your first message, introduce yourself professionally as Tyloop and ask the first opening question.
        8. Use a sophisticated, corporate tone.`;
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
