# 유키노유 雪の湯

## 언어

- **모든 답변은 한국어로 한다.** 코드 주석, 커밋 메시지, 문서도 한국어로 쓴다.
- 코드 식별자(변수, 함수, 파일 이름)는 영어로 쓴다.

## 프로젝트

홋카이도의 겨울 온천 마을을 걸으며 쉬는 3인칭 웹 메타버스. 잔잔한 Lofi BGM, 설경 노천온천이 핵심이다.
개발자 한 명의 이직용 포트폴리오다(프론트엔드 지원, 풀스택도 고려). 2개월 안에 배포 가능한 MVP를 만드는 것이 목표다.

- 대상: PC 웹 브라우저만(모바일 미지원)
- 그래픽: 스타일라이즈드 로우폴리. Blender를 쓰지 않는다. 모델은 코드로 만들거나 CC0 에셋(Quaternius, Kenney, Poly Haven)을 쓴다
- 캐릭터: 모든 방문객이 같은 모양이고 모자, 목도리 색만 다르다
- 멀티플레이: 4단계부터. 회원가입 없음, 무작위 별명, 자유 채팅 대신 이모트
- 음악은 상업적 이용이 가능한 라이선스만 쓴다
- 참고 서비스(sansatemple.com)의 화면, 이름, 기능을 그대로 따라 하지 않는다

## 명령

```bash
npm install
npm run dev         # http://localhost:5173
npm run dev:server  # Colyseus 서버 ws://0.0.0.0:2567 (tsx watch)
npm run typecheck   # 모든 워크스페이스
npm run build
npm run smoke -w @yukinoyu/server [ws://주소:2567]    # 봇 두 개로 접속, 동기화, 자리 예약 확인
npm run walker -w @yukinoyu/server [ws://주소:2567] [초]  # 스폰 앞에서 원을 그리며 걷는 봇(보간 눈으로 확인)
```

서버는 맥북, 클라이언트는 윈도우 PC(같은 와이파이)에서 띄운다. PC에서는 `apps/client/.env.example`을 `.env.local`로 복사해 `VITE_SERVER_URL=ws://<맥북 IP>:2567`을 적는다. 비워 두면 페이지를 연 호스트의 2567 포트로 접속하고, 접속에 실패하면 혼자 모드로 진행한다. 서버 확인: `http://<맥북 IP>:2567/health`

작업을 마치면 `npm run typecheck`를 통과시키고, 화면에 보이는 변경은 브라우저에서 확인한다.

## 구조

npm workspaces 모노레포.

```
apps/client      React 19 + TypeScript + Vite + React Three Fiber + drei + rapier + zustand
  src/world/layout.ts   맵 배치의 단일 기준(구역, 지형 높이, 길, 가스등 위치, 충돌 그룹)
  src/scene      하늘, 지형, 나무, 가스등, 눈, 후처리, 그레이박스 도구(kit.tsx)
  src/zones      간이역, 온천 거리, 료칸 + 노천온천, 자작나무 언덕
  src/player     캐릭터 컨트롤러, 3인칭 카메라, 아바타, 원격 플레이어(RemotePlayers)
  src/net        서버 접속(connection.ts), 원격 위치 보간(remoteFrames.ts)
  src/ui         HUD
packages/shared  클라이언트와 서버가 함께 쓰는 타입, 상수
  src/world.ts   PlayerSnapshot, WORLD
  src/onsen.ts   온천 자리와 빈자리 판정
  src/net.ts     메시지 이름(MSG), 주기(SYNC), 색 팔레트, move 검사(sanitizeMove)
apps/server      Colyseus 0.18 (tsx로 실행). 백엔드와 DB는 맥북에서 돌린다
  src/OnsenRoom.ts  방 하나(onsen): 별명, 색, 위치 받기, 자리 예약 판정
  src/state.ts   방 상태 스키마(schema() 함수, 데코레이터 안 씀)
  scripts/       확인용 봇(smoke, walker)
```

## 규칙

### 좌표와 배치
- 1 = 1m, 스폰에서 처음 바라보는 쪽이 `-z`(북), 오른쪽이 `+x`(동), 땅 높이는 `terrainHeight(x, z)`
- 위치, 크기 같은 배치 값은 `world/layout.ts`에 모은다. 소품을 놓을 때는 `isReserved()`로 길과 구역을 피한다
- 소품 뒤가 비어 있어야 하는 곳은 `CLEAR_RECTS`에 추가한다

