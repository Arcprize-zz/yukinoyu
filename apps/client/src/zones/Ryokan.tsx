import { useEffect, useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Block, GableRoof, House, PALETTE } from '../scene/kit';
import { OnsenWater } from '../scene/OnsenWater';
import { OnsenSteam } from '../scene/OnsenSteam';
import { mulberry32 } from '../lib/random';
import { createNearFadeMaterial } from '../lib/nearFadeMaterial';
import { ONSEN } from '../world/layout';

/** ① 료칸과 설경 노천온천. 치수는 layout.ts의 ONSEN */

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

      {/* 탕 바닥과 나오는 바위 계단.
          계단은 보이기만 하고, 실제로 밟는 건 그 위에 덮은 경사로다.
          물속 걸음(1.4m/s)에서는 0.22m 계단도 autostep이 실패해서 탕에서 못 나왔다 */}
      <Block from={[pool.x0, 0, pool.z0]} to={[pool.x1, pool.floor, pool.z1]} color="#3b4a55" />
      <Block from={[pool.x0, 0, -26]} to={[pool.x0 + 0.7, 0.79, -24]} color={ROCK} collide={false} />
      <Block from={[pool.x0 + 0.7, 0, -26]} to={[pool.x0 + 1.5, 0.57, -24]} color={ROCK} collide={false} />
      <PoolRamp />

      <OnsenWater />
      <OnsenSteam />

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

      {/* 정자 처마에 매단 등불: 수면 반짝임의 기준(ONSEN.lamp) */}
      <Block from={[40.38, T + 2.35, -25.02]} to={[40.42, T + 2.6, -24.98]} color={PALETTE.woodDark} collide={false} castShadow={false} />
      <Block
        from={[ONSEN.lamp[0] - 0.17, ONSEN.lamp[1] - 0.2, ONSEN.lamp[2] - 0.17]}
        to={[ONSEN.lamp[0] + 0.17, ONSEN.lamp[1] + 0.2, ONSEN.lamp[2] + 0.17]}
        color="#ffb766"
        emissive
        collide={false}
        castShadow={false}
      />
      <pointLight position={ONSEN.lamp} color="#ffb070" intensity={10} distance={10} decay={2} />

      {/* 데크 남서쪽 모퉁이의 작은 석등 */}
      <Block from={[29.2, T, -29.6]} to={[30.2, T + 0.3, -28.6]} color={PALETTE.stoneDark} />
      <Block from={[29.55, T + 0.3, -29.25]} to={[29.85, T + 0.9, -28.95]} color={PALETTE.stone} collide={false} />
      <Block from={[29.4, T + 0.9, -29.4]} to={[30.0, T + 1.25, -28.8]} color="#ffb766" emissive collide={false} />
      <Block from={[29.25, T + 1.25, -29.55]} to={[30.15, T + 1.45, -28.65]} color={PALETTE.stoneDark} collide={false} />
      <Block from={[29.35, T + 1.45, -29.45]} to={[30.05, T + 1.6, -28.75]} color={PALETTE.snow} collide={false} />
      <pointLight position={[29.7, T + 1.1, -29.1]} color="#ffb070" intensity={6} distance={7} decay={2} />

      <PoolRocks />
    </RigidBody>
  );
}

/**
 * 탕 바닥(x0 + 1.6)에서 데크 가장자리(x0)까지 올라가는 보이지 않는 경사로.
 * 캐릭터 컨트롤러는 50°까지 오르므로 22° 경사로는 걷는 속도와 상관없이 오른다
 */
function PoolRamp() {
  const { pool, deckTop } = ONSEN;
  const run = 1.6;
  const rise = deckTop - pool.floor;
  const angle = Math.atan2(rise, run);
  const halfLength = Math.hypot(run, rise) / 2;
  const halfThickness = 0.15;
  // 윗면 가운데가 경사로 한가운데 오도록 두께만큼 내린다
  const topMid = (deckTop + pool.floor) / 2;
  return (
    <CuboidCollider
      args={[halfLength, halfThickness, 1]}
      position={[pool.x0 + run / 2, topMid - halfThickness / Math.cos(angle), -25]}
      rotation={[0, 0, -angle]}
    />
  );
}

/** 탕 테두리 바위(보기만, 충돌 없음). 카메라 앞을 가리면 디더링으로 사라진다 */
function PoolRocks() {
  // 입욕 카메라 거리(약 3.9m)보다 가까운 바위, 즉 카메라와 캐릭터 사이의 바위만 사라진다.
  // 범위를 좁게 둬야 캐릭터 바로 뒤 바위(카메라에서 약 3m)가 반쯤 남아 머리를 얼룩지게 하지 않는다
  const material = useMemo(() => createNearFadeMaterial({ color: ROCK, flatShading: true, roughness: 1 }, 3.0, 3.6), []);
  useEffect(() => () => material.dispose(), [material]);
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
        <mesh
          key={i}
          position={r.p}
          rotation={[r.r, r.r * 2, 0]}
          scale={[r.s * 1.3, r.s * 0.7, r.s]}
          material={material}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </>
  );
}
