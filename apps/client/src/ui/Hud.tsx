import { useEffect, useRef } from 'react';
import type { PlayerAction } from '@yukinoyu/shared';
import { DEBUG, playerFrame, useGame } from '../store';
import { ZONES } from '../world/layout';
import { OnsenButton } from './OnsenButton';

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
      <ZoneToast />
      <OnsenButton />
      {DEBUG && <DebugReadout />}
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

/** 구역에 들어서면 이름이 잠깐 떠올랐다 사라진다 */
function ZoneToast() {
  const zoneId = useGame((s) => s.zone);
  const zone = ZONES.find((z) => z.id === zoneId);
  if (!zone) return null;
  // key가 바뀌면 새 요소가 되어 애니메이션이 처음부터 다시 돈다
  return (
    <div key={zone.id} className="hud__zone">
      <small>{zone.sub}</small>
      <strong>{zone.name}</strong>
    </div>
  );
}

/** 좌표 표시. React 상태를 거치지 않고 DOM을 직접 고친다 */
function DebugReadout() {
  const el = useRef<HTMLPreElement>(null);
  const zone = useGame((s) => s.zone);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (el.current) {
        const { x, y, z, camera: c } = playerFrame;
        el.current.textContent =
          `x ${x.toFixed(1)}  y ${y.toFixed(2)}  z ${z.toFixed(1)}\n` +
          `cam ${c[0].toFixed(1)}  ${c[1].toFixed(2)}  ${c[2].toFixed(1)}`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hud__debug">
      <pre ref={el} />
      <span>zone: {zone ?? '-'}</span>
    </div>
  );
}
