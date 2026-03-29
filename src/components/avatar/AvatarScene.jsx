import { Canvas } from '@react-three/fiber';
import { CameraControls, Loader } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import { DoctorAvatar } from './DoctorAvatar';

function AvatarExperience() {
    const controls = useRef();

    useEffect(() => {
        if (controls.current) {
            controls.current.setLookAt(1, 2.2, 10, 0, 1.5, 0);
            controls.current.setLookAt(0.1, 1.7, 1.2, 0, 1.5, 0, true);
        }
    }, []);

    return (
        <>
            <CameraControls ref={controls} />
            {/* Medical/clinical lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[2, 3, 5]} intensity={1.8} color="#ffffff" />
            <directionalLight position={[-2, 1, -3]} intensity={0.6} color="#14b8a6" />
            <directionalLight position={[0, -1, 2]} intensity={0.3} color="#06b6d4" />
            <DoctorAvatar />
        </>
    );
}

export default function AvatarScene() {
    return (
        <div className="w-full h-full relative">
            <Canvas shadows camera={{ position: [12, 8, 26], fov: 30 }}>
                <Suspense fallback={null}>
                    <AvatarExperience />
                </Suspense>
            </Canvas>
            <Loader />
        </div>
    );
}