### 성능
- 매 프레임 바뀌는 값(위치, 회전)은 ref와 `useFrame`에서만 다룬다. React 상태로 만들지 않는다
- zustand에는 바뀔 때만 리렌더되는 값만 둔다(행동, 구역 등)
- 같은 모양이 여럿이면 `Instances`(InstancedMesh)를 쓴다
- `useFrame` 안에서 `new THREE.Vector3()`를 하지 않는다. 모듈 수준 임시 벡터를 재사용한다

### 물리 (Rapier)
- `<Physics timeStep="vary">`를 유지한다. 고정 스텝이면 고주사율 모니터에서 캐릭터 이동량이 사라진다
- 캐릭터가 오를 계단 한 칸은 0.25m 이하로 한다. 캡슐 반지름(0.35m)에 가까우면 autostep이 동작하지 않는다
- 느리게 걷는 곳(온천 안 1.4m/s)에서는 0.22m 계단도 autostep이 실패한다. 계단은 보이기만 하고, 밟는 건 경사로 충돌체(50° 이하)로 만든다(`Ryokan.tsx`의 `PoolRamp`)
- 나무, 가스등처럼 가는 물체의 충돌체에는 `THIN_PROP_GROUPS`를 준다(카메라 레이가 통과)
- 충돌체에 `collisionGroups={undefined}`를 넘기지 않는다. 그룹이 0이 되어 카메라 레이가 그 벽을 통과한다. 지정할 때만 넘긴다(`kit.tsx`의 `Block` 참고)
- 보이는 모양과 충돌체는 `kit.tsx`의 `Block`처럼 한곳에서 함께 만든다

### 셰이더
- 커스텀 셰이더는 `lib/useShaderMaterial.ts`로 만들고, 매 프레임 값은 반환된 `material.uniforms`를 고친다
- `<shaderMaterial uniforms={u} />`는 쓰지 않는다. 머티리얼이 uniforms를 복사해서 `u`를 바꿔도 GPU에 전달되지 않는다(시간이 멈춘 셰이더)
- `smoothstep(e0, e1, x)`는 `e0 < e1`로 쓴다. 뒤집으려면 `1.0 - smoothstep(...)`(뒤집힌 인자는 GLSL에서 정의되지 않음)
- 캐릭터와 카메라 사이에 자주 끼는 소품은 `lib/nearFadeMaterial.ts`로 카메라 근처에서 디더링해 사라지게 한다

### 에셋
- 외부 모델은 CC0만 쓰고, 넣을 때마다 `CREDITS.md`에 출처와 바꾼 점을 적는다
- 쓰는 파일만 `apps/client/public/models/<제작자>/`에 넣는다(팩 전체를 넣지 않는다). 무거운 텍스처(노멀맵 등)는 빼고 단색 재질로 바꾼다
- 같은 모델 여럿은 `Instances`에 GLTF의 `geometry`, `material`을 넘겨 그린다(`scene/Props.tsx`, `scene/Trees.tsx` 참고)
- 소품 배치는 `layout.ts`의 `PROPS`에 둔다. 다른 소품이 피해야 하면 `nearProp()`을 쓴다
- 눈 쌓인 표현은 `lib/snowCover.ts`(위를 향한 면을 하얗게)를 재질에 덧씌운다

### 후처리
- `EffectComposer`는 렌더러 톤매핑을 끈다. 톤매핑은 `<ToneMapping>`(ACES Filmic) 효과로 한다
- 순서: N8AO → Bloom → ToneMapping → Vignette. 블룸은 톤매핑 전에 둔다
- 발광체(등불)는 밝기를 너무 올리면 톤매핑에서 하얗게 탄다. 주황빛이 남는 정도로(emissiveIntensity 2~2.5)

### 온천 자리
- 자리 좌표와 빈자리 고르기(`ONSEN_SEATS`, `pickSeat`, `seatsNear`)는 `packages/shared/src/onsen.ts`에 둔다. 4단계 서버가 같은 함수로 자리 예약을 판정한다
- 자리 예약은 접속 중에는 서버가 판정하고 zustand `seats`가 서버 상태를 비춘다. 혼자 모드에서는 `seats`가 서버를 흉내 낸다. 클라이언트는 예약 결과를 따르기만 한다
- 자동 입장/퇴장은 `player/bathAutopilot.ts`. Player는 요청을 전하고 방향만 받아 움직인다

