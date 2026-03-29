/**
 * Voice Service — Web Speech API wrappers for STT and TTS
 */

// ─── Speech-to-Text ───
let recognition = null;

export function isSTTSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startListening(onResult, onEnd, onError) {
    if (!isSTTSupported()) {
        onError?.('Speech recognition not supported in this browser');
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interim += transcript;
            }
        }
        onResult?.(finalTranscript || interim, !!(finalTranscript));
    };

    recognition.onend = () => {
        onEnd?.(finalTranscript);
    };

    recognition.onerror = (event) => {
        if (event.error !== 'aborted') {
            onError?.(event.error);
        }
    };

    recognition.start();
    return recognition;
}

export function stopListening() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
}

import { lipsyncManager } from './lipsyncService';

// ─── Text-to-Speech ───
let currentAudio = null;
let audioQueue = [];
let isAudioPlaying = false;
let onEndGlobal = null;

export function isTTSSupported() {
    // We are now using web audio, which is always supported
    return true;
}

// Helper to chunk text for the free TTS API limits
function chunkText(text) {
    const regex = /[^.?!]+[.?!]+|[^.?!]+$/g;
    return text.match(regex) || [text];
}

function playNextChunk() {
    if (audioQueue.length === 0) {
        isAudioPlaying = false;
        if (onEndGlobal) onEndGlobal();
        return;
    }

    const chunk = audioQueue.shift();
    // Use the Vite proxy `/api/tts` to bypass CORS for free high-quality human-like voice
    const url = `/api/tts/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=${encodeURIComponent(chunk.substring(0, 200))}`;

    currentAudio = new Audio(url);
    currentAudio.crossOrigin = "anonymous"; // Required for Web Audio API Analyzer

    currentAudio.onended = () => {
        playNextChunk();
    };

    currentAudio.onerror = (e) => {
        console.error("TTS Audio error", e);
        playNextChunk(); // Skip chunk on error
    };

    // Connect this physical audio element to the lipsync manager!
    lipsyncManager.connectAudio(currentAudio);

    isAudioPlaying = true;
    currentAudio.play().catch(err => {
        console.error("Audio playback prevented:", err);
        // Playback might be prevented by browser autoplay policies
        playNextChunk();
    });
}

export function speak(text, onStart, onEnd) {
    stopSpeaking(); // clear previous
    onEndGlobal = onEnd;
    onStart?.();
    enqueueSpeech(text);
}

export function enqueueSpeech(text) {
    // Clean markdown before speaking
    const cleanText = text.replace(/[*_#`~>]/g, '').trim();

    const chunks = chunkText(cleanText).filter(c => c.trim().length > 0);
    if (chunks.length === 0) return;

    audioQueue.push(...chunks);

    // If nothing is playing right now, start consuming the queue
    if (!isAudioPlaying) {
        playNextChunk();
    }
}

export function stopSpeaking() {
    audioQueue = [];
    if (currentAudio) {
        // Critical: remove event listeners BEFORE pausing/clearing src 
        // to prevent asynchronous onerror callbacks from starting a parallel queue
        currentAudio.onended = null;
        currentAudio.onerror = null;

        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }
    isAudioPlaying = false;
}

export function isSpeaking() {
    return isAudioPlaying;
}
