import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { WORLD } from '@yukinoyu/shared';
import { keyMap } from './controls';
import { DEBUG, DEBUG_PHYSICS } from './store';
import { World } from './scene/World';
import { Trees } from './scene/Trees';
import { Lanterns } from './scene/Lanterns';
import { Props } from './scene/Props';
import { Snowfall } from './scene/Snowfall';
import { Effects } from './scene/Effects';
import { Station } from './zones/Station';
import { OnsenStreet } from './zones/OnsenStreet';
import { Ryokan } from './zones/Ryokan';
import { BirchHill } from './zones/BirchHill';
import { Player } from './player/Player';
import { OtherBathers } from './player/OtherBathers';
import { Hud } from './ui/Hud';

const [sx, sy, sz] = WORLD.spawn;

export function App() {
  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 55, near: 0.1, far: 600, position: [sx, sy + 3, sz + 8] }}
      >
        <Suspense fallback={null}>
          {/* ?debug=physics 이면 충돌체 외곽선을 그린다.
              timeStep="vary": 화면 프레임마다 물리를 한 번씩 돌린다. 고정 1/60이면 144Hz 모니터에서
              물리가 안 돈 프레임의 이동량이 덮어써져 캐릭터가 느려진다 */}
          <Physics gravity={[0, -9.81, 0]} timeStep="vary" debug={DEBUG_PHYSICS}>
            <World />
            <Station />
            <OnsenStreet />
            <Ryokan />
            <BirchHill />
            <Trees />
            <Lanterns />
            <Props />
            <Player />
          </Physics>
          <OtherBathers />
          <Snowfall />
          <Effects />
        </Suspense>
        {DEBUG && <Stats />}
      </Canvas>
      <Hud />
    </KeyboardControls>
  );
}
