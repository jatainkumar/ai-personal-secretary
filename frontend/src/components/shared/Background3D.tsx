import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';

function StarField(props: any) {
    /* eslint-disable react-hooks/exhaustive-deps */
    const ref = useRef<THREE.Points>(null!);

    // Generate random points in a sphere manually to avoid maath NaN errors
    const sphere = useMemo(() => {
        const positions = new Float32Array(2000 * 3); // Reduced from 5000 to 2000
        const radius = 1.5;

        for (let i = 0; i < 2000; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = Math.cbrt(Math.random()) * radius;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        return positions;
    }, []);

    useFrame((state, delta) => {
        // Slower rotation for better performance
        if (ref.current) {
            ref.current.rotation.x -= delta / 20;
            ref.current.rotation.y -= delta / 30;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#fb923c" // Warm Orange color
                    size={0.002}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
}

export default function Background3D() {
    return (
        <div className="fixed inset-0 -z-10 bg-black">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <fog attach="fog" args={['#0f172a', 0, 3]} /> {/* Matches darkBg */}

                {/* 1. Main Star Field (The 'Sphere') */}
                <StarField />

                {/* 2. Background Stars (Distant) - Reduced count for performance */}
                <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

                <ambientLight intensity={0.5} />
            </Canvas>

            {/* Gradient Overlay to blend with UI */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80 pointer-events-none" />
        </div>
    );
}
