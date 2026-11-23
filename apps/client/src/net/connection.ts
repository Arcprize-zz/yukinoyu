import { Callbacks, Client, type Room } from '@colyseus/sdk';
import {
  MSG,
  ROOM_NAME,
  SERVER_PORT,
  SYNC,
  type MoveMessage,
  type PlayerAction,
  type SeatClaimResult,
} from '@yukinoyu/shared';
import { ME, otherPlayers, playerFrame, setMe, useGame } from '../store';
import { addRemote, clearRemotes, pushSample, removeRemote } from './remoteFrames';

/**
 * Colyseus 서버 접속. 접속에 실패하면 혼자 노는 모드로 그대로 진행한다.
 *
 * 서버 주소: VITE_SERVER_URL(apps/client/.env.local), 없으면 페이지를 연 호스트의 2567 포트.
 * 맥북에서 서버, PC에서 클라이언트를 띄울 때는 PC의 .env.local에 맥북 IP를 적는다.
 */
const SERVER_URL: string =
  import.meta.env.VITE_SERVER_URL || `ws://${location.hostname || 'localhost'}:${SERVER_PORT}`;

/** 서버 상태의 모양(서버 apps/server/src/state.ts). 클라이언트는 Reflection으로 받아서 타입만 적어 둔다 */
interface NetPlayer {
  nick: string;
  hat: string;
  scarf: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  action: string;
}

let room: Room | null = null;
let started = false;
let sendTimer = 0;
/**
 * 아직 서버 상태에서 확인되지 않은 내 자리 예약. 이 동안은 상태 패치가 와도 내 예약으로 보이게 덮어쓴다.
 * 서버의 답장(request 응답)은 즉시 오지만 상태 패치는 patchRate(약 50ms)마다 묶여서 오므로,
 * "승인" 답장을 받아도 패치에 내 이름이 보일 때까지는 지우지 않는다(지우면 거절된 줄 알고 자리를 바꾼다).
 * 지우는 때: 패치에서 확인됨 / 거절 답장 / 자리를 놓음 / 연결 끊김
 */
let pendingSeat: number | null = null;
const lastSent = { x: NaN, y: NaN, z: NaN, ry: NaN, action: '' as string };

/** 앱 시작 시 한 번(main.tsx). StrictMode에서 두 번 불려도 한 번만 접속한다 */
export function connect() {
  if (started) return;
  started = true;
  void join();
}

async function join() {
  try {
    const r = await new Client(SERVER_URL).joinOrCreate(ROOM_NAME);
    room = r;
    setMe(r.sessionId);
    useGame.setState({ netStatus: 'online', claimSeat: netClaimSeat, releaseSeat: netReleaseSeat });
    console.info(`[net] ${SERVER_URL} 접속 (${r.sessionId})`);
    watchState(r);
    sendTimer = window.setInterval(sendMove, SYNC.sendIntervalMs);
    r.onLeave(() => goOffline('연결 끊김'));
  } catch (err) {
    console.warn(`[net] ${SERVER_URL}에 접속하지 못해 혼자 모드로 진행합니다`, err);
    useGame.setState({ netStatus: 'offline' });
  }
}

function watchState(r: Room) {
  const cb = Callbacks.get(r as Room<any, any>);

  // Reflection으로 받은 상태라 콜백 인자 타입이 unknown이다. 서버 스키마 모양(NetPlayer)으로 읽는다
  cb.onAdd('players', (value, key) => {
    const p = value as NetPlayer;
    const id = key as string;
    if (id === r.sessionId) {
      useGame.setState({ me: { nick: p.nick, hat: p.hat, scarf: p.scarf } });
      return;
    }
    addRemote(id, pose(p));
    otherPlayers.set(id, { x: p.x, z: p.z });
    const info = { id, nick: p.nick, hat: p.hat, scarf: p.scarf };
    useGame.setState((s) => ({ remotes: [...s.remotes.filter((x) => x.id !== id), info] }));
    // 바뀐 필드가 있는 패치마다 한 번 불린다 → 보간 버퍼에 스냅샷 추가
    cb.onChange(p, () => pushSample(id, pose(p)));
  });

  cb.onRemove('players', (_value, key) => {
    const id = key as string;
    removeRemote(id);
    otherPlayers.delete(id);
    useGame.setState((s) => ({ remotes: s.remotes.filter((x) => x.id !== id) }));
  });

  r.onStateChange(syncSeats);
}

