import { useEffect } from 'react';
import { ONSEN_SEATS, seatsNear } from '@yukinoyu/shared';
import { ME, otherPlayers, useGame } from '../store';

/**
 * 온천 입구에서 뜨는 '온천 즐기기' 버튼, 탕 안에서 뜨는 '온천에서 나오기' 버튼.
 * 클릭이나 E키로 누르면 Player의 자동 이동에 요청만 전한다.
 */
export function OnsenButton() {
  const near = useGame((s) => s.nearOnsenEntrance);
  const mode = useGame((s) => s.bathMode);
  const seats = useGame((s) => s.seats);
  const requestBath = useGame((s) => s.requestBath);
  // 방향키로 조작을 되찾아 탕 안을 걷는 중에도 나오기 버튼을 보여 준다
  const inPool = useGame((s) => s.action === 'bathe');

  // 예약된 자리 + 예약 없이 남이 서 있는 자리
  const blocked = seatsNear(otherPlayers.values());
  seats.forEach((who, id) => {
    if (who !== null && who !== ME) blocked.add(id);
  });
  const free = ONSEN_SEATS.length - blocked.size;

  const action: 'enter' | 'exit' | null =
    mode === 'free' && near && free > 0
      ? 'enter'
      : mode === 'entering' || mode === 'seated' || (mode === 'free' && inPool)
        ? 'exit'
        : null;

  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && !e.repeat) requestBath(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [action, requestBath]);

  if (mode === 'free' && near && free === 0) {
    return (
      <div className="onsen-action">
        <button type="button" disabled>
          빈자리가 없어요
        </button>
        <span>
          {ONSEN_SEATS.length}/{ONSEN_SEATS.length}
        </span>
      </div>
    );
  }
  if (!action) return null;

  return (
    <div className="onsen-action">
      <button type="button" onClick={() => requestBath(action)}>
        {action === 'enter' ? '♨ 온천 즐기기' : '온천에서 나오기'}
        <kbd>E</kbd>
      </button>
      {action === 'enter' && (
        <span>
          빈자리 {free}/{ONSEN_SEATS.length}
        </span>
      )}
    </div>
  );
}
