import { create } from 'zustand';

// Helper to load from localStorage
const loadStorage = (key, defaultValue) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

// Helper to save to localStorage
const saveStorage = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const useAppStore = create((set, get) => ({
    // ─── Profile & Settings ───
    userName: loadStorage('tyloop_user_name', null),
    selectedModel: loadStorage('tyloop_selected_model', 'qwen2.5-coder:7b'),
    authLoading: false,
    isProcessing: false,
    isInterviewMode: false,
    activeJobDescription: '',
    interviewStarted: false,

    // ─── Model Management ───
    localModels: [],
    downloadingModel: null,
    downloadProgress: 0,
    downloadStatus: '',

    setLocalModels: (models) => set({ localModels: models }),
    setDownloadingModel: (model) => set({ downloadingModel: model }),
    setDownloadProgress: (progress) => set({ downloadProgress: progress }),
    setDownloadStatus: (status) => set({ downloadStatus: status }),

    setUserName: (name) => {
        set({ userName: name });
        saveStorage('tyloop_user_name', name);
    },
    setSelectedModel: (model) => {
        set({ selectedModel: model });
        saveStorage('tyloop_selected_model', model);
    },

    // ─── Navigation ───
    currentPage: 'dashboard',
    setCurrentPage: (page) => set({ currentPage: page }),

    // ─── Chat Sessions ───
    sessions: loadStorage('tyloop_sessions', []),
    currentSession: null,
    messages: [],
    isAiTyping: false,

    setSessions: (sessions) => {
        set({ sessions });
        saveStorage('tyloop_sessions', sessions);
    },
    setCurrentSession: (session) => {
        if (!session) {
            set({ currentSession: null, messages: [] });
            return;
        }
        // Clear messages immediately to avoid bleeding before loading new ones
        set({ currentSession: session, messages: [] });
        get().loadSessionMessages(session.id);
    },
    setMessages: (messages) => set({ messages }),
    setIsAiTyping: (typing) => set({ isAiTyping: typing }),
    setIsProcessing: (processing) => set({ isProcessing: processing }),
    setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

    startInterview: (description) => {
        set({
            isInterviewMode: true,
            activeJobDescription: description,
            currentPage: 'dashboard',
            interviewStarted: true
        });
        get().createSession(`Interview: ${description.substring(0, 20)}...`);
    },
    exitInterview: () => {
        set({
            isInterviewMode: false,
            activeJobDescription: '',
            currentPage: 'dashboard',
            interviewStarted: false
        });
        get().createSession('New Chat');
    },
    setInterviewStarted: (started) => set({ interviewStarted: started }),

    addMessage: (message) => {
        const newMessages = [...get().messages, message];
        set({ messages: newMessages });

        // Save to localStorage for this session
        const sessionId = get().currentSession?.id;
        if (sessionId) {
            saveStorage(`tyloop_messages_${sessionId}`, newMessages);
        }
    },

    updateLastMessage: (content) => set((state) => {
        const msgs = [...state.messages];
        if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
        }

        // Save to localStorage
        const sessionId = state.currentSession?.id;
        if (sessionId) {
            saveStorage(`tyloop_messages_${sessionId}`, msgs);
        }

        return { messages: msgs };
    }),

    fetchSessions: () => {
        const sessions = loadStorage('tyloop_sessions', []);
        set({ sessions });
        if (sessions.length > 0) {
            if (!get().currentSession) {
                const latest = sessions[0];
                set({ currentSession: latest });
                get().loadSessionMessages(latest.id);
            }
        } else {
            set({ currentSession: null, messages: [] });
        }
    },

    createSession: () => {
        const newSession = {
            id: crypto.randomUUID(),
            user_id: 'guest',
            title: 'New Chat',
            created_at: new Date().toISOString()
        };

        const sessions = [newSession, ...get().sessions];
        set({
            sessions,
            currentSession: newSession,
            messages: []
        });
        saveStorage('tyloop_sessions', sessions);
        return newSession;
    },

    loadSessionMessages: (sessionId) => {
        const messages = loadStorage(`tyloop_messages_${sessionId}`, []);
        set({ messages });
    },

    saveMessage: (sessionId, role, content, imageUrl = null) => {
        const newMessage = {
            id: crypto.randomUUID(),
            session_id: sessionId,
            role,
            content,
            image_url: imageUrl,
            created_at: new Date().toISOString()
        };
        get().addMessage(newMessage);
        return newMessage;
    },

    deleteSession: (sessionId) => {
        const newSessions = get().sessions.filter(s => s.id !== sessionId);
        const isCurrent = get().currentSession?.id === sessionId;

        set({
            sessions: newSessions,
            currentSession: isCurrent ? (newSessions[0] || null) : get().currentSession,
            messages: isCurrent ? [] : get().messages
        });

        saveStorage('tyloop_sessions', newSessions);
        localStorage.removeItem(`tyloop_messages_${sessionId}`);

        if (isCurrent && newSessions[0]) {
            get().loadSessionMessages(newSessions[0].id);
        }
    },

    // ─── Voice State ───
    isListening: false,
    isSpeaking: false,
    setIsListening: (val) => set({ isListening: val }),
    setIsSpeaking: (val) => set({ isSpeaking: val }),

    // ─── Sidebar ───
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    // Mocks for compatibility
    initAuth: () => set({ authLoading: false }),
    signOut: () => {
        localStorage.clear();
        set({
            userName: null,
            selectedModel: 'qwen2.5-coder:7b',
            sessions: [],
            currentSession: null,
            messages: [],
            currentPage: 'dashboard'
        });
    }
}));

export default useAppStore;
