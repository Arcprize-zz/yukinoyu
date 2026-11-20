import type * as THREE from 'three';
import { ONSEN_SEATS, pickSeat, seatsNear } from '@yukinoyu/shared';
import { ONSEN_PATH, type Vec2 } from '../world/layout';
import { ME, otherPlayers, useGame, type BathMode } from '../store';

/** 이 거리 안에 들어오면 다음 경유지로 */
const ARRIVE_DISTANCE = 0.15;
/** 이 시간(초) 동안 경유지에 가까워지지 못하면 막힌 것으로 보고 자동 이동을 멈춘다 */
const STUCK_SECONDS = 2.5;

/**
 * '온천 즐기기' 버튼을 누르면 캐릭터를 자리까지 데려가는 자동 이동.
 * 자리 예약(누가 어느 자리)과 경로(입구 → 경사로 → 자리)만 다루고,
 * 실제 이동과 충돌은 Player의 캐릭터 컨트롤러가 한다.
 */
export class BathAutopilot {
  mode: BathMode = 'free';
  /** 내가 예약한 자리 */
  seat: number | null = null;
  /** 마지막으로 예약했던 자리(자리를 바꿀 때 그 근처에서 찾는다) */
  private lastSeat = 0;
  private path: Vec2[] = [];
  private bestDistance = Infinity;
  private stuckTime = 0;

  /** 남이 예약했거나 남이 서 있는 자리 */
  private blockedSeats() {
    const blocked = seatsNear(otherPlayers.values());
    useGame.getState().seats.forEach((who, id) => {
      if (who !== null && who !== ME) blocked.add(id);
    });
    return blocked;
  }

  /** 빈자리가 몇 개인지(버튼에 표시) */
  freeSeatCount() {
    return ONSEN_SEATS.length - this.blockedSeats().size;
  }

  /** 입장 시작. 빈자리가 없으면 false */
  enter(): boolean {
    if (this.mode !== 'free') return false;
    const seat = pickSeat(this.blockedSeats());
    if (seat === null || !useGame.getState().claimSeat(seat, ME)) return false;
    this.seat = seat;
    const s = ONSEN_SEATS[seat];
    this.setPath([ONSEN_PATH.entrance, ONSEN_PATH.rampTop, ONSEN_PATH.rampBottom, [s.x, s.z]]);
    this.setMode('entering');
    return true;
  }

  /** 퇴장 시작. 탕 안이면 경사로를 거쳐 입구까지(방향키로 탕 안을 걷던 중에도 가능) */
  exit(inPool: boolean) {
    if (this.mode === 'leaving' || (this.mode === 'free' && !inPool)) return;
    this.releaseSeat();
    this.setPath(inPool ? [ONSEN_PATH.rampBottom, ONSEN_PATH.rampTop, ONSEN_PATH.entrance] : [ONSEN_PATH.entrance]);
    this.setMode('leaving');
  }

  /** 방향키를 누르면 자동 이동을 그만두고 조작을 돌려준다 */
  cancel() {
    if (this.mode === 'free') return;
    this.releaseSeat();
    this.path = [];
    this.setMode('free');
  }

  /**
   * 매 프레임 호출. 자동으로 걸어야 하면 방향을 out에 넣고 true.
   * 도착하면 mode가 seated(입장) 또는 free(퇴장)로 바뀐다.
   */
  steer(x: number, z: number, dt: number, out: THREE.Vector3): boolean {
    if (this.mode !== 'entering' && this.mode !== 'leaving') return false;
    if (this.mode === 'entering') this.recheckSeat();

    while (this.path.length > 0 && Math.hypot(this.path[0][0] - x, this.path[0][1] - z) < ARRIVE_DISTANCE) {
      this.path.shift();
      this.bestDistance = Infinity;
      this.stuckTime = 0;
    }
    if (this.path.length === 0) {
      this.setMode(this.mode === 'entering' ? 'seated' : 'free');
      return false;
    }

    const [tx, tz] = this.path[0];
    const d = Math.hypot(tx - x, tz - z);
    if (d < this.bestDistance - 0.02) {
      this.bestDistance = d;
      this.stuckTime = 0;
    } else if ((this.stuckTime += dt) > STUCK_SECONDS) {
      this.cancel();
      return false;
    }
    out.set(tx - x, 0, tz - z).normalize();
    return true;
  }

  /**
   * 걸어가는 도중에 내 자리가 막히면(누가 그 자리에 서 있거나, 서버가 다른 사람에게 줬거나)
   * 남은 빈자리 중 가장 가까운 곳으로 목적지를 바꾼다. 빈자리가 없으면 나온다.
   */
  private recheckSeat() {
    if (this.seat === null) return;
    const blocked = this.blockedSeats();
    if (!blocked.has(this.seat)) return;
    this.releaseSeat();
    // 원래 가려던 자리에서 가장 가까운 빈자리
    const next = pickSeat(blocked, this.lastSeat);
    if (next === null || !useGame.getState().claimSeat(next, ME)) {
      this.setPath([ONSEN_PATH.rampBottom, ONSEN_PATH.rampTop, ONSEN_PATH.entrance]);
      this.setMode('leaving');
      return;
    }
    this.seat = next;
    const s = ONSEN_SEATS[next];
    this.path[this.path.length - 1] = [s.x, s.z];
    this.bestDistance = Infinity;
  }

  private releaseSeat() {
    if (this.seat !== null) this.lastSeat = this.seat;
    this.seat = null;
    useGame.getState().releaseSeat(ME);
  }

  private setPath(path: Vec2[]) {
    this.path = path.map(([px, pz]) => [px, pz]);
    this.bestDistance = Infinity;
    this.stuckTime = 0;
  }

  private setMode(mode: BathMode) {
    this.mode = mode;
    useGame.getState().setBathMode(mode);
  }
}
