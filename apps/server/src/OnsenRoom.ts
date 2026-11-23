import { Room, type Client } from 'colyseus';
import {
  HAT_COLORS,
  MAX_PLAYERS,
  MSG,
  ONSEN_SEATS,
  SCARF_COLORS,
  SYNC,
  WORLD,
  sanitizeMove,
  seatsNear,
  type SeatClaimMessage,
  type SeatClaimResult,
} from '@yukinoyu/shared';
import { randomNickname } from './nickname';
import { OnsenState, PlayerState } from './state';

const EMPTY = '';

/**
 * 온천 마을 방 하나. 모두 같은 방에 들어온다(joinOrCreate).
 * 위치는 클라이언트가 보낸 값을 검사만 하고 받아 주고, 온천 자리 예약은 서버가 판정한다.
 */
export class OnsenRoom extends Room<{ state: OnsenState }> {
  maxClients = MAX_PLAYERS;
  state = new OnsenState();

  /** 클라이언트별 move 메시지 수(1초 창) */
  private moveBudget = new Map<string, { windowStart: number; count: number }>();

  onCreate() {
    this.setPatchRate(SYNC.patchRateMs);
    for (let i = 0; i < ONSEN_SEATS.length; i++) this.state.seats.push(EMPTY);

    this.onMessage(MSG.move, (client, raw: unknown) => {
      if (!this.allowMove(client.sessionId)) return;
      const move = sanitizeMove(raw);
      const player = this.state.players.get(client.sessionId);
      if (!move || !player) return;
      [player.x, player.y, player.z] = move.p;
      player.ry = move.ry;
      player.action = move.action;
    });

    this.onMessage(MSG.seatClaim, (client, msg: SeatClaimMessage): SeatClaimResult => {
      const ok = this.claimSeat(client.sessionId, msg?.seat);
      return { ok };
    });

    this.onMessage(MSG.seatRelease, (client) => {
      this.releaseSeat(client.sessionId);
    });
  }

  onJoin(client: Client) {
    const taken = new Set<string>();
    for (const p of this.state.players.values()) taken.add(p.nick);
    const [x, y, z] = WORLD.spawn;
    const player = new PlayerState();
    player.nick = randomNickname(taken);
    player.hat = this.leastUsed(HAT_COLORS, (p) => p.hat);
    player.scarf = this.leastUsed(SCARF_COLORS, (p) => p.scarf);
    // 캡슐 중심 스폰 높이에서 발 높이로(정확한 값은 첫 move가 덮어쓴다)
    player.x = x;
    player.y = y - 0.8;
    player.z = z;
    player.ry = Math.PI;
    player.action = 'idle';
    this.state.players.set(client.sessionId, player);
    console.log(`[join] ${client.sessionId} "${player.nick}" (${this.clients.length}명)`);
  }

  onLeave(client: Client) {
    const nick = this.state.players.get(client.sessionId)?.nick;
    this.releaseSeat(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.moveBudget.delete(client.sessionId);
    console.log(`[leave] ${client.sessionId} "${nick}" (${this.clients.length}명)`);
  }

  /**
   * 자리 예약. 자리 번호가 올바르고, 남이 예약하지 않았고, 남이 그 자리에 서 있지 않을 때만 준다.
   * 이미 다른 자리를 예약했으면 그 자리는 놓는다(한 사람이 한 자리).
   */
  private claimSeat(sessionId: string, seat: unknown): boolean {
    if (typeof seat !== 'number' || !Number.isInteger(seat) || !ONSEN_SEATS[seat]) return false;
    const owner = this.state.seats[seat];
    if (owner === sessionId) return true;
    if (owner !== EMPTY) return false;

    const others: { x: number; z: number }[] = [];
    this.state.players.forEach((p, id) => {
      if (id !== sessionId) others.push(p);
    });
    if (seatsNear(others).has(seat)) return false;

    this.releaseSeat(sessionId);
    this.state.seats[seat] = sessionId;
    return true;
  }

  private releaseSeat(sessionId: string) {
    this.state.seats.forEach((owner, i) => {
      if (owner === sessionId) this.state.seats[i] = EMPTY;
    });
  }

  /** 1초에 maxMovesPerSecond개까지만 받는다(그 이상은 버림) */
  private allowMove(sessionId: string) {
    const now = Date.now();
    let b = this.moveBudget.get(sessionId);
    if (!b || now - b.windowStart >= 1000) {
      b = { windowStart: now, count: 0 };
      this.moveBudget.set(sessionId, b);
    }
    return ++b.count <= SYNC.maxMovesPerSecond;
  }

  /** 지금 방에서 가장 적게 쓰인 색(같으면 무작위) */
  private leastUsed(colors: readonly string[], get: (p: PlayerState) => string) {
    const count = new Map(colors.map((c) => [c, 0]));
    this.state.players.forEach((p) => {
      const c = get(p);
      if (count.has(c)) count.set(c, count.get(c)! + 1);
    });
    const min = Math.min(...count.values());
    const candidates = colors.filter((c) => count.get(c) === min);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}
