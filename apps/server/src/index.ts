import { Server, WebSocketTransport } from 'colyseus';
import { ROOM_NAME, SERVER_PORT } from '@yukinoyu/shared';
import { OnsenRoom } from './OnsenRoom';

const port = Number(process.env.PORT ?? SERVER_PORT);
/** 0.0.0.0: 같은 와이파이의 다른 PC에서도 접속할 수 있게 모든 네트워크 인터페이스에서 받는다 */
const host = process.env.HOST ?? '0.0.0.0';

const server = new Server({
  transport: new WebSocketTransport(),
  greet: false,
  express: (app) => {
    // 접속 확인용(브라우저, curl로 열어 본다)
    app.get('/health', (_req: unknown, res: { json(body: unknown): void }) => {
      res.json({ ok: true, room: ROOM_NAME });
    });
  },
});

server.define(ROOM_NAME, OnsenRoom);

await server.listen(port, host);
console.log(`유키노유 서버: ws://${host}:${port} (방 "${ROOM_NAME}")`);
