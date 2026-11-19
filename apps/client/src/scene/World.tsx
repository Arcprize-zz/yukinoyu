import { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { WORLD } from '@yukinoyu/shared';
import { mulberry32 } from '../lib/random';
import { Terrain } from './Terrain';

const SKY = '#1a2747';
const FOG = '#2b3c63';

/** 하늘, 조명, 지형, 원경 설산, 이동 경계 */
export function World() {
  const h = WORLD.halfSize;

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[FOG, 30, 240]} />

      {/* 블루아워: 하늘은 푸르고 눈에서 반사광이 올라온다 */}
      <hemisphereLight args={['#8fa6d6', '#dfe7f5', 0.75]} />
      <directionalLight
        castShadow
        position={[-35, 45, 25]}
        intensity={1.1}
        color="#b9c8ff"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-h}
        shadow-camera-right={h}
        shadow-camera-top={h}
        shadow-camera-bottom={-h}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <Stars radius={220} depth={60} count={2500} factor={5} saturation={0} fade speed={0.4} />

      <Terrain />
      <Mountains />

      {/* 보이지 않는 경계 벽 */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[h, 10, 0.5]} position={[0, 10, -h]} />
        <CuboidCollider args={[h, 10, 0.5]} position={[0, 10, h]} />
        <CuboidCollider args={[0.5, 10, h]} position={[-h, 10, 0]} />
        <CuboidCollider args={[0.5, 10, h]} position={[h, 10, 0]} />
      </RigidBody>
    </>
  );
}

/** 안개에 반쯤 묻힌 원경 설산 실루엣 */
function Mountains() {
  const peaks = useMemo(() => {
    const rand = mulberry32(42);
    return Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2 + rand() * 0.2;
      const r = 150 + rand() * 40;
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        height: 35 + rand() * 45,
        radius: 35 + rand() * 25,
      };
    });
  }, []);

  return (
    <group>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.height / 2 - 2, p.z]}>
          <coneGeometry args={[p.radius, p.height, 7]} />
          <meshStandardMaterial color="#dbe4f2" flatShading roughness={1} />
        </mesh>
      ))}
      {/* 정면의 큰 산(요테이산 같은 원뿔형 독립봉) */}
      <mesh position={[30, 32, -215]}>
        <coneGeometry args={[70, 72, 9]} />
        <meshStandardMaterial color="#e9eff8" flatShading roughness={1} />
      </mesh>
    </group>
  );
}
