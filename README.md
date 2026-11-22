# 유키노유 雪の湯

❄️ 겨울 온천 마을을 걸으며 쉬는 3인칭 웹 메타버스.

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
  src/world      맵 배치의 단일 기준: 구역, 지형 높이 함수, 길, 가스등 위치, 충돌 그룹
  src/scene      하늘, 지형(trimesh), 나무(InstancedMesh), 가스등, 눈(GPU 셰이더), 후처리, 그레이박스 도구
  src/zones      간이역, 온천 거리, 료칸 + 노천온천, 자작나무 언덕
  src/player     Rapier 캐릭터 컨트롤러, 3인칭 카메라(벽 충돌), 아바타
  src/ui         HUD, 구역 이름 표시, 디버그 좌표
packages/shared  클라이언트와 서버가 함께 쓰는 타입, 상수
apps/server      (4단계) Colyseus 멀티플레이 서버
```

## 조작

| 키 | 동작 |
|---|---|
| W A S D / 방향키 | 이동 |
| Shift | 달리기 |
| Space | 점프 |
| 마우스 드래그 / 휠 | 시점 회전 / 거리 |
| E / 버튼 | 온천 입구에서 '온천 즐기기', 탕 안에서 '온천에서 나오기' |

## 디버그

- `?debug` : 좌표, FPS, 숫자키 `1`~`4`로 간이역 / 온천 거리 / 노천온천 / 자작나무 언덕 순간이동
  - `B` : 빈자리에 앉는 가짜 입욕객, `V` : 내가 가는 자리에 서 있는 가짜 입욕객(자리 양보 확인용)
- `?debug=physics` : 위에 더해 충돌체 외곽선

## 기록해 둘 성능 수치 (7단계 최적화 전후 비교용)

- 1단계 빌드 JS: 3,542 kB (gzip 1,210 kB). Rapier WASM이 번들에 포함됨 → 코드 분할 대상
- 3단계 빌드 JS: 3,820 kB (gzip 1,330 kB). 후처리(N8AO, 톤매핑) 추가분. 모델 파일(public/models) 1.0 MB
- 3단계 소나무: Quaternius 원본 텍스처 8 MB+ → 껍질 텍스처를 빼서 모델 3종 합계 736 kB
- 3단계 FPS(165Hz 모니터, 개발 서버): 톤매핑 + N8AO + 소나무 교체 후 137~165
