import { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { WORLD } from '@yukinoyu/shared';
import { mulberry32 } from '../lib/random';

const SKY = '#1a2747';
const FOG = '#2b3c63';
const SNOW = '#e6edf7';
const PATH = '#c3cfdf';

/** 하늘, 조명, 눈 덮인 땅, 원경 설산, 이동 경계 */
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
        shadow-camera-far={150}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <Stars radius={220} depth={60} count={2500} factor={5} saturation={0} fade speed={0.4} />

      {/* 땅 */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={SNOW} roughness={0.95} />
      </mesh>
      {/* 기차역에서 온천까지 이어지는 다져진 눈길 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -14]} receiveShadow>
        <planeGeometry args={[5, 56]} />
        <meshStandardMaterial color={PATH} roughness={1} />
      </mesh>

      <SnowMounds />
      <Mountains />

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[300, 0.5, 300]} position={[0, -0.5, 0]} />
        {/* 보이지 않는 경계 벽 */}
        <CuboidCollider args={[h, 5, 0.5]} position={[0, 5, -h]} />
        <CuboidCollider args={[h, 5, 0.5]} position={[0, 5, h]} />
        <CuboidCollider args={[0.5, 5, h]} position={[-h, 5, 0]} />
        <CuboidCollider args={[0.5, 5, h]} position={[h, 5, 0]} />
      </RigidBody>
    </>
  );
}

/** 낮게 쌓인 눈 더미. 충돌 없이 발이 살짝 묻히게 둔다 */
function SnowMounds() {
  const mounds = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: 40 }, () => {
      const x = (rand() * 2 - 1) * 56;
      const z = (rand() * 2 - 1) * 56;
      const s = 1.5 + rand() * 3.5;
      return { x, z, s, ry: rand() * Math.PI };
    }).filter((m) => Math.abs(m.x) > 4);
  }, []);

  return (
    <group>
      {mounds.map((m, i) => (
        <mesh
          key={i}
          position={[m.x, -m.s * 0.12, m.z]}
          rotation-y={m.ry}
          scale={[m.s * 1.4, m.s * 0.35, m.s]}
          receiveShadow
        >
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={SNOW} roughness={0.95} />
        </mesh>
      ))}
    </group>
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
