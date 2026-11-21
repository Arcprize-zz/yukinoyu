/**
 * 맵 배치의 단일 기준.
 * 좌표: 1 = 1m, 스폰에서 처음 바라보는 쪽이 -z(북쪽), 오른쪽이 +x(동쪽).
 *
 *            [-z 북: 원경 설산]
 *   ③ 자작나무 언덕 (-27,-29)      ① 료칸 + 노천온천 (30,-22)
 *                 ╲    광장(0,-6)    ╱
 *                  ② 온천 거리 (0, 0 ~ 30)
 *                         │
 *                  ⓪ 간이역 (0, 42)  ← 스폰
 *            [+z 남: 선로]
 */
import { interactionGroups } from '@react-three/rapier';

export type Vec2 = [number, number];

export type ZoneId = 'station' | 'street' | 'onsen' | 'hill';

export interface Zone {
  id: ZoneId;
  name: string;
  sub: string;
  center: Vec2;
  radius: number;
  /** 원 하나로 덮지 못하는 곳을 덧붙이는 영역(구역 판정에만 쓰고, 나무 배치에는 영향 없음) */
  extra?: { center: Vec2; radius: number }[];
  /** 디버그 순간이동 위치(?debug에서 숫자키 1~4) */
  teleport: [number, number, number];
}

export const ZONES: Zone[] = [
  { id: 'station', name: '눈 내리는 간이역', sub: '雪の駅', center: [0, 42], radius: 12, teleport: [0, 2, 42] },
  {
    id: 'street',
    name: '온천 거리',
    sub: '湯の街',
    center: [0, 10],
    radius: 18,
    // 광장 북쪽 끝(소원 등롱 벽, z -13.5)까지
    extra: [{ center: [0, -6], radius: 8.5 }],
    teleport: [0, 2, 22],
  },
  { id: 'onsen', name: '료칸과 노천온천', sub: '雪見露天風呂', center: [31, -23], radius: 15, teleport: [30.5, 2, -12.5] },
  { id: 'hill', name: '자작나무 언덕', sub: '白樺の丘', center: [-27, -29], radius: 15, teleport: [-24, 9, -25] },
];

/** 가장 가까운 구역(반경 안일 때만) */
export function zoneAt(x: number, z: number): ZoneId | null {
  let best: ZoneId | null = null;
  let bestD = Infinity;
  for (const zone of ZONES) {
    for (const area of [zone, ...(zone.extra ?? [])]) {
      const d = Math.hypot(x - area.center[0], z - area.center[1]);
      if (d < area.radius && d < bestD) {
        best = zone.id;
        bestD = d;
      }
    }
  }
  return best;
}

// ── 지형 ──────────────────────────────────────────────

export const HILL = { x: -27, z: -29, height: 7, sigma: 11 };
/** 맵 가장자리를 둘러싼 눈 둔덕 */
const BERM = { start: 50, end: 62, height: 7 };

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 지형 높이. 나무, 가스등 같은 소품을 땅에 붙일 때 쓴다 */
export function terrainHeight(x: number, z: number) {
  const dx = x - HILL.x;
  const dz = z - HILL.z;
  const hill = HILL.height * Math.exp(-(dx * dx + dz * dz) / (2 * HILL.sigma * HILL.sigma));
  const edge = Math.max(Math.abs(x), Math.abs(z));
  return hill + BERM.height * smoothstep(BERM.start, BERM.end, edge);
}

export const TERRAIN_EDGE_HEIGHT = BERM.height;

// ── 길 ────────────────────────────────────────────────

interface PathSegment {
  a: Vec2;
  b: Vec2;
  width: number;
}

/** 다져진 눈길. 지형 색으로 칠한다 */
export const PATHS: PathSegment[] = [
  { a: [0, 37], b: [0, 31], width: 5 }, // 역 → 거리
  { a: [0, 31], b: [0, -1], width: 8 }, // 온천 거리
  { a: [5, -8], b: [19, -15], width: 3.5 }, // 광장 → 료칸
  { a: [19, -15], b: [30.5, -15], width: 3 }, // 료칸 앞 → 온천 계단
  { a: [-5, -9], b: [-17, -19], width: 3.5 }, // 광장 → 언덕
  { a: [-17, -19], b: [-25.5, -27], width: 3 }, // 언덕 오르는 길
];

export const PLAZA = { center: [0, -6] as Vec2, radius: 7 };

function distToSegment(x: number, z: number, [ax, az]: Vec2, [bx, bz]: Vec2) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - (ax + vx * t), z - (az + vz * t));
}

