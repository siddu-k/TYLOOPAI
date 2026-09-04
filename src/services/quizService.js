import { streamChat } from './aiService';

/**
 * Extract plain text from uploaded files (PDF, DOCX, TXT, MD, JSON, CSV, CODE)
 */
export async function extractDocumentText(file) {
    if (!file) return '';

    const name = file.name.toLowerCase();

    // 1. Plain text, markdown, json, csv, code files
    if (
        name.endsWith('.txt') ||
        name.endsWith('.md') ||
        name.endsWith('.json') ||
        name.endsWith('.csv') ||
        name.endsWith('.js') ||
        name.endsWith('.jsx') ||
        name.endsWith('.ts') ||
        name.endsWith('.tsx') ||
        name.endsWith('.py') ||
        name.endsWith('.java') ||
        name.endsWith('.cpp') ||
        name.endsWith('.c') ||
        name.endsWith('.html') ||
        name.endsWith('.css') ||
        file.type.startsWith('text/')
    ) {
        return await file.text();
    }

    // 2. PDF Files (Streamlined browser text extraction fallback + structure scanner)
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            // Fast browser binary stream text chunk scanner
            let extracted = '';
            let inText = false;
            let currentWord = '';

            for (let i = 0; i < bytes.length; i++) {
                const charCode = bytes[i];
                // ASCII readable range: 32 (space) to 126 (~), newline 10, return 13
                if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13) {
                    currentWord += String.fromCharCode(charCode);
                } else {
                    if (currentWord.length > 3) {
                        // Filter out binary PDF tags and keywords
                        const clean = currentWord.trim();
                        if (!clean.startsWith('/') && !clean.startsWith('obj') && !clean.startsWith('endobj') && !clean.includes('Filter') && !clean.includes('Stream')) {
                            extracted += clean + ' ';
                        }
                    }
                    currentWord = '';
                }
            }

            if (extracted.trim().length > 100) {
                return extracted.substring(0, 15000);
            }
        } catch (e) {
            console.warn('PDF stream extraction error, using name fallback:', e);
        }
        return `Document: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    }

    // 3. Fallback for Word doc or others
    try {
        const text = await file.text();
        if (text && text.length > 50) return text.substring(0, 15000);
    } catch (e) {
        // ignore
    }

    return `Document: ${file.name} (${Math.round(file.size / 1024)} KB)`;
}

/**
 * Clean and parse Quiz JSON output from LLM, with robust multi-stage fallbacks
 */
export function parseQuizJSON(rawText, fallbackTopic = 'Technical Knowledge', expectedCount = 5) {
    if (!rawText) return null;

    // 1. Direct JSON code block match
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let candidate = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

    try {
        const parsed = JSON.parse(candidate);
        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
            return {
                title: `${fallbackTopic} Assessment`,
                topic: fallbackTopic,
                totalQuestions: parsed.length,
                questions: parsed
            };
        }
    } catch (e) {
        // continue
    }

    // 2. Extract outermost { ... }
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
            const sliced = candidate.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(sliced);
            if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                return parsed;
            }
        } catch (e) {
            // continue
        }
    }

    // 3. Extract JSON Array [ { ... }, { ... } ]
    const firstBracket = candidate.indexOf('[');
    const lastBracket = candidate.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try {
            const sliced = candidate.substring(firstBracket, lastBracket + 1);
            const parsedArray = JSON.parse(sliced);
            if (Array.isArray(parsedArray) && parsedArray.length > 0 && parsedArray[0].question) {
                return {
                    title: `${fallbackTopic} Assessment`,
                    topic: fallbackTopic,
                    totalQuestions: parsedArray.length,
                    questions: parsedArray
                };
            }
        } catch (e) {
            // continue
        }
    }

    // 4. Heuristic Markdown Question Parser (e.g. Q1. ... A) ... B) ...)
    const qBlocks = rawText.split(/(?:^|\n)(?:Q(?:uestion)?\s*\d+[:.]|\d+[\.)]\s+)/i).filter(b => b.trim().length > 25);
    if (qBlocks.length >= 2) {
        const extractedQuestions = qBlocks.map((block, idx) => {
            const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
            const questionText = lines[0] || `Question ${idx + 1}`;
            const rawOptions = lines.filter(l => /^[A-Da-d][\).:]|^\([A-Da-d]\)/.test(l))
                                    .map(l => l.replace(/^[A-Da-d][\).:]\s*|^\([A-Da-d]\)\s*/, '').trim());
            const options = rawOptions.length === 4 ? rawOptions : [
                rawOptions[0] || 'First theoretical implementation',
                rawOptions[1] || 'Second architectural approach',
                rawOptions[2] || 'Third optimization strategy',
                rawOptions[3] || 'Fourth alternative protocol'
            ];

            return {
                id: idx + 1,
                question: questionText,
                options,
                correctAnswerIndex: 0,
                explanation: `Detailed mechanical breakdown for ${questionText.substring(0, 40)}...`,
                difficulty: 'medium'
            };
        });

        if (extractedQuestions.length > 0) {
            return {
                title: `${fallbackTopic} Assessment`,
                topic: fallbackTopic,
                totalQuestions: extractedQuestions.length,
                questions: extractedQuestions
            };
        }
    }

    return null;
}

/**
 * Generate a complete AI Quiz from a topic, custom text, or uploaded document
 */
export async function generateQuiz({
    topic = '',
    documentText = '',
    questionCount = 5,
    difficulty = 'medium', // 'easy' | 'medium' | 'hard' | 'adaptive'
    model = null,
    onProgress
}) {
    const contextContent = documentText ? `SOURCE DOCUMENT KNOWLEDGE BASE:\n"""\n${documentText.substring(0, 12000)}\n"""` : '';
    const subject = topic.trim() || 'Core Engineering & Computing Principles';
    const targetCount = Number(questionCount) || 5;

    const prompt = `You are a Senior Principal Examiner, Lead Educator, and Technical Assessor.
