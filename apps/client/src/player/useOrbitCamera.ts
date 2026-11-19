import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export interface OrbitState {
  /** 캐릭터를 기준으로 카메라가 도는 각도. 0이면 카메라가 +z 쪽에서 -z를 본다 */
  yaw: number;
  /** 내려다보는 각도 */
  pitch: number;
  distance: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 마우스 드래그로 회전, 휠로 거리 조절. 값은 ref에만 두고 리렌더하지 않는다 */
export function useOrbitCamera() {
  const el = useThree((s) => s.gl.domElement);
  const orbit = useRef<OrbitState>({ yaw: 0, pitch: 0.32, distance: 7 });

  useEffect(() => {
    let dragging = false;

    const down = (e: PointerEvent) => {
      dragging = true;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const o = orbit.current;
      o.yaw -= e.movementX * 0.005;
      o.pitch = clamp(o.pitch + e.movementY * 0.004, 0.05, 1.2);
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const o = orbit.current;
      o.distance = clamp(o.distance + e.deltaY * 0.008, 3, 14);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [el]);

  return orbit;
}
