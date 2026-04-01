# Tyloop Project Rebuild Document (Exhaustive Hackathon Blueprint)

This document is the definitive "A to Z" guide for rebuilding the **Tyloop** application. It contains every technical specification, architecture detail, and core code snippet required for a complete replica.

---

## 1. Project Overview
Tyloop is an Electron-based AI assistant featuring a 3D medical avatar with real-time lip-syning, voice-to-voice interaction, and local model management.

---

## 2. Technical Stack
- **Frontend**: React 19, Vite 8, Tailwind CSS 4.
- **Desktop**: Electron 31 (Main/Renderer architecture).
- **State**: Zustand (Session, Voice, and Model states).
- **3D/Graphics**: Three.js, React Three Fiber (R3F), Drei.
- **Lip Sync**: `wawa-lipsync` (Audio-to-Viseme mapping).
- **Backend**: Supabase (PostgreSQL, Auth, Storage).
- **Local AI**: Ollama (Interfaced via fetch API).

---

## 3. UI/UX Design System (Zinc Dark)
- **Theme**: Shadcn-inspired Zinc 950 Dark.
- **Background**: `#09090b`
- **Surface/Card**: `#18181b` (Zinc 900)
- **Primary Accent**: `#fafafa` (Zinc 50)
- **Borders**: `#27272a` (Zinc 800)
- **Glassmorphism**: 
  ```css
  .glass-panel {
    background-color: rgba(9, 9, 11, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid #27272a;
  }
  ```

---

## 4. Core Services Logic (Deep Dive)

### A. Local AI Management (`ollamaService.js`)
Tyloop interacts directly with the local Ollama server (`http://localhost:11434`).

- **Stream Chatting**: Uses the `/api/chat` endpoint with `stream: true`.
- **Model Pulling (Download)**: Uses the `/api/pull` endpoint. It parses streaming JSON chunks to track progress:
  ```javascript
  // Download logic with progress tracking
  const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name: modelName, stream: true })
  });
  const reader = response.body.getReader();
  // Parse chunks for: { status: "downloading", completed: 123, total: 456 }
  ```

### B. Voice-to-Voice Stack (`voiceService.js`)
- **STT**: Uses the native browser `SpeechRecognition` API.
- **TTS**: Uses a free high-quality voice via a Vite proxy to Google Translate TTS:
  - Endpoint: `/api/tts/translate_tts?ie=UTF-8&tl=en-US&client=tw-ob&q=...`
  - **Chunking**: Text is split by sentence (`.?!`) and queued to avoid character limits and enable faster response starts.
- **Lip Sync Integration**: Each `Audio` object is passed to `lipsyncManager.connectAudio(currentAudio)` before playback.

---

## 5. 3D Avatar & Lip Sync Implementation

### `DoctorAvatar.jsx` (Core Logic)
Handles the 3D model loading and visibility of morph targets.

```javascript
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { lipsyncManager } from '../../services/lipsyncService';

export function DoctorAvatar(props) {
    const { nodes, materials, scene } = useGLTF('/models/avatar.glb');
    const group = useRef();

    useFrame(() => {
        // Real-time lip sync mapping
        lipsyncManager.processAudio();
        const { viseme, state } = lipsyncManager;

        scene.traverse((child) => {
            if (child.isSkinnedMesh && child.morphTargetDictionary) {
                const index = child.morphTargetDictionary[viseme];
                if (index !== undefined) {
                    child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
                        child.morphTargetInfluences[index], 1, 0.3
                    );
                }
                // Lerp all other visemes back to 0
                Object.keys(child.morphTargetDictionary).forEach(key => {
                    if (key !== viseme) {
                        const idx = child.morphTargetDictionary[key];
                        child.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
                            child.morphTargetInfluences[idx], 0, 0.1
                        );
                    }
                });
            }
        });
    });

    return <primitive object={nodes.Hips} ref={group} />;
}
```

---

## 6. Page & Button Map

### Dashboard
- **Interview Mode**: Split screen with `End Interview` (Closes video/mic).
- **Call Toggle**: Persistent button to enable/disable auto-mic (Voice Call mode).

### Settings
- **Model Grid**: Lists popular models (Llama 3.2, Qwen Coder).
- **Pull Button**: Triggers the Ollama pull stream and updates the `downloadProgress` bar.
- **Select Model**: Sets the active model for all future chat sessions.

### Onboarding
- **Continue**: Validates name input and initializes local `tyloop_user_name` storage.

---

## 7. Database Schema (Supabase)
- `profiles`: User info, age, gender, medical history (allergies, conditions).
- `chat_sessions`: Title, status, and AI severity summary.
- `chat_messages`: Full history with support for `image_url` (Vision).
- `medical_records`: File metadata and `file_url` for reports.

---

*This document is the complete source of truth for the Tyloop project.*
