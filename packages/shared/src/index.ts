/**
 * 클라이언트와 서버(5주차 Colyseus)가 함께 쓰는 타입과 상수.
 * 네트워크로 오가는 모양은 여기서만 정의한다.
 */

export type Vec3 = readonly [number, number, number];

/** 월드 크기와 스폰 위치. 1 = 1m, 처음 바라보는 방향이 -z */
export const WORLD = {
  /** 걸어 다닐 수 있는 정사각형 한 변의 절반 */
  halfSize: 60,
  spawn: [0, 2, 12] as Vec3,
} as const;

export type PlayerAction = 'idle' | 'walk' | 'run' | 'jump' | 'sit' | 'bathe';

/** 다른 방문객에게 보낼 내 상태(5주차부터 사용) */
export interface PlayerSnapshot {
  id: string;
  nick: string;
  /** 발 위치 */
  p: Vec3;
  /** 바라보는 방향(라디안, y축 회전) */
  ry: number;
  action: PlayerAction;
}
