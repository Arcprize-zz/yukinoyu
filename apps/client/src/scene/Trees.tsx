import { useMemo } from 'react';
import { Instance, Instances, useGLTF } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mulberry32 } from '../lib/random';
import { addSnowCover } from '../lib/snowCover';
import { THIN_PROP_GROUPS, isReserved, terrainHeight } from '../world/layout';

interface Tree {
  x: number;
  y: number;
  z: number;
  s: number;
  rotation: number;
}

/**
 * Quaternius Stylized Nature MegaKit(CC0)의 소나무 세 종류.
 * 껍질 텍스처(노멀맵 포함 약 8MB)는 빼고 단색으로 칠했다. 잎 텍스처(70KB)만 쓴다
 */
const PINES = ['/models/quaternius/Pine_1.gltf', '/models/quaternius/Pine_2.gltf', '/models/quaternius/Pine_5.gltf'];
/** 원본 높이 약 7m → 이 비율을 곱한 뒤 나무마다 s(0.8~1.7)를 곱한다 */
const MODEL_SCALE = 0.62;
/** 가장 아래 가지의 반지름(scale 1 기준). 길이나 소품을 덮지 않게 이만큼 띄운다 */
const CANOPY_RADIUS = 1.5;

function generateTrees(): Tree[] {
  const rand = mulberry32(2026);
  const trees: Tree[] = [];
  let guard = 0;
  while (trees.length < 170 && guard++ < 6000) {
    const x = (rand() * 2 - 1) * 58;
    const z = (rand() * 2 - 1) * 58;
    const s = 0.8 + rand() * 0.9;
    if (isReserved(x, z, CANOPY_RADIUS * s + 0.3)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    trees.push({ x, y: terrainHeight(x, z), z, s, rotation: rand() * Math.PI * 2 });
  }
  return trees;
}

/**
 * 눈 쌓인 침엽수 170그루.
 * 종류(3) × 부분(껍질, 잎)마다 InstancedMesh 하나라서 드로우콜 6번으로 그린다.
 */
export function Trees() {
  const trees = useMemo(generateTrees, []);

  return (
    <group>
      {PINES.map((url, v) => (
        <PineInstances key={url} url={url} trees={trees.filter((_, i) => i % PINES.length === v)} />
      ))}

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

function PineInstances({ url, trees }: { url: string; trees: Tree[] }) {
  const { scene } = useGLTF(url);
  const parts = useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    return meshes.map((m) => ({
      geometry: m.geometry,
      material: addSnowCover((m.material as THREE.MeshStandardMaterial).clone()),
    }));
  }, [scene]);

  return (
    <>
      {parts.map(({ geometry, material }) => (
        <Instances key={geometry.uuid} limit={trees.length} geometry={geometry} material={material} castShadow receiveShadow>
          {trees.map((t, i) => (
            <Instance
              key={i}
              position={[t.x, t.y - 0.1, t.z]}
              rotation-y={t.rotation}
              scale={MODEL_SCALE * t.s}
            />
          ))}
        </Instances>
      ))}
    </>
  );
}

for (const url of PINES) useGLTF.preload(url);
