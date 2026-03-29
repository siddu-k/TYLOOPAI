import { useEffect } from 'react';
import useAppStore from '../stores/appStore';
import Sidebar from '../components/ui/Sidebar';
import ChatPanel from '../components/chat/ChatPanel';
import AvatarScene from '../components/avatar/AvatarScene';

export default function DashboardPage() {
    const { sidebarOpen, fetchSessions, currentSession, createSession } = useAppStore();

    useEffect(() => {
        fetchSessions();
    }, []);



    return (
        <div className="h-full w-full flex overflow-hidden bg-background">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content */}
            <div className="flex-1 flex min-w-0">
                {/* Chat Panel */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <ChatPanel />
                </div>

                {/* Avatar Panel */}
                <div className="hidden lg:flex w-[400px] xl:w-[480px] flex-col border-l border-border bg-card relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
                    <div className="flex-1 relative">
                        <AvatarScene />
                    </div>
                    <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Dr. Dhanvantari</p>
                                <p className="text-xs text-muted-foreground">AI Healthcare Assistant</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