/** 0(눈밭) ~ 1(길 한가운데) */
export function pathMask(x: number, z: number) {
  let mask = 0;
  for (const p of PATHS) {
    const d = distToSegment(x, z, p.a, p.b);
    mask = Math.max(mask, 1 - smoothstep(p.width / 2 - 0.6, p.width / 2 + 0.2, d));
  }
  const dp = Math.hypot(x - PLAZA.center[0], z - PLAZA.center[1]);
  return Math.max(mask, 1 - smoothstep(PLAZA.radius - 0.6, PLAZA.radius + 0.2, dp));
}

/**
 * 뒤에 아무것도 없어야 잘 보이는 곳. [x0, z0, x1, z1]
 * 소원 등롱 벽(광장 북쪽 z -13) 뒤를 비워서 등롱이 나무와 겹쳐 보이지 않게 한다
 */
const CLEAR_RECTS: [number, number, number, number][] = [[-8, -22, 8, -11]];

/** 소품을 놓으면 안 되는 곳(구역, 길, 광장, 선로). margin은 소품의 반지름 */
export function isReserved(x: number, z: number, margin = 0) {
  if (pathMask(x, z) > 0 || PATHS.some((p) => distToSegment(x, z, p.a, p.b) < p.width / 2 + margin)) {
    return true;
  }
  if (Math.hypot(x - PLAZA.center[0], z - PLAZA.center[1]) < PLAZA.radius + margin) return true;
  if (CLEAR_RECTS.some(([x0, z0, x1, z1]) => x > x0 - margin && x < x1 + margin && z > z0 - margin && z < z1 + margin)) {
    return true;
  }
  if (z > 46 - margin && z < 52 + margin) return true; // 선로
  return ZONES.some((zone) => Math.hypot(x - zone.center[0], z - zone.center[1]) < zone.radius + margin);
}

// ── 노천온천 ──────────────────────────────────────────

/**
 * 온천은 높이 1m 데크 안에 파인 탕이다(지형 충돌체를 뚫지 않기 위해).
 *   데크 바깥: x 28~42, z -30~-18 / 탕: x 32~40, z -28~-22
 *   탕 바닥 0.35m, 수면 0.95m (물 깊이 0.6m)
 */
export const ONSEN = {
  deckTop: 1.0,
  pool: { x0: 32, x1: 40, z0: -28, z1: -22, floor: 0.35, water: 0.95 },
  /** 탕 옆 정자에 매단 등불. 수면 반사광의 기준 */
  lamp: [40.4, 3.15, -25] as [number, number, number],
};

/**
 * 자동 입장 경로. 데크 입구 → 바위 계단(경사로) 위 → 아래 → 자리.
 * 경사로는 z -25를 따라 x 32(데크) → 33.6(탕 바닥)으로 내려간다
 */
export const ONSEN_PATH = {
  /** 이 점에서 2.2m 안이면 '온천 즐기기' 버튼이 뜬다 */
  entrance: [30.6, -25] as Vec2,
  entranceRadius: 2.2,
  rampTop: [31.8, -25] as Vec2,
  rampBottom: [34.0, -25] as Vec2,
};

/**
 * 데크 위 입구 근처인지. '온천 즐기기' 버튼을 띄울 때와,
 * 입장 요청을 받았을 때 다시 확인할 때 같은 기준을 쓴다
 */
export function isNearOnsenEntrance(x: number, footY: number, z: number) {
  const [ex, ez] = ONSEN_PATH.entrance;
  return footY > ONSEN.deckTop - 0.2 && Math.hypot(x - ex, z - ez) < ONSEN_PATH.entranceRadius;
}

/** 발 위치가 탕 바닥에 있는지(나가는 계단 위는 제외) */
export function isInPool(x: number, footY: number, z: number) {
  const { x0, x1, z0, z1, floor } = ONSEN.pool;
  return x > x0 + 0.05 && x < x1 - 0.05 && z > z0 + 0.05 && z < z1 - 0.05 && footY < floor + 0.15;
}

// ── 가스등 ────────────────────────────────────────────

export const LAMP_POSITIONS: Vec2[] = [
  ...[27, 20.5, 14, 7.5, 1].flatMap((z): Vec2[] => [
    [-4.6, z],
    [4.6, z - 3.2],
  ]),
  [10, -12.5],
  [24, -13.4],
  [-11.5, -11.5],
  [-19.5, -24],
];

// ── 충돌 그룹 ─────────────────────────────────────────

/**
 * 나무, 가스등처럼 가는 물체. 캐릭터는 부딪히지만 카메라는 통과한다
 * (카메라가 나무 기둥마다 앞으로 튀어나오지 않게).
 */
export const THIN_PROP_GROUPS = interactionGroups(0);
/** 카메라 충돌 레이: 그룹 1에 속한 것(기본값인 건물, 지형)만 맞는다 */
export const CAMERA_RAY_GROUPS = interactionGroups(1, [1]);
