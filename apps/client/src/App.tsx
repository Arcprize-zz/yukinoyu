import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { keyMap } from './controls';
import { World } from './scene/World';
import { Trees } from './scene/Trees';
import { Lanterns } from './scene/Lanterns';
import { Snowfall } from './scene/Snowfall';
import { Effects } from './scene/Effects';
import { Player } from './player/Player';
import { Hud } from './ui/Hud';

export function App() {
  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 55, near: 0.1, far: 600, position: [0, 5, 20] }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <World />
            <Trees />
            <Lanterns />
            <Player />
          </Physics>
          <Snowfall />
          <Effects />
        </Suspense>
      </Canvas>
      <Hud />
    </KeyboardControls>
  );
}
