import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

/** 가스등이 번지는 블룸 + 가장자리를 살짝 어둡게 */
export function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  );
}
