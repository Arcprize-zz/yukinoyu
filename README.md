# 유키노유 雪の湯

홋카이도의 겨울 온천 마을을 걸으며 쉬는 3인칭 웹 메타버스.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

## 구조

```
apps/client      React + TypeScript + Vite + React Three Fiber
  src/scene      월드(하늘, 땅, 설산), 나무(InstancedMesh), 가스등, 눈(GPU 셰이더), 후처리
  src/player     Rapier 캐릭터 컨트롤러, 3인칭 카메라, 아바타
  src/ui         HUD
packages/shared  클라이언트와 서버가 함께 쓰는 타입, 상수
apps/server      (5주차) Colyseus 멀티플레이 서버
```

## 조작

| 키 | 동작 |
|---|---|
| W A S D / 방향키 | 이동 |
| Shift | 달리기 |
| Space | 점프 |
| 마우스 드래그 / 휠 | 시점 회전 / 거리 |

## 기록해 둘 성능 수치 (8주차 최적화 전후 비교용)

- 1주차 빌드 JS: 3,542 kB (gzip 1,210 kB). Rapier WASM이 번들에 포함됨 → 코드 분할 대상
