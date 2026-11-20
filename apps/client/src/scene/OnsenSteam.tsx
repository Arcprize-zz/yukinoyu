import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ONSEN } from '../world/layout';
import { useShaderMaterial } from '../lib/useShaderMaterial';

const COUNT = 140;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform vec4 uRect;
  uniform float uWater;
  attribute vec3 aSeed; // 탕 안 위치(0~1, 0~1), 시작 위상
  varying float vAlpha;
  varying float vSeed;

  void main() {
    // 0 → 1로 반복되는 한 덩어리의 일생
    float life = fract(uTime * 0.11 + aSeed.z);
    vec3 p;
    p.x = mix(uRect.x + 0.4, uRect.z - 0.4, aSeed.x);
    p.z = mix(uRect.y + 0.4, uRect.w - 0.4, aSeed.y);
    p.y = uWater + 0.1 + life * 3.4;
    // 위로 갈수록 바람(+x)에 밀리고 흔들린다
    p.x += life * life * 1.8 + sin(uTime * 0.7 + aSeed.z * 20.0) * 0.3 * life;
    p.z += cos(uTime * 0.5 + aSeed.x * 17.0) * 0.35 * life;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // 지름(m)을 화면 픽셀로. 올라가며 퍼진다
    float diameter = mix(0.9, 2.8, life);
    gl_PointSize = min(diameter * uScale / -mv.z, 900.0);
    vAlpha = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.4, 1.0, life));
    vSeed = aSeed.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    // 테두리를 울퉁불퉁하게 해서 동그란 점처럼 보이지 않게 한다
    float a = atan(c.y, c.x);
    float lump = 0.07 * sin(a * 3.0 + vSeed * 40.0 + uTime * 0.6) + 0.04 * sin(a * 5.0 - vSeed * 23.0);
    float m = 1.0 - smoothstep(0.0, 0.5 + lump, d);
    float alpha = m * m * vAlpha * 0.16;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(0.93, 0.94, 0.97, alpha);
  }
`;

/** 수면에서 피어올라 바람에 흘러가는 김(湯気). 위치 계산은 전부 GPU에서 한다 */
export function OnsenSteam() {
  const { pool } = ONSEN;
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const geometry = useMemo(() => {
    const seeds = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const g = new THREE.BufferGeometry();
    // position은 셰이더가 계산하므로 개수만 맞춰 둔다
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    return g;
  }, []);

  const material = useShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uRect: { value: new THREE.Vector4(pool.x0, pool.z0, pool.x1, pool.z1) },
      uWater: { value: pool.water },
    },
    transparent: true,
    depthWrite: false,
  });

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    // 거리 1m에 있는 지름 1m 물체가 몇 픽셀인지: 화면 높이 / (2 · tan(fov/2))
    u.uScale.value = (size.height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
