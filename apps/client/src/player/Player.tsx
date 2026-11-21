import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import * as THREE from 'three';
import { ONSEN_SEATS, WORLD, type PlayerAction } from '@yukinoyu/shared';
import type { CtrlName } from '../controls';
import { DEBUG, playerFrame, useGame } from '../store';
import {
  CAMERA_RAY_GROUPS,
  ZONES,
  isInPool,
  isNearOnsenEntrance,
  terrainHeight,
  zoneAt,
  type ZoneId,
} from '../world/layout';
import { Avatar } from './Avatar';
import { BathAutopilot } from './bathAutopilot';
import { useOrbitCamera } from './useOrbitCamera';

const RADIUS = 0.35;
const HALF_HEIGHT = 0.45;
/** 캡슐 중심에서 발까지 */
const FOOT_OFFSET = RADIUS + HALF_HEIGHT;
const WALK_SPEED = 3.2;
const RUN_SPEED = 6.5;
const GRAVITY = 22;
const JUMP_SPEED = 7.5;
/** 카메라가 바라보는 높이(발 기준) */
const LOOK_HEIGHT = 1.3;
/** 카메라가 벽에서 떨어져 있을 거리, 캐릭터에 가장 가까이 올 수 있는 거리 */
const CAMERA_WALL_GAP = 0.3;
const CAMERA_MIN_DISTANCE = 1.2;

// 입욕: 물속에서는 천천히 걷고, 아바타가 어깨까지 잠기고, 카메라가 낮고 가까워진다
const BATH_SPEED = 1.4;
const BATH_SINK = 0.35;
const BATH_LOOK_HEIGHT = 0.85;
// 탕 테두리 바위와 데크가 시야를 가리지 않도록 가까이(약 3.9m), 조금 내려다보게
const BATH_DISTANCE_SCALE = 0.55;
const BATH_PITCH_SCALE = 0.7;
/** 자리에 앉았을 때: 목까지 잠기고, 등을 뒤로 젖힌다(라디안) */
const BATH_SEAT_SINK = 0.45;
const BATH_LEAN_BACK = 0.15;
/** 버튼으로 자동 입장할 때 데크 위 걷는 속도 */
const AUTO_WALK_SPEED = 2.2;

type Kcc = ReturnType<ReturnType<typeof useRapier>['world']['createCharacterController']>;

// 매 프레임 new 하지 않도록 재사용하는 임시 벡터
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const camGoal = new THREE.Vector3();
const camDir = new THREE.Vector3();

