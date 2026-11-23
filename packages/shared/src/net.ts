/**
 * 네트워크 약속(4단계). 클라이언트와 서버가 주고받는 메시지 이름, 모양, 주기는 여기서만 정한다.
 */
import { WORLD, type PlayerAction, type PlayerSnapshot } from './world';

export const ROOM_NAME = 'onsen';
export const SERVER_PORT = 2567;
/** 한 방 최대 인원 */
export const MAX_PLAYERS = 30;

export const SYNC = {
  /** 클라이언트가 내 상태를 보내는 주기(ms). 서버 patchRate와 같게 둔다 */
  sendIntervalMs: 50,
  /** 서버가 상태 변경을 묶어 보내는 주기(ms) */
  patchRateMs: 50,
  /** 원격 플레이어를 이만큼 과거 시점으로 그린다(ms). 패치 간격 2~3개 분량 */
  interpDelayMs: 120,
  /** 한 번에 이 거리(m) 이상 움직이면 보간하지 않고 바로 옮긴다(디버그 순간이동, 스폰 복귀) */
  snapDistance: 5,
  /** 클라이언트 한 명이 1초에 보낼 수 있는 move 메시지 수. 넘치면 버린다 */
  maxMovesPerSecond: 40,
} as const;

export const PLAYER_ACTIONS: readonly PlayerAction[] = ['idle', 'walk', 'run', 'jump', 'sit', 'bathe'];

/** 클라이언트 → 서버: 내 상태. PlayerSnapshot에서 서버가 정하는 값(id, nick)을 뺀 것 */
export type MoveMessage = Pick<PlayerSnapshot, 'p' | 'ry' | 'action'>;

/** 클라이언트 → 서버 메시지 이름 */
export const MSG = {
  move: 'move',
  seatClaim: 'seat:claim',
  seatRelease: 'seat:release',
} as const;

export interface SeatClaimMessage {
  seat: number;
}

/** seat:claim 응답. ok가 false면 서버가 거절했다(이미 예약됐거나 누가 서 있음) */
export interface SeatClaimResult {
  ok: boolean;
}

/** 서버가 접속할 때 하나씩 골라 주는 모자, 목도리 색 */
export const HAT_COLORS = ['#f2e8cf', '#9ec1cf', '#f6c6c6', '#c3d7a4', '#e8c07d', '#d8c3e8'] as const;
export const SCARF_COLORS = ['#3d5a80', '#a23e48', '#4f6d3a', '#7a4f8b', '#c06c2b', '#2f6f73'] as const;

/** 받은 move가 올바른 모양인지 확인한다. 위치는 걸을 수 있는 범위로 자른 새 값을 돌려준다 */
export function sanitizeMove(raw: unknown): MoveMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { p, ry, action } = raw as Record<string, unknown>;
  if (!Array.isArray(p) || p.length !== 3 || !p.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return null;
  }
  if (typeof ry !== 'number' || !Number.isFinite(ry)) return null;
  if (typeof action !== 'string' || !PLAYER_ACTIONS.includes(action as PlayerAction)) return null;
  const h = WORLD.halfSize;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    p: [clamp(p[0], -h, h), clamp(p[1], -20, 100), clamp(p[2], -h, h)],
    ry: Math.atan2(Math.sin(ry), Math.cos(ry)),
    action: action as PlayerAction,
  };
}
