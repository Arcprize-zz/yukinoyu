import { RigidBody } from '@react-three/rapier';
import { Block, House, PALETTE } from '../scene/kit';
import { PLAZA } from '../world/layout';

const WALLS = [PALETTE.stone, PALETTE.wood, PALETTE.plaster, PALETTE.ink];
const ROWS: { z: number; d: number; h: number }[] = [
  { z: 24, d: 6.5, h: 5 },
  { z: 16.5, d: 6, h: 4.2 },
  { z: 9, d: 6.5, h: 6.2 },
  { z: 1.8, d: 5.5, h: 4.6 },
];

/** ② 온천 거리와 광장. 석조 창고와 목조 가게가 길 양옆에 늘어선다 */
export function OnsenStreet() {
  const [px, pz] = PLAZA.center;

  return (
    <RigidBody type="fixed" colliders={false}>
      {ROWS.map((r, i) => (
        <group key={r.z}>
          <House
            x={-10}
            z={r.z}
            w={8}
            d={r.d}
            h={r.h}
            wall={WALLS[i % 4]}
            front="+x"
            floors={r.h > 5.5 ? 2 : 1}
          />
          <House
            x={10}
            z={r.z - 1.5}
            w={8}
            d={r.d}
            h={r.h + (i % 2 ? 0.8 : -0.4)}
            wall={WALLS[(i + 2) % 4]}
            front="-x"
            floors={r.h > 5.5 ? 2 : 1}
          />
        </group>
      ))}

      {/* 광장 가운데의 큰 눈 등롱(유키토로) */}
      <Block from={[px - 0.9, 0, pz - 0.9]} to={[px + 0.9, 0.5, pz + 0.9]} color={PALETTE.stoneDark} />
      <Block from={[px - 0.3, 0.5, pz - 0.3]} to={[px + 0.3, 1.6, pz + 0.3]} color={PALETTE.stone} />
      <Block from={[px - 0.55, 1.6, pz - 0.55]} to={[px + 0.55, 2.3, pz + 0.55]} color="#ffb766" emissive collide={false} />
      <Block from={[px - 0.95, 2.3, pz - 0.95]} to={[px + 0.95, 2.6, pz + 0.95]} color={PALETTE.stoneDark} />
      <Block from={[px - 0.8, 2.6, pz - 0.8]} to={[px + 0.8, 2.9, pz + 0.8]} color={PALETTE.snow} collide={false} />
      <pointLight position={[px, 1.95, pz]} color="#ffb070" intensity={12} distance={9} decay={2} />

      {/* 소원 등롱 벽(6단계 방명록 자리) */}
      <Block from={[-5, 0, -13.5]} to={[5, 0.25, -12.7]} color={PALETTE.stoneDark} />
      {[-5, 0, 5].map((x) => (
        <Block key={x} from={[x - 0.15, 0.25, -13.25]} to={[x + 0.15, 2.8, -12.95]} color={PALETTE.woodDark} />
      ))}
      <Block from={[-5.2, 2.8, -13.4]} to={[5.2, 3.05, -12.8]} color={PALETTE.wood} collide={false} />
      <Block from={[-5.2, 3.05, -13.35]} to={[5.2, 3.2, -12.85]} color={PALETTE.snow} collide={false} />
      <Block from={[-5, 2.35, -13.12]} to={[5, 2.42, -13.08]} color={PALETTE.woodDark} collide={false} castShadow={false} />
      {/* 가운데 기둥(x 0)과 겹치는 자리는 비운다 */}
      {[-4, -3, -2, -1, 1, 2, 3, 4].map((x) => (
        <Block
          key={x}
          from={[x - 0.16, 1.75, -13.25]}
          to={[x + 0.16, 2.2, -12.95]}
          color={x % 2 ? '#ffb766' : '#ff9a7a'}
          emissive
          collide={false}
          castShadow={false}
        />
      ))}
    </RigidBody>
  );
}
