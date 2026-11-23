import { schema, t, type SchemaType } from '@colyseus/schema';

/**
 * 방 상태. Colyseus가 바뀐 필드만 골라 patchRate마다 모든 클라이언트에 보낸다.
 * 필드는 shared의 PlayerSnapshot과 같은 뜻이다(p → x, y, z로 펼침).
 * 클라이언트는 이 클래스를 import하지 않고, 접속할 때 받은 스키마 정의(Reflection)로 읽는다.
 */
export const PlayerState = schema(
  {
    nick: t.string(),
    hat: t.string(),
    scarf: t.string(),
    /** 발 위치 */
    x: t.float32(),
    y: t.float32(),
    z: t.float32(),
    /** 바라보는 방향(y축 회전) */
    ry: t.float32(),
    action: t.string(),
  },
  'PlayerState',
);
export type PlayerState = SchemaType<typeof PlayerState>;

export const OnsenState = schema(
  {
    /** sessionId → 플레이어 */
    players: t.map(PlayerState),
    /** 온천 자리별 예약자 sessionId(빈자리는 '') */
    seats: t.array('string'),
  },
  'OnsenState',
);
export type OnsenState = SchemaType<typeof OnsenState>;
