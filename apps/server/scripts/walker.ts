/**
 * 보간 확인용 봇. 스폰 앞에서 원을 그리며 걷는다. `npm run walker -w @yukinoyu/server [주소] [초]`
 */
import { Client } from '@colyseus/sdk';
import { MSG, ROOM_NAME, SERVER_PORT, SYNC, WORLD, type MoveMessage } from '@yukinoyu/shared';

const url = process.argv[2] ?? `ws://localhost:${SERVER_PORT}`;
const seconds = Number(process.argv[3] ?? 60);
const room = await new Client(url).joinOrCreate(ROOM_NAME);
// 첫 상태는 접속 직후 조금 뒤에 도착한다
await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
console.log(`봇 접속: "${room.state.players.get(room.sessionId)?.nick ?? '?'}" (${seconds}초)`);

const [sx, , sz] = WORLD.spawn;
const center = { x: sx, z: sz - 6 };
const radius = 2.5;
const speed = 3.2; // 걷는 속도(m/s)
const start = Date.now();
const timer = setInterval(() => {
  const t = (Date.now() - start) / 1000;
  const a = (t * speed) / radius;
  const x = center.x + Math.cos(a) * radius;
  const z = center.z + Math.sin(a) * radius;
  // 진행 방향(접선)을 바라본다. ry=0이면 +z
  const ry = Math.atan2(-Math.sin(a), Math.cos(a));
  const move: MoveMessage = { p: [x, WORLD.spawn[1] - 0.8, z], ry, action: 'walk' };
  room.send(MSG.move, move);
  if (t > seconds) {
    clearInterval(timer);
    void room.leave().then(() => process.exit(0));
  }
}, SYNC.sendIntervalMs);
