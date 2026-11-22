import type * as THREE from 'three';

/**
 * 위를 향한 면에 눈이 쌓인 것처럼 하얗게 섞는다(MeshStandardMaterial용).
 * 월드 기준 법선의 y로 판단하므로 InstancedMesh로 돌리고 키워도 맞다.
 * 양면 재질(잎 카드)은 뒷면이면 법선을 뒤집어서 아랫면에는 눈이 생기지 않게 한다.
 */
export function addSnowCover<T extends THREE.MeshStandardMaterial>(material: T, amount = 0.75): T {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vSnowUp;')
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `#include <beginnormal_vertex>
        vec3 snowNormal = objectNormal;
        #ifdef USE_INSTANCING
          snowNormal = mat3(instanceMatrix) * snowNormal;
        #endif
        vSnowUp = normalize(mat3(modelMatrix) * snowNormal).y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSnowUp;')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
        #ifdef USE_MAP
          // 잎 카드(알파 테스트)는 멀리서 밉맵이 투명한 곳과 섞여 잎이 가늘어진다.
          // 축소된 단계(mip)만큼 알파를 키워서 멀리서도 숱이 유지되게 한다
          vec2 texel = vMapUv * vec2(textureSize(map, 0));
          vec2 tdx = dFdx(texel);
          vec2 tdy = dFdy(texel);
          float mip = max(0.0, 0.5 * log2(max(dot(tdx, tdx), dot(tdy, tdy))));
          diffuseColor.a *= 1.0 + mip * 0.35;
        #endif
        float snowUp = gl_FrontFacing ? vSnowUp : -vSnowUp;
        float snow = smoothstep(0.15, 0.6, snowUp) * ${amount.toFixed(2)};
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), snow);`,
      );
  };
  // 같은 원본에서 만든 다른 재질과 셰이더 프로그램을 섞어 쓰지 않게
  material.customProgramCacheKey = () => `snow-${amount}`;
  return material;
}
