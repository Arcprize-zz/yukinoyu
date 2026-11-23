/**
 * 서버 확인용 봇 두 개. `npm run smoke -w @yukinoyu/server [ws://주소:2567]`
 * 접속과 별명 배정, 위치 동기화, 같은 자리 동시 예약, 퇴장 시 자리 해제를 확인한다.
 */
import { Client, Callbacks } from '@colyseus/sdk';
import { MSG, ROOM_NAME, SERVER_PORT, type MoveMessage, type SeatClaimResult } from '@yukinoyu/shared';

const url = process.argv[2] ?? `ws://localhost:${SERVER_PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed = true;
};

const a = await new Client(url).joinOrCreate(ROOM_NAME);
const b = await new Client(url).joinOrCreate(ROOM_NAME);
await wait(300);
check(a.roomId === b.roomId, `같은 방에 들어감 (${a.roomId})`);

const nickA = a.state.players.get(a.sessionId)?.nick;
const nickB = a.state.players.get(b.sessionId)?.nick;
console.log(`  별명: A="${nickA}", B="${nickB}"`);
check(!!nickA && !!nickB && nickA !== nickB, '서로 다른 별명');

// B가 받는 A의 위치 변경 횟수
let updates = 0;
Callbacks.get(b).onAdd('players', (p, id) => {
  if (id === a.sessionId) Callbacks.get(b).onChange(p as object, () => updates++);
});

for (let i = 0; i < 20; i++) {
  const move: MoveMessage = { p: [i * 0.1, 0, 40], ry: 0.5, action: 'walk' };
  a.send(MSG.move, move);
  await wait(50);
}
await wait(200);
const seen = b.state.players.get(a.sessionId);
check(Math.abs((seen?.x ?? -1) - 1.9) < 0.01 && seen?.action === 'walk', `B가 A의 마지막 위치를 받음 (x=${seen?.x?.toFixed(2)})`);
console.log(`  A 변경 수신 ${updates}회 / 1초 (패치 20Hz 기대)`);

a.send(MSG.move, { p: [1e9, Number.NaN, 0], ry: 0, action: 'fly' });
await wait(150);
check(b.state.players.get(a.sessionId)?.x === seen?.x, '잘못된 move는 무시');
a.send(MSG.move, { p: [999, 0, 0], ry: 0, action: 'idle' } satisfies MoveMessage);
await wait(150);
check(b.state.players.get(a.sessionId)?.x === 60, `월드 밖 좌표는 경계로 자름 (x=${b.state.players.get(a.sessionId)?.x})`);

// 같은 자리 동시 예약: 한 명만 성공해야 한다
const [ra, rb] = await Promise.all([
  a.request(MSG.seatClaim, { seat: 0 }) as Promise<SeatClaimResult>,
  b.request(MSG.seatClaim, { seat: 0 }) as Promise<SeatClaimResult>,
]);
check(ra.ok !== rb.ok, `0번 자리 동시 예약 → 하나만 성공 (A=${ra.ok}, B=${rb.ok})`);
await wait(150);
const winner = ra.ok ? a.sessionId : b.sessionId;
check(b.state.seats[0] === winner, '자리 상태가 모두에게 전달됨');

// B가 1번 자리에 서 있으면 A는 1번을 못 잡는다
b.send(MSG.move, { p: [35.0, 0, -22.7], ry: 0, action: 'bathe' } satisfies MoveMessage);
await wait(150);
const r1 = (await a.request(MSG.seatClaim, { seat: 1 })) as SeatClaimResult;
check(!r1.ok, '남이 서 있는 자리는 거절');
const bad = (await a.request(MSG.seatClaim, { seat: 99 })) as SeatClaimResult;
check(!bad.ok, '없는 자리 번호는 거절');

// 예약한 쪽이 나가면 자리가 풀린다
const leaver = ra.ok ? a : b;
const stayer = ra.ok ? b : a;
await leaver.leave();
await wait(200);
check(stayer.state.seats[0] === '' && !stayer.state.players.has(winner), '나간 사람의 자리와 캐릭터가 사라짐');
await stayer.leave();

console.log(failed ? '\n실패한 항목이 있습니다' : '\n모두 통과');
process.exit(failed ? 1 : 0);
