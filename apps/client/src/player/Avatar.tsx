import { forwardRef } from 'react';
import type * as THREE from 'three';

interface AvatarProps {
  coat?: string;
  hat?: string;
  scarf?: string;
  /** 온천에 들어가 있으면 코트, 목도리, 털모자를 벗고 머리에 수건을 얹는다 */
  bathing?: boolean;
}

const SKIN = '#f5d9c4';
const TOWEL = '#f4f1ea';

/**
 * 머리가 큰 동글동글한 캐릭터. 발이 y=0, 얼굴이 +z를 본다.
 * 모든 방문객이 같은 모양이고 모자, 목도리 색만 다르다.
 */
export const Avatar = forwardRef<THREE.Group, AvatarProps>(function Avatar(
  { coat = '#c8553d', hat = '#f2e8cf', scarf = '#3d5a80', bathing = false },
  ref,
) {
  return (
    <group ref={ref}>
      {/* 몸(패딩 코트, 입욕 중에는 맨몸) */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.35, 6, 14]} />
        <meshStandardMaterial color={bathing ? SKIN : coat} roughness={bathing ? 0.7 : 0.85} />
      </mesh>
      {/* 발 */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0.08, 0.05]} scale={[1, 0.7, 1.3]} castShadow>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshStandardMaterial color={bathing ? SKIN : '#4a3b35'} roughness={0.9} />
        </mesh>
      ))}
      {/* 목도리 */}
      {!bathing && (
        <mesh position={[0, 0.93, 0]} rotation-x={Math.PI / 2} castShadow>
          <torusGeometry args={[0.25, 0.08, 8, 20]} />
          <meshStandardMaterial color={scarf} roughness={0.9} />
        </mesh>
      )}
      {/* 머리 */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <sphereGeometry args={[0.32, 20, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={`eye${x}`} position={[x, 1.24, 0.29]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color="#2a2320" />
        </mesh>
      ))}
      {/* 볼: 온천에서는 더 발그레하게 */}
      {[-0.19, 0.19].map((x) => (
        <mesh key={`cheek${x}`} position={[x, 1.14, 0.24]} scale={bathing ? [1.3, 0.7, 0.5] : [1, 0.6, 0.5]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={bathing ? '#f08a86' : '#f2a3a0'} roughness={0.8} />
        </mesh>
      ))}
      {bathing ? (
        // 머리 위에 접어 올린 수건
        <mesh position={[0.02, 1.53, -0.02]} rotation={[0.08, 0.3, -0.06]} castShadow>
          <boxGeometry args={[0.34, 0.07, 0.24]} />
          <meshStandardMaterial color={TOWEL} roughness={1} />
        </mesh>
      ) : (
        <>
          {/* 털모자 + 방울 */}
          <mesh position={[0, 1.28, 0]} scale={[1.04, 0.95, 1.04]} castShadow>
            <sphereGeometry args={[0.33, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={hat} roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.6, 0]} castShadow>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color={hat} roughness={1} />
          </mesh>
        </>
      )}
    </group>
  );
});
