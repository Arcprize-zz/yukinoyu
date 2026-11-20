import { useEffect } from 'react';
import { ONSEN_SEATS, pickSeat, seatsNear } from '@yukinoyu/shared';
import { DEBUG, otherPlayers, playerFrame, useGame, type Bather } from '../store';
import { ONSEN } from '../world/layout';
import { Avatar } from './Avatar';

const HATS = ['#f2e8cf', '#9ec1cf', '#f6c6c6', '#c3d7a4', '#e8c07d'];
const SCARVES = ['#3d5a80', '#a23e48', '#4f6d3a', '#7a4f8b', '#c06c2b'];

/** 앉은 사람은 목까지, 서 있는 사람은 어깨까지 잠긴다(Player의 입욕 깊이와 같게) */
const SEATED_SINK = 0.45;
const STANDING_SINK = 0.35;

let nextId = 1;

/**
 * 탕 안의 다른 사람들. 지금은 디버그로 추가하는 가짜 입욕객이고,
 * 4주차에 서버에서 받은 원격 플레이어로 바뀐다.
 *
 * ?debug 키:
 *   B: 빈자리에 앉는 사람(선호 순서대로 자리를 예약)
 *   V: 내가 가려는 자리에 예약 없이 서 있는 사람(걸어가는 도중 자리 양보 확인용)
 */
export function OtherBathers() {
  const bathers = useGame((s) => s.bathers);

  useEffect(() => {
    if (!DEBUG) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyB' && e.code !== 'KeyV') return;
      const game = useGame.getState();
      const id = `dummy-${nextId++}`;
      const look = { hat: HATS[nextId % HATS.length], scarf: SCARVES[nextId % SCARVES.length] };

      if (e.code === 'KeyB') {
        const blocked = seatsNear(otherPlayers.values());
        game.seats.forEach((who, i) => who !== null && blocked.add(i));
        const seat = pickSeat(blocked);
        if (seat === null || !game.claimSeat(seat, id)) return;
        const s = ONSEN_SEATS[seat];
        game.addBather({ id, x: s.x, z: s.z, facing: s.facing, seat, ...look });
      } else {
        // 내가 가는 중인 자리, 없으면 0번 자리에 그냥 서 있는다
        const s = ONSEN_SEATS[playerFrame.targetSeat ?? 0];
        game.addBather({ id, x: s.x + 0.1, z: s.z, facing: s.facing + Math.PI, seat: null, ...look });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {bathers.map((b) => (
        <BatherAvatar key={b.id} bather={b} />
      ))}
    </>
  );
}

function BatherAvatar({ bather: b }: { bather: Bather }) {
  const seated = b.seat !== null;
  return (
    <group position={[b.x, ONSEN.pool.floor, b.z]} rotation-y={b.facing}>
      <group position-y={-(seated ? SEATED_SINK : STANDING_SINK)} rotation-x={seated ? -0.15 : 0}>
        <Avatar bathing hat={b.hat} scarf={b.scarf} />
      </group>
    </group>
  );
}
