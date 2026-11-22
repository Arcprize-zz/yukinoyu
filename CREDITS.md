# 크레딧

유키노유에 쓴 외부 에셋과 그 라이선스. 새 에셋을 추가하면 여기에 함께 적는다.

## 3D 모델

| 에셋 | 만든 사람 | 라이선스 | 쓴 파일 | 쓰는 곳 |
|---|---|---|---|---|
| [Holiday Kit 2.0](https://kenney.nl/assets/holiday-kit) | [Kenney](https://www.kenney.nl) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `snow-pile`, `rocks-large`, `rocks-medium`, `rocks-small`, `snowman`, `sled`, `bench`, `Textures/colormap.png` | `public/models/kenney/` → `scene/Props.tsx` |
| [Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html) (Standard) | [Quaternius](https://quaternius.com) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | `Pine_1`, `Pine_2`, `Pine_5`, `Leaf_Pine_C.png` | `public/models/quaternius/` → `scene/Trees.tsx` |

### 원본에서 바꾼 것

- Quaternius 소나무: 껍질 텍스처와 노멀맵(약 8MB)을 빼고 단색 재질로 바꿨다. 잎 텍스처만 쓴다.
  위를 향한 면에 눈이 쌓이는 셰이더(`lib/snowCover.ts`)를 덧씌웠다.

CC0는 출처 표기 의무가 없지만, 만든 사람에게 감사하는 뜻으로 남긴다.
