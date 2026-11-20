import * as THREE from 'three';

/**
 * 카메라에 가까울수록 디더링으로 사라지는 표준 머티리얼.
 * 탕 테두리 바위처럼 캐릭터와 카메라 사이에 자주 끼는 소품에 쓴다.
 * 반투명(정렬 문제)이 아니라 픽셀을 버리는 방식이라 그림자, 깊이가 그대로 맞는다.
 *
 * @param near 이 거리(m)보다 가까우면 완전히 사라진다
 * @param far 이 거리(m)부터는 완전히 보인다
 */
export function createNearFadeMaterial(params: THREE.MeshStandardMaterialParameters, near = 1.6, far = 3.2) {
  const material = new THREE.MeshStandardMaterial(params);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvFadeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWorld;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        {
          float fade = smoothstep(${near.toFixed(2)}, ${far.toFixed(2)}, distance(vFadeWorld, cameraPosition));
          // interleaved gradient noise: 화면 픽셀마다 다른 문턱값으로 듬성듬성 버린다
          float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (fade < dither) discard;
        }`,
      );
  };
  // 그림자 맵은 기본 깊이 머티리얼로 그려서, 바위가 사라져도 그림자는 남는다
  return material;
}
