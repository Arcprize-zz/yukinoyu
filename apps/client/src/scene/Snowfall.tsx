import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 7000;
/** 카메라를 중심으로 눈이 내리는 상자 크기 */
const WIDTH = 70;
const HEIGHT = 30;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uPixelRatio;
  uniform float uSize;
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
  const material = useRef<THREE.ShaderMaterial>(null);

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

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uPixelRatio: { value: 1 },
      uSize: { value: 3.5 },
    }),
    [],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uCenter.value.copy(camera.position);
    uniforms.uPixelRatio.value = dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
