import { Canvas } from '@react-three/fiber';
import { CameraControls, useProgress } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import { DoctorAvatar } from './DoctorAvatar';
import useAppStore from '../../stores/appStore';

function AvatarLoadingOverlay() {
    const { active, progress: actualProgress } = useProgress();
    const [displayProgress, setDisplayProgress] = useState(15);
    const [statusText, setStatusText] = useState('Initializing Neural Mesh...');
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Guaranteed futuristic activation sequence on every mount / toggle
        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step === 1) {
                setDisplayProgress(35);
                setStatusText('Establishing Hologram Link...');
            } else if (step === 2) {
                setDisplayProgress(70);
                setStatusText('Calibrating Morph Targets...');
            } else if (step === 3) {
                setDisplayProgress(95);
                setStatusText('Syncing Lip-Sync Visemes...');
            } else if (step >= 4) {
                clearInterval(interval);
                setDisplayProgress(100);
                setStatusText('3D Avatar Online');
                setTimeout(() => setIsFadingOut(true), 250);
                setTimeout(() => setIsComplete(true), 750);
            }
        }, 180);

        return () => clearInterval(interval);
    }, []);

    if (isComplete) return null;

    return (
        <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md transition-all duration-500 ${isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
            {/* Holographic Radar / Orbital Rings */}
            <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="absolute -inset-2 rounded-full border border-dashed border-emerald-500/30 animate-spin" style={{ animationDuration: '6s' }} />
                <div className="absolute inset-1 rounded-full border-2 border-t-emerald-400 border-r-transparent border-b-cyan-500 border-l-transparent animate-spin" style={{ animationDuration: '1.2s' }} />
                <div className="absolute inset-3 rounded-full bg-emerald-950/40 backdrop-blur-sm border border-emerald-500/30" />

                {/* 3D Box Hologram Icon */}
                <div className="relative z-10 text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                </div>
            </div>

            {/* Status & Dynamic Progress */}
            <div className="text-center space-y-2.5 max-w-[220px]">
                <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-zinc-100 tracking-wider font-mono">
                        {statusText}
                    </span>
                </div>

                {/* Neon Gradient Progress bar */}
                <div className="w-44 h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden mx-auto shadow-inner p-0.5">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-200 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
                        style={{ width: `${displayProgress}%` }}
                    />
                </div>
                <div className="flex items-center justify-between px-1 text-[10px] font-mono text-zinc-500">
                    <span>SYSTEM_BOOT</span>
                    <span className="text-emerald-400 font-bold">{displayProgress}%</span>
                </div>
            </div>
        </div>
    );
}

function AvatarExperience() {
    const controls = useRef();
    const { avatarCustomization } = useAppStore();
    const mood = avatarCustomization?.lightingMood || 'clinical';

    useEffect(() => {
        if (controls.current) {
            controls.current.setLookAt(1, 2.2, 10, 0, 1.5, 0);
            controls.current.setLookAt(0.1, 1.7, 1.2, 0, 1.5, 0, true);
        }
    }, []);

    return (
        <>
            <CameraControls ref={controls} />
            {mood === 'cyberpunk' ? (
                <>
                    <ambientLight intensity={0.35} />
                    <directionalLight position={[2, 3, 5]} intensity={1.6} color="#06b6d4" />
                    <directionalLight position={[-2, 1, -3]} intensity={1.2} color="#f43f5e" />
                    <directionalLight position={[0, -1, 2]} intensity={0.7} color="#8b5cf6" />
                </>
            ) : mood === 'warm' ? (
                <>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[2, 3, 5]} intensity={1.8} color="#fef08a" />
                    <directionalLight position={[-2, 1, -3]} intensity={0.8} color="#f59e0b" />
                    <directionalLight position={[0, -1, 2]} intensity={0.4} color="#fda4af" />
                </>
            ) : mood === 'studio' ? (
                <>
                    <ambientLight intensity={0.45} />
                    <directionalLight position={[2, 3, 5]} intensity={2.0} color="#ffffff" />
                    <directionalLight position={[-2, 1, -3]} intensity={0.7} color="#cbd5e1" />
                    <directionalLight position={[0, -1, 2]} intensity={0.3} color="#94a3b8" />
                </>
            ) : (
                <>
                    {/* Crisp Studio / Teal Lighting */}
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[2, 3, 5]} intensity={1.8} color="#ffffff" />
                    <directionalLight position={[-2, 1, -3]} intensity={0.6} color="#14b8a6" />
                    <directionalLight position={[0, -1, 2]} intensity={0.3} color="#06b6d4" />
                </>
            )}
            <DoctorAvatar />
        </>
    );
}

export default function AvatarScene() {
    return (
        <div className="w-full h-full relative overflow-hidden">
            <AvatarLoadingOverlay />
            <Canvas
                dpr={[1, 1.5]}
                camera={{ position: [0.1, 1.7, 1.2], fov: 30 }}
                gl={{
                    powerPreference: 'high-performance',
                    antialias: true,
                    alpha: true,
                    preserveDrawingBuffer: false,
                    failIfMajorPerformanceCaveat: false
                }}
                onCreated={({ gl }) => {
                    gl.domElement.addEventListener('webglcontextlost', (event) => {
                        event.preventDefault();
                    }, false);
                }}
            >
                <Suspense fallback={null}>
                    <AvatarExperience />
                </Suspense>
            </Canvas>
        </div>
    );
}