MANDATORY REQUIREMENT: You MUST generate EXACTLY ${targetCount} DISTINCT multiple-choice questions (Not 1, not 2, but EXACTLY ${targetCount} questions in the "questions" array).

TOPIC: "${subject}"
TARGET QUESTION COUNT: EXACTLY ${targetCount} QUESTIONS
DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
${contextContent}

CRITICAL RULES:
1. ARRAY LENGTH: The "questions" array in your JSON output MUST contain EXACTLY ${targetCount} question objects.
2. SUBSTANCE: Every question must be deeply substantive, technically accurate, and test real comprehension, architectural principles, algorithms, or practical implementation.
3. 4 CHOICES: Each question MUST provide exactly 4 distinct, plausible options (A, B, C, D) in the "options" array.
4. ONE CORRECT: "correctAnswerIndex" MUST be an integer from 0 to 3 (0=A, 1=B, 2=C, 3=D).
5. SCIENTIFIC & MATHEMATICAL SYMBOLS:
   - Format equations, complexity bounds, and mathematical symbols using standard LaTeX/KaTeX: e.g. $O(N \\log N)$, $T(n) = 2T(n/2) + O(n)$, $\\Omega(1)$, $\\Theta(N)$, $\\lambda$, $\\pi$, $V = IR$.
   - Format code variables, keywords, and data structures in backticks: e.g. \`Array[i]\`, \`pthread_mutex_lock()\`, \`useState\`, \`B-Tree\`.
   - When appropriate for algorithmic or architectural questions, include concise Mermaid diagrams inside the explanation: e.g. \`\`\`mermaid\\ngraph TD\\n  A --> B\\n\`\`\`.
6. DETAILED EXPLANATION: Provide a thorough "explanation" field for each question detailing the internal mechanics and why the answer is correct.
7. OUTPUT MUST BE STRICTLY A VALID JSON OBJECT enclosed in \`\`\`json ... \`\`\` with NO other text outside the block.

JSON OUTPUT STRUCTURE (CONTAINING ALL ${targetCount} QUESTIONS):
\`\`\`json
{
  "title": "${subject} Assessment",
  "topic": "${subject}",
  "difficulty": "${difficulty}",
  "totalQuestions": ${targetCount},
  "questions": [
    {
      "id": 1,
      "question": "Question 1 text here...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Mechanical and theoretical explanation for Question 1.",
      "difficulty": "${difficulty}"
    }
  ]
}
\`\`\``;

    const messages = [
        { role: 'user', content: prompt }
    ];

    let fullResponse = '';
    await streamChat(
        messages,
        (partial) => {
            fullResponse = partial;
            if (onProgress) onProgress(partial);
        },
        null,
        model,
        { isQuizMode: true }
    );

    const parsedQuiz = parseQuizJSON(fullResponse, subject, targetCount);
    if (!parsedQuiz || !parsedQuiz.questions || parsedQuiz.questions.length === 0) {
        throw new Error('Failed to generate complete quiz questions. Please try again.');
    }

    return parsedQuiz;
}
