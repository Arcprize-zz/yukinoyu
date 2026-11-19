import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { mulberry32 } from '../lib/random';
import { THIN_PROP_GROUPS, isReserved, terrainHeight } from '../world/layout';

interface Tree {
  x: number;
  y: number;
  z: number;
  s: number;
}

/** 나무 하나를 이루는 잎 층: [높이, 반지름, 층 높이] (scale 1 기준) */
const LAYERS: [number, number, number][] = [
  [1.6, 1.5, 2.0],
  [2.7, 1.15, 1.7],
  [3.6, 0.8, 1.4],
];

function generateTrees(): Tree[] {
  const rand = mulberry32(2026);
  const trees: Tree[] = [];
  let guard = 0;
  while (trees.length < 170 && guard++ < 6000) {
    const x = (rand() * 2 - 1) * 58;
    const z = (rand() * 2 - 1) * 58;
    const s = 0.8 + rand() * 0.9;
    // 가장 아래 잎 층 반지름(1.5 × s)만큼 떨어뜨려야 가지가 길이나 소품을 덮지 않는다
    if (isReserved(x, z, LAYERS[0][1] * s + 0.3)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    trees.push({ x, y: terrainHeight(x, z), z, s });
  }
  return trees;
}

/**
 * 눈 쌓인 침엽수.
 * 같은 모양을 InstancedMesh로 그려서 나무 170그루를 드로우콜 3번으로 처리한다.
 */
export function Trees() {
  const trees = useMemo(generateTrees, []);

  return (
    <group>
      <Instances limit={trees.length} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.25, 1.2, 6]} />
        <meshStandardMaterial color="#5a4336" roughness={1} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, t.y + 0.6 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>

      <Instances limit={trees.length * LAYERS.length} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#2f4a3f" flatShading roughness={0.9} />
        {trees.flatMap((t, i) =>
          LAYERS.map(([y, r, h], j) => (
            <Instance
              key={`${i}-${j}`}
              position={[t.x, t.y + y * t.s, t.z]}
              scale={[r * t.s, h * t.s, r * t.s]}
            />
          )),
        )}
      </Instances>

      {/* 각 층 위에 얹힌 눈 */}
      <Instances limit={trees.length * LAYERS.length} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#f2f6fc" flatShading roughness={0.85} />
        {trees.flatMap((t, i) =>
          LAYERS.map(([y, r, h], j) => (
            <Instance
              key={`${i}-${j}`}
              position={[t.x, t.y + (y + h * 0.18) * t.s, t.z]}
              scale={[r * 0.82 * t.s, h * 0.65 * t.s, r * 0.82 * t.s]}
            />
          )),
        )}
      </Instances>

      <RigidBody type="fixed" colliders={false}>
        {trees.map((t, i) => (
          <CylinderCollider
            key={i}
            args={[2, 0.35 * t.s]}
            position={[t.x, t.y + 2, t.z]}
            collisionGroups={THIN_PROP_GROUPS}
          />
        ))}
      </RigidBody>
    </group>
  );
}
