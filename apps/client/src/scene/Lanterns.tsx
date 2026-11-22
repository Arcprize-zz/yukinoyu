import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { LAMP_POSITIONS, THIN_PROP_GROUPS, terrainHeight } from '../world/layout';

/** 오타루 운하 거리 같은 가스등. 밤 분위기의 주황 포인트 조명 */
export function Lanterns() {
  return (
    <group>
      {LAMP_POSITIONS.map(([x, z], i) => (
        <GasLamp key={i} position={[x, terrainHeight(x, z), z]} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {LAMP_POSITIONS.map(([x, z], i) => (
          <CylinderCollider
            key={i}
            args={[1.4, 0.15]}
            position={[x, terrainHeight(x, z) + 1.4, z]}
            collisionGroups={THIN_PROP_GROUPS}
          />
        ))}
      </RigidBody>
    </group>
  );
}

function GasLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 2.6, 8]} />
        <meshStandardMaterial color="#26262b" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* 유리 등: 밝기를 1 이상으로 줘서 블룸이 걸리게 한다.
          너무 밝으면 톤매핑에서 하얗게 타므로 주황빛이 남는 정도로 */}
      <mesh position={[0, 2.85, 0]}>
        <boxGeometry args={[0.32, 0.42, 0.32]} />
        <meshStandardMaterial
          color="#ffb870"
          emissive="#ff9a45"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 3.18, 0]} castShadow>
        <coneGeometry args={[0.3, 0.26, 4]} />
        <meshStandardMaterial color="#26262b" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* 등 위에 쌓인 눈 */}
      <mesh position={[0, 3.3, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[0.2, 10, 6]} />
        <meshStandardMaterial color="#f2f6fc" roughness={0.9} />
      </mesh>
      <pointLight position={[0, 2.85, 0]} color="#ffb070" intensity={20} distance={12} decay={2} />
    </group>
  );
}
