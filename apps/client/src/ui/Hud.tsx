import type { PlayerAction } from '@yukinoyu/shared';
import { useGame } from '../store';

const ACTION_LABEL: Record<PlayerAction, string> = {
  idle: '쉬는 중',
  walk: '눈길을 걷는 중',
  run: '달리는 중',
  jump: '폴짝',
  sit: '앉아 있는 중',
  bathe: '온천에 몸을 담그는 중',
};

export function Hud() {
  const action = useGame((s) => s.action);

  return (
    <div className="hud">
      <div className="hud__title">
        <h1>
          유키노유<span>雪の湯</span>
        </h1>
        <p>홋카이도의 겨울 · 프로토타입 1주차</p>
      </div>
      <div className="hud__status">{ACTION_LABEL[action]}</div>
      <div className="hud__keys">
        <span>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>이동
        </span>
        <span>
          <kbd>Shift</kbd>달리기
        </span>
        <span>
          <kbd>Space</kbd>점프
        </span>
        <span>드래그 시점 · 휠 거리</span>
      </div>
    </div>
  );
}
