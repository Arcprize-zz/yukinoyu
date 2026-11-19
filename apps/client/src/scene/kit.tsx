/**
 * 그레이박스 조립 도구. 보이는 모양과 충돌체를 한 번에 만든다.
 * 3주차 아트 작업에서 같은 자리에 에셋을 바꿔 끼운다.
 */
import { useMemo, type ComponentProps } from 'react';
import { CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

type InteractionGroups = ComponentProps<typeof CuboidCollider>['collisionGroups'];

export type V3 = [number, number, number];

export const PALETTE = {
  snow: '#eef3fa',
  stone: '#8d9299',
  stoneDark: '#5f666f',
  wood: '#6b4f3f',
  woodDark: '#4b3a30',
  plaster: '#d8cfc0',
  ink: '#3e3a44',
  window: '#ffc77a',
};

interface BlockProps {
  /** 한 모서리 */
  from: V3;
  /** 반대 모서리 */
  to: V3;
  color: string;
  collide?: boolean;
  collisionGroups?: InteractionGroups;
  castShadow?: boolean;
  emissive?: boolean;
}

/** 두 모서리로 정하는 상자(+ 충돌체) */
export function Block({
  from,
  to,
  color,
  collide = true,
  collisionGroups,
  castShadow = true,
  emissive = false,
}: BlockProps) {
  const size: V3 = [Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), Math.abs(to[2] - from[2])];
  const center: V3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  return (
    <>
      <mesh position={center} castShadow={castShadow} receiveShadow>
        <boxGeometry args={size} />
        {emissive ? (
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
        ) : (
          <meshStandardMaterial color={color} roughness={0.9} />
        )}
      </mesh>
      {collide && (
        <CuboidCollider
          args={[size[0] / 2, size[1] / 2, size[2] / 2]}
          position={center}
          collisionGroups={collisionGroups}
        />
      )}
    </>
  );
}

interface RoofProps {
  /** 처마 높이의 중심 */
  position: V3;
  /** 용마루와 직각인 폭 */
  span: number;
  /** 용마루 길이 */
  length: number;
  rise: number;
  /** 용마루 방향 */
  ridge: 'x' | 'z';
  color?: string;
}

/** 눈 덮인 박공지붕(삼각기둥) */
export function GableRoof({ position, span, length, rise, ridge, color = PALETTE.snow }: RoofProps) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-span / 2, 0).lineTo(span / 2, 0).lineTo(0, rise).closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
    g.translate(0, 0, -length / 2);
    return g;
  }, [span, length, rise]);

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation-y={ridge === 'z' ? 0 : Math.PI / 2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  );
}

export type Facing = '+x' | '-x' | '+z' | '-z';

interface HouseProps {
  x: number;
  z: number;
  /** x 방향 폭 */
  w: number;
  /** z 방향 깊이 */
  d: number;
  /** 벽 높이 */
  h: number;
  wall: string;
  /** 정면(창과 문)이 바라보는 쪽 */
  front: Facing;
  /** 바닥 높이 */
  base?: number;
  floors?: number;
}

const NORMALS: Record<Facing, [number, number]> = {
  '+x': [1, 0],
  '-x': [-1, 0],
  '+z': [0, 1],
  '-z': [0, -1],
};

/** 벽 + 지붕 + 불 켜진 창 + 문. 들어갈 수는 없다(그레이박스) */
export function House({ x, z, w, d, h, wall, front, base = 0, floors = 1 }: HouseProps) {
  const [nx, nz] = NORMALS[front];
  const alongX = nz !== 0; // 정면이 ±z면 정면 폭은 x 방향
  const facadeWidth = alongX ? w : d;
  const offset = (alongX ? d : w) / 2 + 0.03;
  // 정면 위의 점: 가로 u, 높이 y
  const at = (u: number, y: number): V3 => [
    x + nx * offset + (alongX ? u : 0),
    base + y,
    z + nz * offset + (alongX ? 0 : u),
  ];
  const faceRotation = front === '+x' ? Math.PI / 2 : front === '-x' ? -Math.PI / 2 : front === '+z' ? 0 : Math.PI;
  const ridge = alongX ? 'x' : 'z';

  const windows: V3[] = [];
  const floorH = h / floors;
  for (let f = 0; f < floors; f++) {
    const y = floorH * f + floorH * 0.62;
    for (const u of [-facadeWidth / 3.2, facadeWidth / 3.2]) windows.push(at(u, y));
  }

  return (
    <group>
      <Block from={[x - w / 2, base, z - d / 2]} to={[x + w / 2, base + h, z + d / 2]} color={wall} />
      <GableRoof
        position={[x, base + h, z]}
        span={(alongX ? d : w) + 0.9}
        length={(alongX ? w : d) + 0.7}
        rise={Math.min(w, d) * 0.32}
        ridge={ridge}
      />
      {windows.map((p, i) => (
        <mesh key={i} position={p} rotation-y={faceRotation}>
          <planeGeometry args={[1.1, 0.9]} />
          <meshStandardMaterial
            color={PALETTE.window}
            emissive={PALETTE.window}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={at(0, 1.1)} rotation-y={faceRotation}>
        <planeGeometry args={[1.2, 2.2]} />
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
      </mesh>
    </group>
  );
}
