import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ONSEN } from '../world/layout';
import { playerFrame } from '../store';
import { useShaderMaterial } from '../lib/useShaderMaterial';

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  uniform float uTime;
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // 아주 작은 출렁임. 실제 물결 모양은 프래그먼트의 노멀이 만든다
    world.y += (sin(world.x * 1.7 + uTime * 1.3) + sin(world.z * 2.3 - uTime * 1.1)) * 0.006;
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uLampColor;
  uniform vec3 uLampPos;
  uniform vec4 uRect;    // x0, z0, x1, z1
  uniform vec4 uRipple;  // 파문 중심 x, z, 세기, 0
  varying vec3 vWorld;

  // 방향과 주기가 다른 사인파 4개를 겹친 잔물결
  float waves(vec2 p) {
    float h = sin(dot(p, vec2(0.8, 0.6)) * 3.1 + uTime * 1.4) * 0.5;
    h += sin(dot(p, vec2(-0.5, 0.9)) * 4.7 - uTime * 1.1) * 0.3;
    h += sin(dot(p, vec2(0.95, -0.3)) * 7.3 + uTime * 2.0) * 0.15;
    h += sin(dot(p, vec2(-0.2, -1.0)) * 11.0 - uTime * 2.6) * 0.08;
    return h;
  }

  // 사람이 있는 자리에서 퍼져 나가는 동심원
  float ripple(vec2 p) {
    float d = distance(p, uRipple.xy);
    return sin(d * 14.0 - uTime * 5.0) * exp(-d * 1.6) * uRipple.z;
  }

  float height(vec2 p) {
    return waves(p) * 0.05 + ripple(p) * 0.04;
  }

  void main() {
    vec2 p = vWorld.xz;

    // 높이 함수를 미분해서 노멀을 만든다(노멀맵 텍스처 없이)
    float e = 0.04;
    float hx = height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0));
    float hz = height(p + vec2(0.0, e)) - height(p - vec2(0.0, e));
    vec3 n = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));
    vec3 v = normalize(cameraPosition - vWorld);

    // 비스듬히 볼수록 하늘이 더 비친다(프레넬)
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);

    // 가장자리일수록 얕은 물 색
    float edge = min(min(p.x - uRect.x, uRect.z - p.x), min(p.y - uRect.y, uRect.w - p.y));
    float shallow = 1.0 - smoothstep(0.0, 1.4, edge);
    vec3 color = mix(uDeep, uShallow, 0.25 + shallow * 0.55);
    color = mix(color, uSky, fresnel * 0.75);

    // 정자 등불이 수면에 비치는 반짝임
    vec3 toLamp = uLampPos - vWorld;
    vec3 l = normalize(toLamp);
    float lampSpec = pow(max(dot(n, normalize(l + v)), 0.0), 90.0);
    color += uLampColor * lampSpec * 5.0 / (1.0 + 0.12 * dot(toLamp, toLamp));

    // 달빛 반짝임
    vec3 moon = normalize(vec3(-0.5, 0.65, 0.35));
    color += vec3(0.65, 0.75, 1.0) * pow(max(dot(n, normalize(moon + v)), 0.0), 220.0) * 0.9;

    // 탕 테두리에 닿는 물의 밝은 띠
    color += vec3(0.85, 0.92, 0.95) * (1.0 - smoothstep(0.0, 0.16, edge)) * 0.3;

    gl_FragColor = vec4(color, mix(0.8, 0.95, fresnel));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** 노천온천 수면. 잔물결, 하늘 반사, 등불 반짝임, 입욕한 사람 주변 파문 */
export function OnsenWater() {
  const { pool } = ONSEN;
  const width = pool.x1 - pool.x0;
  const depth = pool.z1 - pool.z0;

  const material = useShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#0f3a44') },
      uShallow: { value: new THREE.Color('#3f9a9a') },
      uSky: { value: new THREE.Color('#7d93c2') },
      uLampColor: { value: new THREE.Color('#ffb070') },
      uLampPos: { value: new THREE.Vector3(...ONSEN.lamp) },
      uRect: { value: new THREE.Vector4(pool.x0, pool.z0, pool.x1, pool.z1) },
      uRipple: { value: new THREE.Vector4() },
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    },
    transparent: true,
    fog: true,
  });

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    const r = u.uRipple.value as THREE.Vector4;
    // 탕 안에서 움직이면 파문이 커지고, 가만히 있으면 잔잔해진다
    const target = playerFrame.bathing ? (playerFrame.moving ? 1 : 0.3) : 0;
    r.z += (target - r.z) * (1 - Math.exp(-3 * delta));
    if (playerFrame.bathing) r.set(playerFrame.x, playerFrame.z, r.z, 0);
  });

  return (
    <mesh position={[(pool.x0 + pool.x1) / 2, pool.water, (pool.z0 + pool.z1) / 2]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[width, depth, 32, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
