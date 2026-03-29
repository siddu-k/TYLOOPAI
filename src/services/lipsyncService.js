import { Lipsync } from 'wawa-lipsync';

/**
 * Lip Sync Service — manages wawa-lipsync instance and audio connections
 */

export const lipsyncManager = new Lipsync({});

let animationFrameId = null;
let audioContext = null;

/**
 * Start the lipsync processing loop
 */
export function startProcessing() {
    if (animationFrameId) return;

    const loop = () => {
        animationFrameId = requestAnimationFrame(loop);
        lipsyncManager.processAudio();
    };
    loop();
}

/**
 * Stop the lipsync processing loop
 */
export function stopProcessing() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/**
 * Connect an audio element to the lipsync manager
 */
export function connectAudio(audioElement) {
    try {
        lipsyncManager.connectAudio(audioElement);
        startProcessing();
    } catch (e) {
        console.error('Lipsync audio connection error:', e);
    }
}

/**
 * Get the current viseme from lipsync manager
 */
export function getCurrentViseme() {
    return {
        viseme: lipsyncManager.viseme,
        state: lipsyncManager.state,
    };
}
