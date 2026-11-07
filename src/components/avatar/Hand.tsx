/**
 * Hand renderer — draws the 21-landmark hand produced by the forward-kinematic rig.
 *
 * Ordering matters: bones behind the palm are drawn first (darker), the palm is drawn
 * on top, then bones in front of the palm (fingertips curling toward the camera).
 * That is what makes a fist read as a fist instead of a star of fingers.
 */
import type { HandFrame } from '../../types/sign';

export interface HandProps {
  frame: HandFrame;
  showLandmarks?: boolean;
}

export function Hand({ frame, showLandmarks = false }: HandProps) {
  const behind = frame.bones.filter((b) => b.depth <= 0);
  const front = frame.bones.filter((b) => b.depth > 0);

  const bone = (b: HandFrame['bones'][number], color: string, key: string) => {
    const a = frame.landmarks[b.a];
    const c = frame.landmarks[b.b];
    if (!a || !c) return null;
    return (
      <line
        key={key}
        x1={a.x}
        y1={a.y}
        x2={c.x}
        y2={c.y}
        stroke={color}
        strokeWidth={b.width}
        strokeLinecap="round"
      />
    );
  };

  const knuckles = [5, 9, 13, 17]
    .map((i) => frame.landmarks[i])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <g filter="url(#sb-hand-shadow)">
      {behind.map((b, i) => bone(b, 'var(--sb-skin-shade)', `b${i}`))}

      <path d={frame.palmPath} fill="var(--sb-skin)" stroke="var(--sb-skin-shade)" strokeWidth={1.4} />
      {frame.knuckles.map((k, i) => (
        <circle key={`k${i}`} cx={k.x} cy={k.y} r={k.r} fill="var(--sb-skin)" stroke="var(--sb-skin-shade)" strokeWidth={0.8} />
      ))}
      {knuckles.map((k, i) => (
        <circle key={i} cx={k.x} cy={k.y} r={1.3} fill="var(--sb-skin-deep)" opacity={0.22} />
      ))}

      {front.map((b, i) => bone(b, 'var(--sb-skin)', `f${i}`))}

      {showLandmarks &&
        frame.landmarks.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4.2} fill="none" stroke="var(--sb-brand)" strokeWidth={0.7} opacity={0.35} />
            <circle cx={p.x} cy={p.y} r={1.7} fill="var(--sb-brand)" />
          </g>
        ))}
    </g>
  );
}
