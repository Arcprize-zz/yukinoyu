import { create } from 'zustand';
import { ONSEN_SEATS, type PlayerAction } from '@yukinoyu/shared';
import type { ZoneId } from './world/layout';

/** 온천 자동 입장 흐름: 자유 → 들어가는 중 → 앉음 → 나오는 중 → 자유 */
export type BathMode = 'free' | 'entering' | 'seated' | 'leaving';

/** 내 아이디. 4단계에 서버가 준 방문 번호로 바뀐다 */
export const ME = 'me';

/** 디버그용 다른 입욕객(4단계에 실제 원격 플레이어로 바뀐다) */
export interface Bather {
  id: string;
  x: number;
  z: number;
  facing: number;
  /** 자리에 앉아 있으면 자리 id, 탕 안에 서 있기만 하면 null */
  seat: number | null;
  hat: string;
  scarf: string;
}

interface GameState {
  action: PlayerAction;
  zone: ZoneId | null;
  setAction: (action: PlayerAction) => void;
  setZone: (zone: ZoneId | null) => void;

  // ── 온천 ──
  bathMode: BathMode;
  setBathMode: (mode: BathMode) => void;
  /** 입구 근처라서 '온천 즐기기' 버튼을 보여 줄지 */
  nearOnsenEntrance: boolean;
  setNearOnsenEntrance: (near: boolean) => void;
  /** HUD 버튼 → Player로 전하는 요청. Player가 처리하고 지운다 */
  bathRequest: 'enter' | 'exit' | null;
  requestBath: (request: 'enter' | 'exit' | null) => void;
  /** 자리별 예약자 id(없으면 null). 4단계부터는 서버가 내려주는 값으로 바뀐다 */
  seats: (string | null)[];
  /** 비어 있을 때만 예약된다. 서버의 판정을 흉내 낸다 */
  claimSeat: (seat: number, who: string) => boolean;
  releaseSeat: (who: string) => void;

  // ── 디버그 입욕객 ──
  bathers: Bather[];
  addBather: (bather: Bather) => void;
}

/**
 * React UI와 3D 씬이 공유하는 상태.
 * 매 프레임 바뀌는 값(위치 등)은 넣지 않는다. 바뀔 때만 리렌더되는 값만 둔다.
 */
export const useGame = create<GameState>((set, get) => ({
  action: 'idle',
  zone: null,
  setAction: (action) => set({ action }),
  setZone: (zone) => set({ zone }),

  bathMode: 'free',
  setBathMode: (bathMode) => set({ bathMode }),
  nearOnsenEntrance: false,
  setNearOnsenEntrance: (nearOnsenEntrance) => set({ nearOnsenEntrance }),
  bathRequest: null,
  requestBath: (bathRequest) => set({ bathRequest }),
  seats: ONSEN_SEATS.map(() => null),
  claimSeat: (seat, who) => {
    const seats = get().seats;
    if (seats[seat] !== null && seats[seat] !== who) return false;
    set({ seats: seats.map((s, i) => (i === seat ? who : s === who ? null : s)) });
    return true;
  },
  releaseSeat: (who) => set({ seats: get().seats.map((s) => (s === who ? null : s)) }),

  bathers: [],
  addBather: (bather) => {
    set({ bathers: [...get().bathers, bather] });
    otherPlayers.set(bather.id, { x: bather.x, z: bather.z });
  },
}));

/**
 * 다른 사람들의 이번 프레임 위치(나 제외). 4단계에는 서버 동기화가 매 프레임 덮어쓴다.
 * 자리 예약 없이 탕 안에 서 있는 사람도 자리를 막도록 쓰인다.
 */
export const otherPlayers = new Map<string, { x: number; z: number }>();

const params = new URLSearchParams(location.search);
/** ?debug : 좌표, FPS, 숫자키 순간이동 */
export const DEBUG = params.has('debug');
/** ?debug=physics : 충돌체 외곽선까지 */
export const DEBUG_PHYSICS = params.get('debug') === 'physics';

/**
 * 내 캐릭터의 이번 프레임 상태. Player가 매 프레임 덮어쓰고,
 * 수면 파문, 디버그 표시처럼 매 프레임 읽어야 하는 곳이 그대로 읽는다(React 상태 아님).
 */
export const playerFrame = {
  x: 0,
  y: 0,
  z: 0,
  bathing: false,
  moving: false,
  targetSeat: null as number | null,
  /** 디버그 표시용 카메라 위치 */
  camera: [0, 0, 0] as [number, number, number],
};
