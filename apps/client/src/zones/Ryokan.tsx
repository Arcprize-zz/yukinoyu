import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Block, GableRoof, House, PALETTE } from '../scene/kit';
import { mulberry32 } from '../lib/random';

/**
 * ① 료칸과 설경 노천온천.
 *
 * 온천은 높이 1m 데크 안에 파인 탕으로 만든다(지형 충돌체를 뚫지 않기 위해).
 *   데크 바깥: x 28~42, z -30~-18 / 탕: x 32~40, z -28~-22
 *   탕 바닥 0.35m, 수면(2주차 셰이더 자리) 0.95m
 */
export const ONSEN = {
  deckTop: 1.0,
  pool: { x0: 32, x1: 40, z0: -28, z1: -22, floor: 0.35, water: 0.95 },
};

const DECK = '#8a6a4f';
const ROCK = '#6f7882';

export function Ryokan() {
  const { deckTop: T, pool } = ONSEN;

  return (
    <RigidBody type="fixed" colliders={false}>
      {/* 2층 목조 료칸 + 현관 차양 */}
      <House x={19} z={-22} w={12} d={9} h={6} wall={PALETTE.wood} front="+z" floors={2} />
      <Block from={[16.5, 2.6, -17.5]} to={[21.5, 2.8, -15.9]} color={PALETTE.woodDark} collide={false} />
      <Block from={[16.6, 2.8, -17.45]} to={[21.4, 2.95, -15.95]} color={PALETTE.snow} collide={false} />
      <Block from={[18.2, 1.9, -17.43]} to={[19.8, 2.5, -17.4]} color="#2f4f6f" collide={false} castShadow={false} />
      <pointLight position={[19, 2.3, -16.4]} color="#ffbf80" intensity={10} distance={8} decay={2} />

      {/* 데크: 탕 자리를 비워 두고 네 조각으로 */}
      <Block from={[28, 0, -22]} to={[42, T, -18]} color={DECK} />
      <Block from={[28, 0, -30]} to={[42, T, -28]} color={DECK} />
      <Block from={[28, 0, -28]} to={[pool.x0, T, -22]} color={DECK} />
      <Block from={[pool.x1, 0, -28]} to={[42, T, -22]} color={DECK} />

      {/* 탕 바닥, 나오는 계단 두 칸.
          한 칸 높이를 캡슐 반지름(0.35)보다 충분히 낮게(0.22) 해야 autostep이 경사로 오인하지 않는다 */}
      <Block from={[pool.x0, 0, pool.z0]} to={[pool.x1, pool.floor, pool.z1]} color="#3b4a55" />
      <Block from={[pool.x0, 0, -26]} to={[pool.x0 + 0.7, 0.79, -24]} color={ROCK} />
      <Block from={[pool.x0 + 0.7, 0, -26]} to={[pool.x0 + 1.5, 0.57, -24]} color={ROCK} />

      {/* 수면 자리 표시(2주차에 셰이더로 교체) */}
      <mesh position={[(pool.x0 + pool.x1) / 2, pool.water, (pool.z0 + pool.z1) / 2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[pool.x1 - pool.x0, pool.z1 - pool.z0]} />
        <meshStandardMaterial color="#6fc1c4" transparent opacity={0.65} roughness={0.1} />
      </mesh>

      {/* 데크로 오르는 계단(료칸 앞 길에서) */}
      {[0.25, 0.5, 0.75].map((top, i) => (
        <Block key={top} from={[29, 0, -15 - i]} to={[32, top, -16 - i]} color={DECK} />
      ))}

      {/* 대나무 울타리: 남쪽, 동쪽 */}
      <Block from={[28, T, -30]} to={[42, T + 1.3, -29.8]} color="#9a9466" />
      <Block from={[41.8, T, -30]} to={[42, T + 1.3, -18]} color="#9a9466" />

      {/* 탕 옆 작은 정자 */}
      {[
        [40.6, -28.6],
        [40.6, -21.4],
      ].map(([x, z]) => (
        <Block key={z} from={[x - 0.12, T, z - 0.12]} to={[x + 0.12, T + 2.6, z + 0.12]} color={PALETTE.woodDark} />
      ))}
      <GableRoof position={[40.4, T + 2.6, -25]} span={3.4} length={8.4} rise={1.1} ridge="z" />

      <PoolRocks />
    </RigidBody>
  );
}

/** 탕 테두리 바위(보기만, 충돌 없음) */
function PoolRocks() {
  const rocks = useMemo(() => {
    const { pool, deckTop } = ONSEN;
    const rand = mulberry32(11);
    const out: { p: [number, number, number]; s: number; r: number }[] = [];
    const add = (x: number, z: number) =>
      out.push({ p: [x, deckTop + 0.05, z], s: 0.35 + rand() * 0.35, r: rand() * Math.PI });
    for (let x = pool.x0 + 0.4; x < pool.x1; x += 0.9 + rand() * 0.4) {
      add(x, pool.z0 - 0.3);
      add(x, pool.z1 + 0.3);
    }
    for (let z = pool.z0 + 0.6; z < pool.z1; z += 0.9 + rand() * 0.4) {
      if (z > -26.3 && z < -23.7) continue; // 계단 쪽은 비운다
      add(pool.x0 - 0.3, z);
    }
    return out;
  }, []);

  return (
    <>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} rotation={[r.r, r.r * 2, 0]} scale={[r.s * 1.3, r.s * 0.7, r.s]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={ROCK} flatShading roughness={1} />
        </mesh>
      ))}
    </>
  );
}
