import { SYNC, type PlayerAction } from '@yukinoyu/shared';

/**
 * 원격 플레이어 위치 보간(스냅샷 보간).
 *
 * 서버 패치가 도착한 시각과 함께 스냅샷을 쌓아 두고, 화면에는 SYNC.interpDelayMs만큼 과거 시점을
 * 앞뒤 스냅샷 사이에서 보간해 그린다. 패치가 50ms마다 와도 화면은 매 프레임 부드럽게 움직인다.
 * 외삽(예측)은 하지 않는다. 멈출 때 지나쳤다가 되돌아오는 모습이 보간 지연보다 더 거슬려서다.
 *
 * React 상태가 아니라 모듈 수준 Map이다. 매 프레임 바뀌는 값이라서(CLAUDE.md 성능 규칙).
 */

interface Sample {
  /** 받은 시각(performance.now) */
  t: number;
  x: number;
  y: number;
  z: number;
  ry: number;
  action: PlayerAction;
}

export interface RemotePose {
  x: number;
  y: number;
  z: number;
  ry: number;
  action: PlayerAction;
}

/** 버퍼에 남길 최대 스냅샷 수(보간 지연 120ms / 패치 50ms보다 넉넉히) */
const MAX_SAMPLES = 12;

const buffers = new Map<string, Sample[]>();

export function addRemote(id: string, pose: RemotePose, now = performance.now()) {
  buffers.set(id, [{ t: now, ...pose }]);
}

export function removeRemote(id: string) {
  buffers.delete(id);
}

export function clearRemotes() {
  buffers.clear();
}

/** 서버에서 새 상태를 받을 때마다 호출 */
export function pushSample(id: string, pose: RemotePose, now = performance.now()) {
  const buf = buffers.get(id);
  if (!buf) return addRemote(id, pose, now);
  const last = buf[buf.length - 1];

  // 순간이동(디버그 이동, 스폰 복귀)은 보간하지 않고 바로 옮긴다
  if (Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z) > SYNC.snapDistance) {
    buf.length = 0;
    buf.push({ t: now, ...pose });
    return;
  }

  // 한동안 서 있다가 다시 움직이면 마지막 스냅샷이 오래전 것이라, 그대로 보간하면
  // 몇 초에 걸쳐 천천히 미끄러진다. 직전 패치 시점에 '멈춰 있던 위치'를 하나 끼워 넣는다
  if (now - last.t > SYNC.patchRateMs * 2) {
    buf.push({ ...last, t: now - SYNC.patchRateMs });
  }
  buf.push({ t: now, ...pose });
  if (buf.length > MAX_SAMPLES) buf.splice(0, buf.length - MAX_SAMPLES);
}

/** 차이가 가장 작은 쪽으로 각도를 보간 */
function lerpAngle(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

/**
 * 지금 그릴 위치를 out에 넣는다(매 프레임 호출, 새 객체를 만들지 않음).
 * @returns 이 플레이어의 스냅샷이 없으면 false
 */
export function sampleRemote(id: string, out: RemotePose, now = performance.now()): boolean {
  const buf = buffers.get(id);
  if (!buf || buf.length === 0) return false;
  const renderT = now - SYNC.interpDelayMs;

  // renderT를 감싸는 두 스냅샷 찾기. 없으면 가장 가까운 끝 값
  let i = buf.length - 1;
  while (i > 0 && buf[i - 1].t > renderT) i--;
  const b = buf[i];
  const a = i > 0 ? buf[i - 1] : b;
  const span = b.t - a.t;
  const k = span > 0 ? Math.min(1, Math.max(0, (renderT - a.t) / span)) : 1;

  out.x = a.x + (b.x - a.x) * k;
  out.y = a.y + (b.y - a.y) * k;
  out.z = a.z + (b.z - a.z) * k;
  out.ry = lerpAngle(a.ry, b.ry, k);
  out.action = k < 0.5 ? a.action : b.action;

  // 이미 지난 스냅샷은 보간에 필요한 하나만 남기고 버린다
  if (i > 1) buf.splice(0, i - 1);
  return true;
}
