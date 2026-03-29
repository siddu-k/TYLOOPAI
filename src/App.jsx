import { useEffect } from 'react';
import useAppStore from './stores/appStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DoctorDashboard from './pages/DoctorDashboard';
import ProfilePage from './pages/ProfilePage';

export default function App() {
    const { user, isDoctor, authLoading, initAuth, currentPage } = useAppStore();

    useEffect(() => {
        initAuth();
    }, []);

    if (authLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">Loading Dhanvantari AI...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    switch (currentPage) {
        case 'profile':
            return <ProfilePage />;
        case 'dashboard':
        default:
            return isDoctor ? <DoctorDashboard /> : <DashboardPage />;
    }
}
