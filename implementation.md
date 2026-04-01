# Tyloop AI — 24-Hour Hackathon Implementation Plan

This roadmap provides a chronological sequence for building the Tyloop application from zero to a polished demo.

---

### **Phase 1: Environment & Foundation (Hours 1–3)**
**Goal**: Set up the development pipeline and core architecture.
1.  **Project Initialization**: 
    - Create Electron + Vite + React project.
    - Install dependencies: `three`, `@react-three/fiber`, `zustand`, `lucide-react`, `wawa-lipsync`, `@supabase/supabase-js`.
2.  **Tailwind 4 Setup**: 
    - Configure the Zinc Dark Theme variables in `index.css`.
    - Setup the "Glassmorphism" panel class.
3.  **Electron Main Process**: 
    - Build `electron/main.js` for window creation and IPC.

---

### **Phase 2: Database & Auth (Hours 4–5)**
**Goal**: Connect the backend for persistent user data.
1.  **Supabase Initialization**: 
    - Run the `supabase_schema.sql` in the Supabase SQL editor.
    - Configure `supabase.js` client with environment variables.
2.  **Zustand Store**: 
    - Create `appStore.js` with `localStorage` persistence.
    - Implement `userName` and `selectedModel` state.

---

### **Phase 3: Core UI & Sidebar (Hours 6–8)**
**Goal**: Build the main navigation and skeleton.
1.  **Navigation System**: 
    - Implement the `Sidebar.jsx` with "New Chat" and "Assistant Hub" links.
    - Create page routing logic (Dashboard, Settings, Doubt, Onboarding).
2.  **Dashboard Layout**: 
    - Set up the responsive two-column grid.
3.  **Onboarding**: 
    - Build the `OnboardingPage.jsx` naming form.

---

### **Phase 4: 3D Scene & Avatar (Hours 9–12)**
**Goal**: Bring the "Heart" of Tyloop to life.
1.  **GLTF Loading**: 
    - Load the avatar GLB and animations using `@react-three/drei`.
2.  **AvatarScene**: 
    - Set up clinical/premium lighting (ambient + directional + cyan/teal accents).
3.  **Blinking Logic**: 
    - Add the `useEffect`/`lerp` loop for realistic blinking in `DoctorAvatar.jsx`.

---

### **Phase 5: Lip Sync & Voice Logic (Hours 13–16)**
**Goal**: Real-time interaction loop.
1.  **Lip Sync Service**: 
    - Integrate `wawa-lipsync` and verify morph target mapping.
2.  **Audio Analysis**: 
    - Connect TTS output to the `lipsyncManager` frequency analyzer.
3.  **Voice Service**: 
    - Implement STT (Web Speech) and chunked Google Translate TTS.

---

### **Phase 6: Interview Mode (Hours 17–20)**
**Goal**: The signature split-screen experience.
1.  **Interview Split-Screen**: 
    - Style the special header with `Live` indicators and `End Interview` button.
2.  **Video Feeds**: 
    - Implement the AI pane (Avatar) vs User pane (Webcam).
3.  **Voice-to-Voice Loop**: 
    - Orchestrate the auto-mic restart-after-AI-speaking logic.

---

### **Phase 7: Polishing & Deployment (Hours 21–24)**
**Goal**: "Wow" factor and bug fixing.
1.  **Animations**: 
    - Add Tailwind `animate-fade-in` and `pulse-ring` transitions.
2.  **Documentation**: 
    - Finalize `projectdoc.md` and `ppt.md` for the presentation.
3.  **Smoke Test**: 
    - Verify Ollama model downloading and history persistence.
4.  **Submission**: 
    - Package the Electron app (if required) or record the demo video.

---

**[Hackathon Ready]**
