import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/**
 * 후처리. 순서가 중요하다:
 *   AO(구석, 접지면을 어둡게) → 블룸(밝은 값 그대로 번짐) → 톤매핑(화면 밝기로 압축) → 비네트.
 * EffectComposer는 렌더러의 톤매핑을 끄기 때문에 ToneMapping 효과가 없으면 톤매핑이 아예 안 된다.
 * ACES Filmic: AgX보다 대비와 채도가 남아서 푸른 밤과 주황 등불의 대비가 산다.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={4}>
      {/* 반 해상도로 계산해서 비용을 줄인다. 색을 하늘색으로 줘서 그늘이 검지 않고 푸르게 */}
      <N8AO halfRes aoRadius={1.6} distanceFalloff={0.6} intensity={2.2} color="#1a2747" />
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  );
}
