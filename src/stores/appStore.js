import { create } from 'zustand';
import { supabase } from '../config/supabase';

const useAppStore = create((set, get) => ({
    // ─── Auth ───
    user: null,
    profile: null,
    isDoctor: false,
    doctorProfile: null,
    authLoading: true,

    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setAuthLoading: (loading) => set({ authLoading: loading }),

    initAuth: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                set({ user: session.user });
                await get().fetchProfile(session.user.id);
                get().fetchLocation();
            }
        } catch (err) {
            console.error('Auth init error:', err);
        } finally {
            set({ authLoading: false });
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                set({ user: session.user });
                await get().fetchProfile(session.user.id);
                get().fetchLocation();
            } else {
                set({
                    user: null,
                    profile: null,
                    isDoctor: false,
                    doctorProfile: null,
                    sessions: [],
                    currentSession: null,
                    messages: []
                });
            }
        });
    },

    fetchProfile: async (userId) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // Try to fetch doctor profile if they are a doctor
        const { data: doctor } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (profile) {
            set({
                profile,
                isDoctor: !!doctor,
                doctorProfile: doctor || null
            });
        }
    },

    fetchLocation: async () => {
        const user = get().user;
        if (!user || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const currentProfile = get().profile;
            const isDoc = get().isDoctor;

            // Sync to DB if new or changed significantly (to save writes)
            if (!currentProfile?.latitude || Math.abs(currentProfile.latitude - latitude) > 0.001) {
                // Update profile
                await supabase.from('profiles').update({ latitude, longitude }).eq('id', user.id);
                set(state => ({ profile: { ...state.profile, latitude, longitude } }));

                // Keep doctor table in sync
                if (isDoc) {
                    await supabase.from('doctors').update({ latitude, longitude }).eq('id', user.id);
                    set(state => ({ doctorProfile: { ...state.doctorProfile, latitude, longitude } }));
                }
            }
        }, (err) => {
            console.warn('Geolocation denied or failed:', err.message);
        });
    },

    signOut: async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Supabase signout error:', err);
        } finally {
            // Force clear local state even if network fails
            set({
                user: null,
                profile: null,
                isDoctor: false,
                doctorProfile: null,
                sessions: [],
                currentSession: null,
                messages: [],
                currentPage: 'dashboard'
            });
        }
    },

    // ─── Navigation ───
    currentPage: 'dashboard',
    setCurrentPage: (page) => set({ currentPage: page }),

    // ─── Chat Sessions ───
    sessions: [],
    currentSession: null,
    messages: [],
    isAiTyping: false,

    setSessions: (sessions) => set({ sessions }),
    setCurrentSession: (session) => set({ currentSession: session }),
    setMessages: (messages) => set({ messages }),
    setIsAiTyping: (typing) => set({ isAiTyping: typing }),

    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
    })),

    updateLastMessage: (content) => set((state) => {
        const msgs = [...state.messages];
        if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
        }
        return { messages: msgs };
    }),

    fetchSessions: async () => {
        const user = get().user;
        if (!user) return;
        const { data } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data && data.length > 0) {
            set({ sessions: data });
            // If no session is selected, select the first one and load its messages
            if (!get().currentSession) {
                const latest = data[0];
                set({ currentSession: latest });
                get().loadSessionMessages(latest.id);
            }
        }
    },

    createSession: async () => {
        const user = get().user;
        if (!user) return null;
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({ user_id: user.id, title: 'New Consultation' })
            .select()
            .single();
        if (data) {
            set((state) => ({
                sessions: [data, ...state.sessions],
                currentSession: data,
                messages: [],
            }));
            return data;
        }
        return null;
    },

    loadSessionMessages: async (sessionId) => {
        const { data } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
        if (data) set({ messages: data });
    },

    saveMessage: async (sessionId, role, content, imageUrl = null) => {
        const { data } = await supabase
            .from('chat_messages')
            .insert({ session_id: sessionId, role, content, image_url: imageUrl })
            .select()
            .single();
        return data;
    },

    deleteSession: async (sessionId) => {
        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId);

        if (!error) {
            set((state) => {
                const newSessions = state.sessions.filter(s => s.id !== sessionId);
                const isCurrent = state.currentSession?.id === sessionId;
                return {
                    sessions: newSessions,
                    currentSession: isCurrent ? (newSessions[0] || null) : state.currentSession,
                    messages: isCurrent ? [] : state.messages
                };
            });
            // If we deleted the current session and there's a new "first" session, load its messages
            const current = get().currentSession;
            if (current) {
                get().loadSessionMessages(current.id);
            }
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
}));

export default useAppStore;
