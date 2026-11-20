import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ONSEN } from '../world/layout';
import { useShaderMaterial } from '../lib/useShaderMaterial';

const COUNT = 7000;
/** 카메라를 중심으로 눈이 내리는 상자 크기 */
const WIDTH = 70;
const HEIGHT = 30;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec4 uMeltRect;   // 온천 탕 x0, z0, x1, z1
  uniform float uMeltFloor; // 수면 높이
  attribute float aSpeed;
  attribute float aPhase;
  varying float vAlpha;

  const float W = ${WIDTH.toFixed(1)};
  const float H = ${HEIGHT.toFixed(1)};

  void main() {
    vec3 p = position;
    // 떨어지기 + 바람에 흔들리기
    p.y = mod(p.y - uTime * aSpeed, H);
    p.x += sin(uTime * 0.6 + aPhase) * 0.8 + uTime * 0.25;
    p.z += cos(uTime * 0.45 + aPhase * 1.3) * 0.6;
    // 카메라 주변 상자 안으로 감싸기: 입자 수를 늘리지 않고 맵 전체에 눈이 오는 것처럼 보인다
    p.x = mod(p.x - uCenter.x + W * 0.5, W) - W * 0.5 + uCenter.x;
    p.z = mod(p.z - uCenter.z + W * 0.5, W) - W * 0.5 + uCenter.z;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * uPixelRatio * (12.0 / -mv.z), 28.0);
    // 땅에 닿기 직전과 먼 곳은 흐리게
    vAlpha = smoothstep(0.0, 1.5, p.y) * (1.0 - smoothstep(22.0, 40.0, -mv.z));
    // 탕 위로 떨어지는 눈은 김 속에서 녹아 수면에 닿기 전에 사라진다
    float inside = smoothstep(uMeltRect.x - 0.6, uMeltRect.x + 0.4, p.x)
                 * smoothstep(uMeltRect.z + 0.6, uMeltRect.z - 0.4, p.x)
                 * smoothstep(uMeltRect.y - 0.6, uMeltRect.y + 0.4, p.z)
                 * smoothstep(uMeltRect.w + 0.6, uMeltRect.w - 0.4, p.z);
    vAlpha *= 1.0 - inside * (1.0 - smoothstep(uMeltFloor + 0.3, uMeltFloor + 2.8, p.y));
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vAlpha * 0.9;
    if (a < 0.01) discard;
    gl_FragColor = vec4(0.95, 0.97, 1.0, a);
  }
`;

/** GPU에서 움직이는 눈 입자. CPU는 매 프레임 uniform 두 개만 바꾼다 */
export function Snowfall() {
  const camera = useThree((s) => s.camera);
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = Math.random() * WIDTH;
      positions[i * 3 + 1] = Math.random() * HEIGHT;
      positions[i * 3 + 2] = Math.random() * WIDTH;
      speeds[i] = 0.6 + Math.random() * 1.1;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return g;
  }, []);

  const material = useShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uPixelRatio: { value: 1 },
      uSize: { value: 3.5 },
      uMeltRect: { value: new THREE.Vector4(ONSEN.pool.x0, ONSEN.pool.z0, ONSEN.pool.x1, ONSEN.pool.z1) },
      uMeltFloor: { value: ONSEN.pool.water },
    },
    transparent: true,
    depthWrite: false,
  });

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uCenter.value.copy(camera.position);
    u.uPixelRatio.value = dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
