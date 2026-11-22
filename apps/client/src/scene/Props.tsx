/**
 * Kenney Holiday Kit(CC0) 소품. 배치는 world/layout.ts의 PROPS.
 * 모델마다 메시 하나, 재질 하나(색상표 텍스처 한 장 공유)라서 종류별로 InstancedMesh 한 번에 그린다.
 */
import { useMemo } from 'react';
import { Instance, Instances, useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { PROPS, THIN_PROP_GROUPS, terrainHeight, type PropKind, type PropPlacement } from '../world/layout';

const URL: Record<PropKind, string> = {
  snowPile: '/models/kenney/snow-pile.glb',
  rocksLarge: '/models/kenney/rocks-large.glb',
  rocksMedium: '/models/kenney/rocks-medium.glb',
  rocksSmall: '/models/kenney/rocks-small.glb',
  snowman: '/models/kenney/snowman.glb',
  sled: '/models/kenney/sled.glb',
  bench: '/models/kenney/bench.glb',
};

/**
 * 충돌: 눈더미는 밟고 지나가고(낮다), 바위는 카메라도 막고,
 * 눈사람, 썰매, 벤치는 캐릭터만 막는다(카메라가 걸려 튀어나오지 않게)
 */
const COLLIDE: Record<PropKind, 'none' | 'solid' | 'thin'> = {
  snowPile: 'none',
  rocksLarge: 'solid',
  rocksMedium: 'solid',
  rocksSmall: 'solid',
  snowman: 'thin',
  sled: 'thin',
  bench: 'thin',
};

/** 언덕 비탈에서 바닥이 뜨지 않게 살짝 묻는다 */
const SINK = 0.08;

const KINDS = Object.keys(URL) as PropKind[];

export function Props() {
  return (
    <group>
      {KINDS.map((kind) => {
        const items = PROPS.filter((p) => p.kind === kind);
        return items.length > 0 ? <PropKindGroup key={kind} kind={kind} items={items} /> : null;
      })}
    </group>
  );
}

function baseY(p: PropPlacement) {
  return p.y ?? terrainHeight(p.x, p.z) - SINK;
}

function PropKindGroup({ kind, items }: { kind: PropKind; items: PropPlacement[] }) {
  const { scene } = useGLTF(URL[kind]);
  const { geometry, material, half, centerY } = useMemo(() => {
    const mesh = scene.getObjectByProperty('isMesh', true) as THREE.Mesh;
    const geometry = mesh.geometry;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    // 충돌체는 겉모양보다 조금 작게(바위 모서리에 허공 충돌이 생기지 않게)
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5 * 0.8);
    return { geometry, material: mesh.material as THREE.Material, half, centerY: (box.min.y + box.max.y) / 2 };
  }, [scene]);
  const collide = COLLIDE[kind];

  return (
    <>
      <Instances limit={items.length} geometry={geometry} material={material} castShadow receiveShadow>
        {items.map((p, i) => (
          <Instance key={i} position={[p.x, baseY(p), p.z]} rotation-y={p.rotation ?? 0} scale={p.scale ?? 1} />
        ))}
      </Instances>
      {collide !== 'none' && (
        <RigidBody type="fixed" colliders={false}>
          {items.map((p, i) => {
            const s = p.scale ?? 1;
            return (
              <CuboidCollider
                key={i}
                args={[half.x * s, half.y * s, half.z * s]}
                position={[p.x, baseY(p) + centerY * s, p.z]}
                rotation={[0, p.rotation ?? 0, 0]}
                {...(collide === 'thin' && { collisionGroups: THIN_PROP_GROUPS })}
              />
            );
          })}
        </RigidBody>
      )}
    </>
  );
}

for (const url of Object.values(URL)) useGLTF.preload(url);