/** 차이가 가장 작은 쪽으로 각도를 보간 */
function lerpAngle(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const avatarRoot = useRef<THREE.Group>(null);
  const avatarBob = useRef<THREE.Group>(null);
  const { world, rapier } = useRapier();
  const kcc = useRef<Kcc | null>(null);
  const cameraRay = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);
  const lastZone = useRef<ZoneId | null | undefined>(undefined);
  const setZone = useGame((s) => s.setZone);
  const [, getKeys] = useKeyboardControls<CtrlName>();
  const orbit = useOrbitCamera();

  const motion = useRef({
    vy: 0,
    grounded: false,
    jumpHeld: false,
    walkPhase: 0,
    facing: Math.PI,
    /** 0(물 밖) ~ 1(탕 안) 부드럽게 바뀌는 값 */
    bath: 0,
    /** 0(서 있음) ~ 1(자리에 앉음) */
    seat: 0,
    wasSeated: false,
    /** 남은 카메라 정렬 시간(초) */
    alignCamera: 0,
  });
  const autopilot = useMemo(() => new BathAutopilot(), []);
  // 바뀔 때만 리렌더된다(옷 갈아입기는 드물게 일어나는 일)
  const bathing = useGame((s) => s.action === 'bathe');
  const smoothLook = useRef(new THREE.Vector3(...WORLD.spawn));
  const lastAction = useRef<PlayerAction>('idle');
  const setAction = useGame((s) => s.setAction);

  // Rapier의 캐릭터 컨트롤러: 벽에 미끄러지기, 계단 오르기, 경사로 처리를 맡긴다
  useEffect(() => {
    const c = world.createCharacterController(0.02);
    c.enableAutostep(0.4, 0.25, true);
    c.enableSnapToGround(0.3);
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    kcc.current = c;
    return () => {
      world.removeCharacterController(c);
      kcc.current = null;
    };
  }, [world]);

  // 디버그: 숫자키 1~4로 각 구역에 순간이동
  useEffect(() => {
    if (!DEBUG) return;
    (window as unknown as { __physics: unknown }).__physics = { world, rapier, groups: CAMERA_RAY_GROUPS };
    const onKey = (e: KeyboardEvent) => {
      const zone = ZONES[Number(e.code.replace('Digit', '')) - 1];
      if (!zone || !body.current) return;
      const [x, y, z] = zone.teleport;
      autopilot.cancel();
      body.current.setTranslation({ x, y, z }, true);
      motion.current.vy = 0;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [autopilot, world, rapier]);

  useFrame((state, delta) => {
    const b = body.current;
    const col = collider.current;
    const c = kcc.current;
    if (!b || !col || !c) return;

    const dt = Math.min(delta, 1 / 20);
    const keys = getKeys();
    const m = motion.current;
    const o = orbit.current;

    // 1) 카메라 방향 기준으로 입력을 월드 방향으로 바꾼다
    forward.set(-Math.sin(o.yaw), 0, -Math.cos(o.yaw));
    right.set(Math.cos(o.yaw), 0, -Math.sin(o.yaw));
    const ix = Number(keys.right) - Number(keys.left);
    const iz = Number(keys.forward) - Number(keys.backward);
    move.set(0, 0, 0).addScaledVector(forward, iz).addScaledVector(right, ix);
    const manual = move.lengthSq() > 0;
    if (manual) move.normalize();
    const t = b.translation();
    const inBath = m.grounded && isInPool(t.x, t.y - FOOT_OFFSET, t.z);

    // 1-2) 온천 자동 입장/퇴장. 버튼 요청을 처리하고, 방향키를 누르면 조작을 돌려준다
    const game = useGame.getState();
    if (game.bathRequest) {
      if (game.bathRequest === 'enter') autopilot.enter(t.x, t.y - FOOT_OFFSET, t.z);
      else autopilot.exit(inBath);
      game.requestBath(null);
    }
    if (manual) autopilot.cancel();
    const auto = !manual && autopilot.steer(t.x, t.z, dt, move);
    const moving = manual || auto;
    const seated = autopilot.mode === 'seated';
    if (seated && !m.wasSeated) m.alignCamera = 1.5; // 앉으면 1.5초 동안 카메라를 자리 방향 뒤로 돌린다
    m.wasSeated = seated;

    m.bath += ((inBath ? 1 : 0) - m.bath) * (1 - Math.exp(-5 * dt));
    m.seat += ((seated ? 1 : 0) - m.seat) * (1 - Math.exp(-3 * dt));
    const speed = inBath ? BATH_SPEED : auto ? AUTO_WALK_SPEED : keys.run ? RUN_SPEED : WALK_SPEED;

    // 2) 중력과 점프(탕 안, 자동 이동 중에는 점프하지 않는다)
    if (m.grounded && m.vy < 0) m.vy = -1;
    if (keys.jump && !m.jumpHeld && m.grounded && !inBath && !auto) m.vy = JUMP_SPEED;
    m.jumpHeld = keys.jump;
    m.vy -= GRAVITY * dt;

    // 3) 충돌을 고려한 실제 이동량 계산
    c.computeColliderMovement(col, {
      x: move.x * speed * dt,
      y: m.vy * dt,
      z: move.z * speed * dt,
    });
    const corrected = c.computedMovement();
    m.grounded = c.computedGrounded();
    if (m.vy > 0 && corrected.y < m.vy * dt * 0.5) m.vy = 0; // 위가 막혀 있으면 상승을 멈춘다

    const next = { x: t.x + corrected.x, y: t.y + corrected.y, z: t.z + corrected.z };
    if (next.y < -20) {
      // 혹시 맵 밖으로 떨어지면 스폰으로
      [next.x, next.y, next.z] = WORLD.spawn;
      m.vy = 0;
    }
    b.setNextKinematicTranslation(next);

    // 4) 캐릭터 모습: 이동 방향을 바라보고, 걸을 때 통통 튄다. 자리에 앉으면 자리 방향(경치)을 본다
    if (moving) m.facing = lerpAngle(m.facing, Math.atan2(move.x, move.z), 1 - Math.exp(-12 * dt));
    else if (seated && autopilot.seat !== null) {
      m.facing = lerpAngle(m.facing, ONSEN_SEATS[autopilot.seat].facing, 1 - Math.exp(-4 * dt));
    }
    m.walkPhase = moving ? m.walkPhase + dt * speed * 3.2 : 0;
    if (avatarRoot.current) {
      avatarRoot.current.position.set(next.x, next.y - FOOT_OFFSET, next.z);
      avatarRoot.current.rotation.y = m.facing;
    }
    if (avatarBob.current) {
      const walkBob = m.grounded && moving && !inBath ? Math.abs(Math.sin(m.walkPhase)) * 0.09 : 0;
      // 물속에서는 어깨까지 잠기고 숨 쉬듯 살짝 오르내린다
      const floatBob = Math.sin(state.clock.elapsedTime * 1.3) * 0.012;
      // 자리에 앉으면 한 번 더 내려가 목까지 잠기고, 등을 바위에 기대듯 뒤로 젖힌다
      const sink = BATH_SINK + (BATH_SEAT_SINK - BATH_SINK) * m.seat;
      const bob = THREE.MathUtils.lerp(walkBob, -sink + floatBob, m.bath);
      avatarBob.current.position.y = THREE.MathUtils.lerp(avatarBob.current.position.y, bob, 0.5);
      avatarBob.current.rotation.z = m.grounded && moving && !inBath ? Math.sin(m.walkPhase) * 0.06 : 0;
      avatarBob.current.rotation.x = THREE.MathUtils.lerp(
        avatarBob.current.rotation.x,
        moving && !inBath ? (keys.run ? 0.14 : 0.06) : -BATH_LEAN_BACK * m.seat,
        0.15,
      );
    }

    // 5) 3인칭 카메라: 부드럽게 따라가되 시점 회전은 즉시 반영
    const lookHeight = THREE.MathUtils.lerp(LOOK_HEIGHT, BATH_LOOK_HEIGHT, m.bath);
    lookTarget.set(next.x, next.y - FOOT_OFFSET + lookHeight, next.z);
    smoothLook.current.lerp(lookTarget, 1 - Math.exp(-10 * dt));
    const look = smoothLook.current;
    // 막 앉았을 때는 카메라를 캐릭터 뒤로 돌려서 캐릭터가 보는 경치를 함께 본다
    if (m.alignCamera > 0) {
      m.alignCamera -= dt;
      o.yaw = lerpAngle(o.yaw, m.facing + Math.PI, 1 - Math.exp(-3 * dt));
    }
    // 탕 안에서는 거의 수평으로 바라봐서 물보다 바깥 설경이 화면을 채운다
    const pitch = o.pitch * THREE.MathUtils.lerp(1, BATH_PITCH_SCALE, m.bath);
    const cp = Math.cos(pitch);
    camDir.set(Math.sin(o.yaw) * cp, Math.sin(pitch), Math.cos(o.yaw) * cp);

    // 캐릭터와 카메라 사이에 건물, 지형이 있으면 카메라를 그 앞으로 당긴다.
    // 나무, 가스등(THIN_PROP_GROUPS)은 레이가 통과해서 숲에서 카메라가 튀지 않는다
    const wanted = o.distance * THREE.MathUtils.lerp(1, BATH_DISTANCE_SCALE, m.bath);
    let distance = wanted;
    cameraRay.origin = look;
    cameraRay.dir = camDir;
    const hit = world.castRay(cameraRay, wanted + CAMERA_WALL_GAP, true, undefined, CAMERA_RAY_GROUPS, col);
    if (hit) distance = Math.max(hit.timeOfImpact - CAMERA_WALL_GAP, CAMERA_MIN_DISTANCE);

    camGoal.copy(look).addScaledVector(camDir, distance);
    camGoal.y = Math.max(camGoal.y, terrainHeight(camGoal.x, camGoal.z) + 0.4);
    // 벽 때문에 당겨질 때는 바로, 멀어질 때는 부드럽게
    if (hit && camGoal.distanceToSquared(look) < state.camera.position.distanceToSquared(look)) {
      state.camera.position.copy(camGoal);
    } else {
      state.camera.position.lerp(camGoal, 1 - Math.exp(-14 * dt));
    }
    state.camera.lookAt(look);

    // 6) UI에 보여 줄 상태는 바뀔 때만 store로
    const action: PlayerAction = inBath
      ? 'bathe'
      : !m.grounded
        ? 'jump'
        : moving
          ? keys.run
            ? 'run'
            : 'walk'
          : 'idle';
    if (action !== lastAction.current) {
      lastAction.current = action;
      setAction(action);
    }
    const zone = zoneAt(next.x, next.z);
    if (zone !== lastZone.current) {
      lastZone.current = zone;
      setZone(zone);
    }
    playerFrame.x = next.x;
    playerFrame.y = next.y - FOOT_OFFSET;
    playerFrame.z = next.z;
    playerFrame.bathing = inBath;
    playerFrame.moving = moving;
    playerFrame.targetSeat = autopilot.seat;
    state.camera.position.toArray(playerFrame.camera);

    // 7) 데크 입구 근처면 '온천 즐기기' 버튼을 띄운다
    const near = autopilot.mode === 'free' && isNearOnsenEntrance(next.x, next.y - FOOT_OFFSET, next.z);
    if (near !== game.nearOnsenEntrance) game.setNearOnsenEntrance(near);
  });

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[...WORLD.spawn]}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider ref={collider} args={[HALF_HEIGHT, RADIUS]} />
      </RigidBody>
      <group ref={avatarRoot}>
        <group ref={avatarBob}>
          <Avatar bathing={bathing} />
        </group>
      </group>
    </>
  );
}
