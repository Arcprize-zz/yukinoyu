import { create } from 'zustand';
import type { PlayerAction } from '@yukinoyu/shared';

interface GameState {
  action: PlayerAction;
  setAction: (action: PlayerAction) => void;
}

/**
 * React UI와 3D 씬이 공유하는 상태.
 * 매 프레임 바뀌는 값(위치 등)은 넣지 않는다. 바뀔 때만 리렌더되는 값만 둔다.
 */
export const useGame = create<GameState>((set) => ({
  action: 'idle',
  setAction: (action) => set({ action }),
}));
