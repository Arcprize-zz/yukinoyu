import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { TERRAIN_EDGE_HEIGHT, pathMask, terrainHeight } from '../world/layout';

const SIZE = 200;
const SEGMENTS = 160;
const SNOW = new THREE.Color('#e6edf7');
const PATH = new THREE.Color('#bfcbdc');

/**
 * 높이 함수로 만든 눈밭. 언덕과 가장자리 둔덕이 있고, 길은 정점 색으로 칠한다.
 * 같은 메시로 trimesh 충돌체를 만들어서 보이는 땅과 밟는 땅이 정확히 같다.
 */
export function Terrain() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
      c.copy(SNOW).lerp(PATH, pathMask(x, z));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  // 지형 바깥을 덮는 평평한 눈밭(가운데가 뚫린 사각형)
  const farGeometry = useMemo(() => {
    const outer = new THREE.Shape();
    const o = 900;
    outer.moveTo(-o, -o).lineTo(o, -o).lineTo(o, o).lineTo(-o, o).closePath();
    const hole = new THREE.Path();
    const h = SIZE / 2 - 0.5;
    hole.moveTo(-h, -h).lineTo(-h, h).lineTo(h, h).lineTo(h, -h).closePath();
    outer.holes.push(hole);
    const g = new THREE.ShapeGeometry(outer);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  return (
    <>
      <RigidBody type="fixed" colliders="trimesh">
        <mesh geometry={geometry} receiveShadow name="ground">
          <meshStandardMaterial vertexColors roughness={0.95} />
        </mesh>
      </RigidBody>
      <mesh geometry={farGeometry} position-y={TERRAIN_EDGE_HEIGHT - 0.02}>
        <meshStandardMaterial color={SNOW} roughness={1} />
      </mesh>
    </>
  );
}
