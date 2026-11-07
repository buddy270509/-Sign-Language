/**
 * One hand, drawn from the rig's render model.
 *
 * The drawing reads only `RenderHand` geometry (landmarks, bones, palm outline) — it has no
 * knowledge of handshapes or joints, which is what keeps the rig swappable.
 */
import type { RenderHand } from '../../types/animation';
import type { AvatarStyle } from './types';

export interface HandProps {
  hand: RenderHand;
  style?: AvatarStyle;
  /** The hand furthest from the camera is drawn a shade darker and slightly smaller. */
  tone?: 'near' | 'far';
  showLandmarks?: boolean;
}

export function Hand({ hand, style = 'human', tone = 'near', showLandmarks = false }: HandProps) {
  const skin = tone === 'near' ? 'var(--sb-skin)' : 'var(--sb-skin-shade)';
  const edge = tone === 'near' ? 'var(--sb-skin-deep)' : 'var(--sb-skin-deep)';
  const stickColor = tone === 'near' ? 'var(--sb-ink)' : 'var(--sb-ink-soft)';

  if (style === 'stick') {
    return (
      <g>
        {hand.bones.map((bone) => {
          const a = hand.landmarks[bone.a];
          const b = hand.landmarks[bone.b];
          if (!a || !b) return null;
          return (
            <line
              key={`${bone.a}-${bone.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={stickColor}
              strokeWidth={Math.max(2, bone.width * 0.5)}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={hand.wrist.x} cy={hand.wrist.y} r={4.5} fill="var(--sb-brand)" />
        {showLandmarks ? <Landmarks hand={hand} /> : null}
      </g>
    );
  }

  return (
    <g>
      {/* Shadow under the hand keeps it readable against the shirt. */}
      <path d={hand.palmPath} fill={edge} opacity={0.18} transform="translate(1.6 2.2)" />
      <path d={hand.palmPath} fill={skin} stroke={edge} strokeWidth={0.9} strokeLinejoin="round" />
      {hand.bones.map((bone) => {
        const a = hand.landmarks[bone.a];
        const b = hand.landmarks[bone.b];
        if (!a || !b) return null;
        return (
          <line
            key={`${bone.a}-${bone.b}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={skin}
            strokeWidth={bone.width * 0.92}
            strokeLinecap="round"
          />
        );
      })}
      {/* Knuckle hints: small darker dots give the hand volume without clutter. */}
      {hand.knuckles.map((knuckle, index) => (
        <circle key={index} cx={knuckle.x} cy={knuckle.y} r={knuckle.r * 0.32} fill={edge} opacity={0.35} />
      ))}
      {showLandmarks ? <Landmarks hand={hand} /> : null}
    </g>
  );
}

function Landmarks({ hand }: { hand: RenderHand }) {
  return (
    <g>
      {hand.landmarks.map((point, index) => (
        <g key={index}>
          <circle cx={point.x} cy={point.y} r={1.7} fill="var(--sb-brand)" opacity={0.9} />
          <text x={point.x + 2.6} y={point.y - 2} fontSize={4} fill="var(--sb-ink-soft)">
            {index}
          </text>
        </g>
      ))}
    </g>
  );
}
