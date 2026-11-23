import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { otherPlayers, useGame, type RemoteInfo } from '../store';
import { sampleRemote, type RemotePose } from '../net/remoteFrames';
import { isInPool } from '../world/layout';
import { Avatar } from './Avatar';

/** 탕 안에서 서 있으면 어깨까지, 자리에 앉으면 목까지(Player의 BATH_SINK, BATH_SEAT_SINK와 같게) */
const BATH_SINK = 0.35;
const SEAT_SINK = 0.45;
const SEAT_LEAN_BACK = 0.15;
/** 이 속도(m/s)보다 빠르면 걷는 것으로 보고 통통 튀게 한다 */
const WALK_THRESHOLD = 0.4;
/** 별명 표시 높이(발 기준) */
const LABEL_HEIGHT = 2.05;

/** 서버에 함께 접속한 다른 방문객들. 들어오고 나갈 때만 리렌더된다 */
export function RemotePlayers() {
  const remotes = useGame((s) => s.remotes);
  return (
    <>
      {remotes.map((r) => (
        <RemoteAvatar key={r.id} info={r} />
      ))}
    </>
  );
}

function RemoteAvatar({ info }: { info: RemoteInfo }) {
  const root = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  // 옷 갈아입기(탕 안/밖)만 React 상태. 드물게 바뀐다
  const [bathing, setBathing] = useState(false);
  const local = useRef({
    pose: { x: 0, y: 0, z: 0, ry: 0, action: 'idle' } as RemotePose,
    prevX: NaN,
    prevZ: NaN,
    bath: 0,
    seat: 0,
    walkPhase: 0,
    bathing: false,
    /** 자리 판정(seatsNear)에 쓰이는 위치. 매 프레임 새 객체를 만들지 않도록 하나를 고쳐 쓴다 */
    shared: { x: 0, z: 0 },
  });

  useFrame((_, delta) => {
    const l = local.current;
    const p = l.pose;
    if (!sampleRemote(info.id, p) || !root.current || !bob.current) return;
    const dt = Math.min(delta, 1 / 20);

    root.current.position.set(p.x, p.y, p.z);
    root.current.rotation.y = p.ry;
    // 별명 라벨(drei Html)이 이번 프레임 위치를 읽도록 행렬을 바로 갱신한다
    root.current.updateMatrixWorld(true);

    l.shared.x = p.x;
    l.shared.z = p.z;
    otherPlayers.set(info.id, l.shared);

    const speed = Number.isNaN(l.prevX) ? 0 : Math.hypot(p.x - l.prevX, p.z - l.prevZ) / Math.max(dt, 1e-4);
    l.prevX = p.x;
    l.prevZ = p.z;

    const inBath = isInPool(p.x, p.y, p.z) || p.action === 'bathe' || p.action === 'sit';
    if (inBath !== l.bathing) {
      l.bathing = inBath;
      setBathing(inBath);
    }
    const seated = p.action === 'sit';
    l.bath += ((inBath ? 1 : 0) - l.bath) * (1 - Math.exp(-5 * dt));
    l.seat += ((seated ? 1 : 0) - l.seat) * (1 - Math.exp(-3 * dt));

    const walking = speed > WALK_THRESHOLD && !inBath;
    l.walkPhase = walking ? l.walkPhase + dt * speed * 3.2 : 0;
    const walkBob = walking ? Math.abs(Math.sin(l.walkPhase)) * 0.09 : 0;
    const sink = BATH_SINK + (SEAT_SINK - BATH_SINK) * l.seat;
    bob.current.position.y = THREE.MathUtils.lerp(walkBob, -sink, l.bath);
    bob.current.rotation.z = walking ? Math.sin(l.walkPhase) * 0.06 : 0;
    bob.current.rotation.x = -SEAT_LEAN_BACK * l.seat;
    // 우선순위 -1: 자식인 Html의 useFrame(기본 0)보다 먼저 돌아야 라벨이 한 프레임 늦게 따라오지 않는다.
    // 음수 우선순위는 R3F의 자동 렌더를 끄지 않는다
  }, -1);

  return (
    <group ref={root}>
      <group ref={bob}>
        <Avatar bathing={bathing} hat={info.hat} scarf={info.scarf} />
      </group>
      <Html position-y={LABEL_HEIGHT} center zIndexRange={[10, 0]} className="nick-label">
        {info.nick}
      </Html>
    </group>
  );
}
