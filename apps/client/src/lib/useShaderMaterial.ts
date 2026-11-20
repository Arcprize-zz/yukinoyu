import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * 커스텀 셰이더 머티리얼을 한 번만 만들고, 언마운트 때 정리한다.
 *
 * `<shaderMaterial uniforms={u} />`로 넘기면 머티리얼이 uniforms를 복사해서 갖기 때문에
 * 내가 만든 `u`를 useFrame에서 바꿔도 GPU에 전달되지 않는다(시간이 멈춘 셰이더).
 * 그래서 매 프레임 값은 반드시 이 훅이 돌려준 `material.uniforms`를 고친다.
 */
export function useShaderMaterial(params: THREE.ShaderMaterialParameters) {
  // 파라미터는 처음 한 번만 쓴다(셰이더 문자열, 초깃값)
  const material = useMemo(() => new THREE.ShaderMaterial(params), []);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
