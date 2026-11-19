import { Instance, Instances } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { Block, GableRoof, House, PALETTE } from '../scene/kit';

const PLATFORM_TOP = 0.6;
const P = PLATFORM_TOP;

/** ⓪ 눈 내리는 간이역 (스폰). 플랫폼, 지붕, 역사, 선로, 서 있는 기차 */
export function Station() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* 플랫폼과 계단 한 칸 */}
      <Block from={[-16, 0, 38]} to={[16, P, 46]} color={PALETTE.stone} />
      <Block from={[-3, 0, 36.8]} to={[3, 0.3, 38]} color={PALETTE.stone} />

      {/* 플랫폼 지붕: 스폰(x 0) 위를 비워서 카메라가 지붕에 걸리지 않게 서쪽에 둔다 */}
      {[-13, -5].flatMap((x) =>
        [39.5, 44.5].map((z) => (
          <Block
            key={`${x}${z}`}
            from={[x - 0.12, P, z - 0.12]}
            to={[x + 0.12, 3.4, z + 0.12]}
            color={PALETTE.woodDark}
          />
        )),
      )}
      <Block from={[-14.5, 3.4, 38.6]} to={[-3.5, 3.6, 45.4]} color={PALETTE.wood} />
      <Block from={[-14.4, 3.6, 38.7]} to={[-3.6, 3.85, 45.3]} color={PALETTE.snow} collide={false} />
      <pointLight position={[-9, 3.1, 42]} color="#ffbf80" intensity={14} distance={10} decay={2} />

      {/* 대합실 벤치 */}
      <Block from={[-11, P, 44.7]} to={[-7, P + 0.45, 45.3]} color={PALETTE.wood} />
      <Block from={[-11, P + 0.45, 45.2]} to={[-7, P + 1.0, 45.35]} color={PALETTE.wood} />

      {/* 작은 역사 */}
      <House x={11.5} z={42} w={6} d={6} h={3.2} wall={PALETTE.plaster} front="-z" base={P} />

      {/* 역 이름판 */}
      <Block from={[3.4, P, 38.9]} to={[3.6, P + 2.2, 39.1]} color={PALETTE.woodDark} />
      <Block from={[6.4, P, 38.9]} to={[6.6, P + 2.2, 39.1]} color={PALETTE.woodDark} />
      <Block from={[3.2, P + 1.5, 38.85]} to={[6.8, P + 2.3, 39.15]} color="#f3efe6" collide={false} />

      <Rails />
      <Train />
    </RigidBody>
  );
}

function Rails() {
  const sleepers = Array.from({ length: 61 }, (_, i) => -60 + i * 2);
  return (
    <>
      <Block from={[-60, 0, 48]} to={[60, 0.16, 48.18]} color="#59606b" collide={false} castShadow={false} />
      <Block from={[-60, 0, 49.6]} to={[60, 0.16, 49.78]} color="#59606b" collide={false} castShadow={false} />
      <Instances limit={sleepers.length} receiveShadow>
        <boxGeometry args={[0.45, 0.1, 2.6]} />
        <meshStandardMaterial color="#4b3c33" roughness={1} />
        {sleepers.map((x) => (
          <Instance key={x} position={[x, 0.05, 48.9]} />
        ))}
      </Instances>
    </>
  );
}

/** 정차한 2량짜리 지방 열차 */
function Train() {
  const cars: [number, number][] = [
    [-27, -11.5],
    [-43, -27.5],
  ];
  return (
    <>
      {cars.map(([x0, x1]) => (
        <group key={x0}>
          <Block from={[x0, 0.5, 47.5]} to={[x1, 3.3, 50.3]} color="#3f6f8f" />
          <Block from={[x0, 1.2, 47.44]} to={[x1, 1.32, 50.36]} color="#e9e2d0" collide={false} castShadow={false} />
          <Block from={[x0 + 0.6, 1.7, 47.44]} to={[x1 - 0.6, 2.5, 47.5]} color={PALETTE.window} emissive collide={false} />
          <GableRoof position={[(x0 + x1) / 2, 3.3, 48.9]} span={2.9} length={x1 - x0} rise={0.35} ridge="x" />
        </group>
      ))}
    </>
  );
}
