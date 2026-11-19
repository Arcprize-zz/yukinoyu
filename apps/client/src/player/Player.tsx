import { useEffect, useRef } from 'react';
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
import { WORLD, type PlayerAction } from '@yukinoyu/shared';
import type { CtrlName } from '../controls';
import { useGame } from '../store';
import { Avatar } from './Avatar';
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

type Kcc = ReturnType<ReturnType<typeof useRapier>['world']['createCharacterController']>;

// 매 프레임 new 하지 않도록 재사용하는 임시 벡터
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const camGoal = new THREE.Vector3();

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
  const { world } = useRapier();
  const kcc = useRef<Kcc | null>(null);
  const [, getKeys] = useKeyboardControls<CtrlName>();
  const orbit = useOrbitCamera();

  const motion = useRef({ vy: 0, grounded: false, jumpHeld: false, walkPhase: 0, facing: Math.PI });
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
    const moving = move.lengthSq() > 0;
    if (moving) move.normalize();
    const speed = keys.run ? RUN_SPEED : WALK_SPEED;

    // 2) 중력과 점프
    if (m.grounded && m.vy < 0) m.vy = -1;
    if (keys.jump && !m.jumpHeld && m.grounded) m.vy = JUMP_SPEED;
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

    const t = b.translation();
    const next = { x: t.x + corrected.x, y: t.y + corrected.y, z: t.z + corrected.z };
    if (next.y < -20) {
      // 혹시 맵 밖으로 떨어지면 스폰으로
      [next.x, next.y, next.z] = WORLD.spawn;
      m.vy = 0;
    }
    b.setNextKinematicTranslation(next);

    // 4) 캐릭터 모습: 이동 방향을 바라보고, 걸을 때 통통 튄다
    if (moving) m.facing = lerpAngle(m.facing, Math.atan2(move.x, move.z), 1 - Math.exp(-12 * dt));
    m.walkPhase = moving ? m.walkPhase + dt * speed * 3.2 : 0;
    if (avatarRoot.current) {
      avatarRoot.current.position.set(next.x, next.y - FOOT_OFFSET, next.z);
      avatarRoot.current.rotation.y = m.facing;
    }
    if (avatarBob.current) {
      const bob = m.grounded && moving ? Math.abs(Math.sin(m.walkPhase)) * 0.09 : 0;
      avatarBob.current.position.y = THREE.MathUtils.lerp(avatarBob.current.position.y, bob, 0.5);
      avatarBob.current.rotation.z = m.grounded && moving ? Math.sin(m.walkPhase) * 0.06 : 0;
      avatarBob.current.rotation.x = THREE.MathUtils.lerp(
        avatarBob.current.rotation.x,
        moving ? (keys.run ? 0.14 : 0.06) : 0,
        0.15,
      );
    }

    // 5) 3인칭 카메라: 부드럽게 따라가되 시점 회전은 즉시 반영
    lookTarget.set(next.x, next.y - FOOT_OFFSET + LOOK_HEIGHT, next.z);
    smoothLook.current.lerp(lookTarget, 1 - Math.exp(-10 * dt));
    const look = smoothLook.current;
    const cp = Math.cos(o.pitch);
    camGoal.set(
      look.x + Math.sin(o.yaw) * cp * o.distance,
      Math.max(look.y + Math.sin(o.pitch) * o.distance, 0.4),
      look.z + Math.cos(o.yaw) * cp * o.distance,
    );
    state.camera.position.lerp(camGoal, 1 - Math.exp(-14 * dt));
    state.camera.lookAt(look);

    // 6) UI에 보여 줄 상태는 바뀔 때만 store로
    const action: PlayerAction = !m.grounded ? 'jump' : moving ? (keys.run ? 'run' : 'walk') : 'idle';
    if (action !== lastAction.current) {
      lastAction.current = action;
      setAction(action);
    }
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
          <Avatar />
        </group>
      </group>
    </>
  );
}
