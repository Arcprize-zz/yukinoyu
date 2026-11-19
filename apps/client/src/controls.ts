import type { KeyboardControlsEntry } from '@react-three/drei';

export const Ctrl = {
  forward: 'forward',
  backward: 'backward',
  left: 'left',
  right: 'right',
  run: 'run',
  jump: 'jump',
} as const;

export type CtrlName = (typeof Ctrl)[keyof typeof Ctrl];

// 한글 입력 상태에서도 동작하도록 event.code(KeyW 등)를 함께 등록한다
export const keyMap: KeyboardControlsEntry<CtrlName>[] = [
  { name: Ctrl.forward, keys: ['KeyW', 'ArrowUp'] },
  { name: Ctrl.backward, keys: ['KeyS', 'ArrowDown'] },
  { name: Ctrl.left, keys: ['KeyA', 'ArrowLeft'] },
  { name: Ctrl.right, keys: ['KeyD', 'ArrowRight'] },
  { name: Ctrl.run, keys: ['ShiftLeft', 'ShiftRight'] },
  { name: Ctrl.jump, keys: ['Space'] },
];