function pose(p: NetPlayer) {
  return { x: p.x, y: p.y, z: p.z, ry: p.ry, action: p.action as PlayerAction };
}

/** 서버 자리 상태('' = 빈자리)를 store.seats로. 바뀌었을 때만 set해서 리렌더를 줄인다 */
function syncSeats() {
  const seats = room?.state?.seats as ArrayLike<string> | undefined;
  if (!seats) return;
  const next = Array.from(seats, (who) => (who === '' ? null : who));
  // 패치에 내 예약이 보이면 확정
  if (pendingSeat !== null && next[pendingSeat] === ME) pendingSeat = null;
  if (pendingSeat !== null) {
    for (let i = 0; i < next.length; i++) if (next[i] === ME) next[i] = null;
    if (next[pendingSeat] === null) next[pendingSeat] = ME;
  }
  const cur = useGame.getState().seats;
  if (next.length === cur.length && next.every((v, i) => v === cur[i])) return;
  useGame.setState({ seats: next });
}

/**
 * 접속 중의 자리 예약. 로컬에서 비어 보이면 바로 true를 돌려주고(걷기 시작) 서버에 요청한다.
 * 서버가 거절하면 seats에서 내 예약이 사라지고, bathAutopilot.recheckSeat가 다른 자리로 바꾼다.
 * 디버그 가짜 입욕객(B 키)은 서버에 없는 사람이라 접속 중에는 예약하지 않는다.
 */
function netClaimSeat(seat: number, who: string): boolean {
  if (who !== ME || !room) return false;
  const owner = useGame.getState().seats[seat];
  if (owner !== null && owner !== ME) return false;
  pendingSeat = seat;
  syncSeats();
  room
    .request<{ seat: number }, SeatClaimResult>(MSG.seatClaim, { seat })
    .catch((): SeatClaimResult => ({ ok: false }))
    .then((res) => {
      // 그 사이 다른 자리를 다시 요청했거나 이미 패치로 확정됐으면 할 일 없음
      if (pendingSeat !== seat) return;
      // 승인이면 패치가 올 때까지 그대로 둔다(syncSeats가 확인하면 지운다). 거절이면 놓는다
      if (!res.ok) pendingSeat = null;
      syncSeats();
    });
  return true;
}

function netReleaseSeat(who: string) {
  if (who !== ME || !room) return;
  pendingSeat = null;
  room.send(MSG.seatRelease);
  useGame.setState((s) => ({ seats: s.seats.map((x) => (x === ME ? null : x)) }));
}

/** SYNC.sendIntervalMs마다. 위치, 방향, 동작이 바뀌었을 때만 보낸다 */
function sendMove() {
  if (!room) return;
  const f = playerFrame;
  const changed =
    Math.abs(f.x - lastSent.x) > 0.01 ||
    Math.abs(f.y - lastSent.y) > 0.01 ||
    Math.abs(f.z - lastSent.z) > 0.01 ||
    Math.abs(f.ry - lastSent.ry) > 0.01 ||
    f.action !== lastSent.action;
  if (!changed) return;
  const msg: MoveMessage = { p: [f.x, f.y, f.z], ry: f.ry, action: f.action };
  room.send(MSG.move, msg);
  Object.assign(lastSent, { x: f.x, y: f.y, z: f.z, ry: f.ry, action: f.action });
}

/** 연결이 끊기면 혼자 모드로 돌아간다(재접속은 5단계) */
function goOffline(reason: string) {
  console.warn(`[net] ${reason}. 혼자 모드로 바뀝니다`);
  window.clearInterval(sendTimer);
  room = null;
  pendingSeat = null;
  for (const { id } of useGame.getState().remotes) otherPlayers.delete(id);
  clearRemotes();
  const mySeat = useGame.getState().seats.findIndex((s) => s === ME);
  setMe('me');
  // 혼자 모드의 자리 함수로 되돌린다(store.ts의 기본 구현)
  const local = useGame.getInitialState();
  useGame.setState({
    netStatus: 'offline',
    me: null,
    remotes: [],
    claimSeat: local.claimSeat,
    releaseSeat: local.releaseSeat,
    seats: local.seats.map((_, i) => (i === mySeat ? 'me' : null)),
  });
}
