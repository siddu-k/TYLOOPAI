const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';

const SYSTEM_PROMPT = `You are Dr. Dhanvantari, a highly experienced, caring, real human doctor on the Dhanvantari AI platform. 

CRITICAL RULES:
- YOUR RESPONSES ARE SPOKEN OUT LOUD BY A REAL-TIME TEXT-TO-SPEECH ENGINE.
- Speak exactly like a real human naturally speaking out loud to a patient on a voice call.
- NEVER use parentheses, asterisks, emojis, abstractions or long bulleted lists.
- Be highly concise. Provide only 1 to 3 short sentences.
- NEVER write essays or chatbot overviews.
- Identify the problem directly and state what to do. Provide the quickest possible response.
- DOCTOR MATCHING: You DO have access to doctors! If a patient asks to book an appointment or needs a specialist, tell them to click the "End Session & Generate Summary" button on their screen. The system will automatically match them with our available doctors for 1-click booking based on your category recommendation.`;

/**
 * Send a message to Ollama and stream the response
 * @param {Array} messages - Chat history [{role, content, images?}]
 * @param {Function} onToken - Callback for each streamed token
 * @param {AbortSignal} signal - AbortController signal
 */
export async function streamChat(messages, onToken, signal) {
    const ollamaMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((msg) => {
            const ollamaMsg = { role: msg.role, content: msg.content };
            if (msg.images && msg.images.length > 0) {
                ollamaMsg.images = msg.images;
            }
            return ollamaMsg;
        }),
    ];

    // Choose model based on whether any message has an image attachment
    const hasImage = messages.some(msg => msg.images && msg.images.length > 0);
    const selectedModel = hasImage ? 'qwen3-vl:4b' : 'qwen2.5-coder:7b';

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
        lineBuffer = lines.pop(); // Keep the last partial line in the buffer

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
 * Generate a medical summary from chat history
 */
export async function generateSummary(messages) {
    const summaryPrompt = `Based on the following consultation conversation, generate a structured medical summary in JSON format with these fields:
- "chief_complaint": Main reason for consultation
- "symptoms": Array of reported symptoms
- "observations": Array of observations (including from images if any)
- "possible_conditions": Array of possible conditions (educational, not diagnostic) 
- "severity": "low" | "moderate" | "high" | "critical"
- "recommendations": Array of recommended next steps
- "should_escalate": boolean - true if patient should see a doctor soon
- "specialist_type": Suggested specialist if applicable

CONVERSATION:
${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}

Respond ONLY with valid JSON, no markdown or explanation.`;

    const hasImage = messages.some(msg => msg.images && msg.images.length > 0);
    const selectedModel = hasImage ? 'qwen3-vl:4b' : 'qwen2.5-coder:7b';

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: summaryPrompt }],
            stream: false,
        }),
    });

    const data = await response.json();
    try {
        const content = data.message?.content || '';
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('Failed to parse summary:', e);
    }
    return null;
}

/**
 * Convert a File to base64 string (without data URL prefix)
 */
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
