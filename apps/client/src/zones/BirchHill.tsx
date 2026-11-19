import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { mulberry32 } from '../lib/random';
import { Block, PALETTE } from '../scene/kit';
import { HILL, PATHS, THIN_PROP_GROUPS, terrainHeight } from '../world/layout';

interface Birch {
  x: number;
  y: number;
  z: number;
  h: number;
  bands: number[];
}

const HILL_PATHS = PATHS.slice(4);

function nearHillPath(x: number, z: number) {
  return HILL_PATHS.some(({ a, b }) => {
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz)));
    return Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)) < 3;
  });
}

function generateBirches(): Birch[] {
  const rand = mulberry32(31);
  const out: Birch[] = [];
  let guard = 0;
  while (out.length < 60 && guard++ < 3000) {
    const a = rand() * Math.PI * 2;
    const r = 4.5 + rand() * 13;
    const x = HILL.x + Math.cos(a) * r;
    const z = HILL.z + Math.sin(a) * r;
    if (nearHillPath(x, z)) continue;
    if (out.some((b) => Math.hypot(b.x - x, b.z - z) < 1.8)) continue;
    const h = 6 + rand() * 4;
    out.push({ x, y: terrainHeight(x, z), z, h, bands: [rand(), rand(), rand(), rand()].map((v) => 0.8 + v * (h - 1.5)) });
  }
  return out;
}

/** ③ 자작나무 언덕. 하얀 줄기 숲 사이로 꼭대기 벤치까지 오른다 */
export function BirchHill() {
  const birches = useMemo(generateBirches, []);
  const top = terrainHeight(HILL.x, HILL.z);
  const bx = HILL.x + 1;
  const bz = HILL.z - 1.5;

  return (
    <group>
      <Instances limit={birches.length} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.17, 1, 7]} />
        <meshStandardMaterial color="#ece8df" roughness={0.8} />
        {birches.map((b, i) => (
          <Instance key={i} position={[b.x, b.y + b.h / 2, b.z]} scale={[1, b.h, 1]} />
        ))}
      </Instances>
      {/* 자작나무 껍질의 검은 띠 */}
      <Instances limit={birches.length * 4}>
        <cylinderGeometry args={[0.16, 0.16, 0.12, 7]} />
        <meshStandardMaterial color="#3c3833" roughness={1} />
        {birches.flatMap((b, i) =>
          b.bands.map((y, j) => (
            <Instance key={`${i}-${j}`} position={[b.x, b.y + y, b.z]} scale={[0.9 - (y / b.h) * 0.35, 1, 0.9 - (y / b.h) * 0.35]} />
          )),
        )}
      </Instances>

      <RigidBody type="fixed" colliders={false}>
        {birches.map((b, i) => (
          <CylinderCollider
            key={i}
            args={[b.h / 2, 0.18]}
            position={[b.x, b.y + b.h / 2, b.z]}
            collisionGroups={THIN_PROP_GROUPS}
          />
        ))}
        {/* 꼭대기 전망 벤치: 북쪽 설산을 바라본다 */}
        <Block from={[bx - 1, top - 0.3, bz - 0.3]} to={[bx + 1, top + 0.45, bz + 0.3]} color={PALETTE.wood} />
        <Block from={[bx - 1, top + 0.45, bz + 0.2]} to={[bx + 1, top + 1.0, bz + 0.32]} color={PALETTE.wood} />
      </RigidBody>
    </group>
  );
}