### 네트워크 (4단계)
- 메시지 이름, 모양, 주기는 `packages/shared/src/net.ts`에만 둔다. 서버 상태 필드는 `PlayerSnapshot`과 같은 뜻으로 맞춘다
- 위치는 클라이언트가 보내고 서버는 검사만 한다(`sanitizeMove`: 모양, 범위, 초당 개수). 자리 예약은 서버가 판정한다
- 클라이언트는 `SYNC.sendIntervalMs`마다 바뀐 경우에만 보낸다. 서버 `patchRate`와 같게 둔다
- 원격 위치는 `net/remoteFrames.ts`의 스냅샷 버퍼에서 `SYNC.interpDelayMs`만큼 과거를 보간해 그린다. 외삽하지 않는다(멈출 때 지나쳤다 돌아오는 게 더 거슬림). `SYNC.snapDistance` 넘게 움직이면 바로 옮긴다
- 원격 플레이어 목록(들어오고 나감, 별명, 색)만 zustand `remotes`, 매 프레임 위치는 remoteFrames와 ref
- 원격 아바타의 useFrame은 우선순위 `-1`로 둔다. 자식 drei `Html`(별명 라벨)이 먼저 돌면 라벨이 한 프레임 늦게 따라온다
- 서버 접속은 `main.tsx`에서 React 바깥에서 한 번만 한다(StrictMode 이펙트 두 번 실행 피하기)
- 접속 중 자리 예약은 낙관적이다: `claimSeat`가 바로 true를 돌려주고 `room.request`로 확인받는다. 거절되면 `seats`에서 내 이름이 빠지고 `bathAutopilot.recheckSeat`가 다른 자리로 바꾼다
- `room.request`의 답장은 바로 오지만 상태 패치는 `patchRate`마다 묶여서 온다(같은 와이파이에서 답장 약 5ms, 패치 최대 50ms). 승인 답장을 받았다고 서버 상태를 다시 읽으면 내 이름이 아직 없다. 승인된 예약(`pendingSeat`)은 패치에서 확인될 때까지 유지하고, 거절 답장일 때만 지운다(지우면 거절된 줄 알고 자리를 계속 바꾼다)
- 서버의 빈자리는 `''`, 클라이언트 `seats`에서는 `null`
- 맥북 방화벽이 켜져 있으면 node의 들어오는 연결을 허용해야 PC에서 접속된다(시스템 설정 → 네트워크 → 방화벽 → 옵션)

### 입력
- 키는 `event.code`(`KeyW` 등)로 받는다. 한글 입력 상태에서도 동작해야 한다

## 디버그

- `?debug` : 좌표, 카메라 위치, FPS, 숫자키 `1`~`4`로 구역 순간이동, `window.__physics`(Rapier world)
  - `B` : 빈자리에 앉는 가짜 입욕객 추가(혼자 모드에서만. 서버에 없는 사람이라 접속 중에는 예약하지 않음) / `V` : 내가 가는 자리에 예약 없이 서 있는 가짜 입욕객 추가
- `?debug=physics` : 충돌체 외곽선까지

## Git

- 커밋은 사용자가 요청할 때만 한다
- 단계별 작업은 `stepN-주제` 브랜치에서 한다(예: `step3-art`). 주 단위가 아니라 로드맵 단계 단위로 나눈다
- 단계를 마치면 main에 합치고 푸시한다. 커밋 메시지는 `feat: N단계 - 내용` 형식
- 커밋 메시지는 한국어로, `feat:`, `fix:` 같은 접두어를 붙인다

## 로드맵 (단계별)

| 단계 | 목표 |
|---|---|
| 1 ✅ | 모노레포, R3F 세팅, 캐릭터 이동과 카메라, 지형, 4구역 그레이박스, 충돌 |
| 2 ✅ | 노천온천: 수면 셰이더, 김, 입욕 연출 |
| 3 ✅ | 에셋 교체, 조명, 포스트프로세싱 |
| 4 ✅ | Colyseus 서버, 별명, 위치 보간 동기화 |
| 5 | 동작 동기화, 재접속, 오디오(BGM, 환경음) |
| 6 | 소원 등롱(API + DB + 신고/필터) |
| 7 | 성능 측정과 최적화, 배포, README |
| 8 | 여유분: 다듬기, 개발기 블로그 글 |

성능 최적화 전후 수치는 README의 "기록해 둘 성능 수치"에 남긴다(포트폴리오용).
