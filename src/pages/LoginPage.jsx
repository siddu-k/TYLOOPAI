import { useState } from 'react';
import { supabase } from '../config/supabase';
import useAppStore from '../stores/appStore';

export default function LoginPage() {
    const { fetchProfile } = useAppStore();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [role, setRole] = useState('patient');
    const [specialty, setSpecialty] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                    },
                });
                if (signUpError) throw signUpError;

                if (data.user && fullName) {
                    await supabase
                        .from('profiles')
                        .update({ full_name: fullName })
                        .eq('id', data.user.id);

                    if (role === 'doctor') {
                        await supabase
                            .from('doctors')
                            .insert({
                                id: data.user.id,
                                full_name: fullName,
                                specialty: specialty
                            });
                        // Force a refresh of the profile in the store so it registers them as a doctor
                        // because the initial onAuthStateChange fired before this table insert completed! 
                        await fetchProfile(data.user.id);
                    }
                }
                setSuccess('Account created! Check your email for verification, or sign in if email confirmation is disabled.');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg h-full w-full flex items-center justify-center p-4">
            {/* Background decorative elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-info/5 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
            </div>

            <div className="glass-card w-full max-w-md p-8 animate-fade-in-up relative z-10">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                            <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">Dhanvantari AI</h1>
                    <p className="text-muted-foreground text-sm mt-1">Your Virtual Healthcare Assistant</p>
                </div>

                {/* Toggle */}
                <div className="flex mb-6 bg-muted rounded-lg p-1">
                    <button
                        onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${!isSignUp
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${isSignUp
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div className="animate-fade-in space-y-4">
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                    <input type="radio" value="patient" checked={role === 'patient'} onChange={() => setRole('patient')} className="accent-primary" />
                                    <span>Patient</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                    <input type="radio" value="doctor" checked={role === 'doctor'} onChange={() => setRole('doctor')} className="accent-primary" />
                                    <span>Doctor</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder={role === 'doctor' ? "Dr. John Doe" : "John Doe"}
                                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                                    required
                                />
                            </div>

                            {role === 'doctor' && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Medical Specialty</label>
                                    <select
                                        value={specialty}
                                        onChange={(e) => setSpecialty(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                        required
                                    >
                                        <option value="">Select Specialty...</option>
                                        <option value="General Medicine">General Medicine</option>
                                        <option value="Cardiology">Cardiology</option>
                                        <option value="Dermatology">Dermatology</option>
                                        <option value="Neurology">Neurology</option>
                                        <option value="Pediatrics">Pediatrics</option>
                                        <option value="Orthopedics">Orthopedics</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 animate-fade-in">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 text-success text-sm bg-success/10 border border-success/20 rounded-lg px-3 py-2 animate-fade-in">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                {isSignUp ? 'Creating Account...' : 'Signing In...'}
                            </div>
                        ) : (
                            isSignUp ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    By continuing, you agree that this is an AI assistant,
                    <br />not a replacement for professional medical advice.
                </p>
            </div>
        </div>
    );
}
