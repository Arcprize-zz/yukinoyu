import { create } from 'zustand';
import type { PlayerAction } from '@yukinoyu/shared';
import type { ZoneId } from './world/layout';

interface GameState {
  action: PlayerAction;
  zone: ZoneId | null;
  setAction: (action: PlayerAction) => void;
  setZone: (zone: ZoneId | null) => void;
}

/**
 * React UI와 3D 씬이 공유하는 상태.
 * 매 프레임 바뀌는 값(위치 등)은 넣지 않는다. 바뀔 때만 리렌더되는 값만 둔다.
 */
export const useGame = create<GameState>((set) => ({
  action: 'idle',
  zone: null,
  setAction: (action) => set({ action }),
  setZone: (zone) => set({ zone }),
}));

const params = new URLSearchParams(location.search);
/** ?debug : 좌표, FPS, 숫자키 순간이동 */
export const DEBUG = params.has('debug');
/** ?debug=physics : 충돌체 외곽선까지 */
export const DEBUG_PHYSICS = params.get('debug') === 'physics';

/** 디버그 표시용. 매 프레임 덮어쓰고 React 상태로는 만들지 않는다 */
export const debugInfo = { x: 0, y: 0, z: 0 };
