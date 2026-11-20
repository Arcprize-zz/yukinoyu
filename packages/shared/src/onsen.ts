/**
 * 노천온천 자리. 클라이언트(자동 입장)와 서버(4주차, 자리 예약 판정)가 같은 데이터와 함수를 쓴다.
 * 좌표는 클라이언트 world/layout.ts의 ONSEN.pool(x 32~40, z -28~-22) 안쪽이다.
 */

export interface OnsenSeat {
  id: number;
  x: number;
  z: number;
  /** 앉았을 때 바라보는 방향(y축 회전, 0이면 +z) */
  facing: number;
}

const FACE_NORTH = Math.PI; // -z: 원경의 큰 설산 쪽
const FACE_SOUTH = 0; // +z: 료칸 쪽
const FACE_WEST = -Math.PI / 2; // -x

/** 배열 순서가 선호 순서다(0번이 설산이 가장 잘 보이는 자리) */
export const ONSEN_SEATS: OnsenSeat[] = [
  { id: 0, x: 36.8, z: -22.7, facing: FACE_NORTH },
  { id: 1, x: 35.0, z: -22.7, facing: FACE_NORTH },
  { id: 2, x: 38.6, z: -22.7, facing: FACE_NORTH },
  { id: 3, x: 39.3, z: -24.2, facing: FACE_WEST },
  { id: 4, x: 39.3, z: -25.8, facing: FACE_WEST },
  { id: 5, x: 38.6, z: -27.3, facing: FACE_SOUTH },
  { id: 6, x: 36.8, z: -27.3, facing: FACE_SOUTH },
  { id: 7, x: 35.0, z: -27.3, facing: FACE_SOUTH },
];

/** 이 거리(m) 안에 다른 사람이 서 있으면 그 자리는 차 있는 것으로 본다 */
export const SEAT_BLOCK_RADIUS = 0.8;

/**
 * 빈자리 고르기. 원하는 자리가 비어 있으면 그 자리, 아니면 원하는 자리에서 가장 가까운 빈자리.
 * @param blocked 예약됐거나 사람이 서 있는 자리 id
 * @returns 자리 id, 꽉 찼으면 null
 */
export function pickSeat(blocked: ReadonlySet<number>, preferred = 0): number | null {
  const want = ONSEN_SEATS[preferred] ?? ONSEN_SEATS[0];
  let best: OnsenSeat | null = null;
  let bestD = Infinity;
  for (const seat of ONSEN_SEATS) {
    if (blocked.has(seat.id)) continue;
    const d = Math.hypot(seat.x - want.x, seat.z - want.z);
    if (d < bestD) {
      best = seat;
      bestD = d;
    }
  }
  return best ? best.id : null;
}

/** 다른 사람들이 서 있는 위치로 막힌 자리 id */
export function seatsNear(positions: Iterable<{ x: number; z: number }>): Set<number> {
  const out = new Set<number>();
  for (const p of positions) {
    for (const seat of ONSEN_SEATS) {
      if (Math.hypot(seat.x - p.x, seat.z - p.z) < SEAT_BLOCK_RADIUS) out.add(seat.id);
    }
  }
  return out;
}
