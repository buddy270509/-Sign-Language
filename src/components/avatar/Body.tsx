/**
 * Torso, neck and arms.
 *
 * The arms are solved with 2-bone IK from the shoulder to the wrist target, so the
 * elbow always lands somewhere anatomically plausible no matter where a sign puts
 * the hand. Short sleeves are drawn over the upper arm so the shoulder reads correctly.
 */
import type { ArmFrame, TorsoControls } from '../../types/sign';

const SHIRT_PATH =
  'M 106 480 C 108 360 112 280 116 250 C 120 216 126 200 138 190 ' +
  'C 150 181 162 177 180 177 C 198 177 210 181 222 190 ' +
  'C 234 200 240 216 244 250 C 248 280 252 360 254 480 Z';

export function Torso({ torso }: { torso: TorsoControls }) {
  const lean = torso.lean * 5;
  const turn = torso.turn * 6;
  const shoulderLift = torso.shoulderRaise * 4;

  return (
    <g transform={`translate(${lean} 0)`}>
      {/* neck */}
      <path d="M 162 126 L 162 172 Q 162 194 180 196 Q 198 194 198 172 L 198 126 Z" fill="var(--sb-skin-shade)" />
      <ellipse cx={180} cy={142} rx={22} ry={10} fill="#000" opacity={0.12} />

      {/* shirt */}
      <g transform={`translate(0 ${-shoulderLift}) skewX(${-turn * 0.3})`}>
        <path d={SHIRT_PATH} fill="var(--sb-shirt)" stroke="var(--sb-shirt-edge)" strokeWidth={2} />
        {/* soft light from the left so the chest is not a flat slab */}
        <path
          d="M 94 480 C 96 344 100 282 108 252 C 114 226 126 210 142 200 C 132 250 124 350 126 480 Z"
          fill="#ffffff"
          opacity={0.06}
        />
        <path
          d="M 148 480 C 146 340 148 236 162 194 C 168 182 174 179 180 178 L 180 480 Z"
          fill="#000000"
          opacity={0.05}
        />
        {/* collar */}
        <path
          d="M 158 179 Q 180 204 202 179"
          fill="none"
          stroke="var(--sb-shirt-edge)"
          strokeWidth={3.6}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

export function Arm({ arm, side }: { arm: ArmFrame; side: 'left' | 'right' }) {
  const { shoulder, elbow, wrist } = arm;
  const shadeSide = side === 'left' ? 5 : -5;

  return (
    <g>
      {/* sleeve of the t-shirt covers the upper arm */}
      <circle cx={shoulder.x} cy={shoulder.y} r={11.5} fill="var(--sb-shirt)" />
      <line
        x1={shoulder.x}
        y1={shoulder.y}
        x2={elbow.x}
        y2={elbow.y}
        stroke="var(--sb-shirt)"
        strokeWidth={22}
        strokeLinecap="round"
      />
      <line
        x1={shoulder.x}
        y1={shoulder.y}
        x2={elbow.x}
        y2={elbow.y}
        stroke="var(--sb-shirt-edge)"
        strokeWidth={22}
        strokeLinecap="round"
        opacity={0.28}
        transform="translate(0 2.5)"
      />
      <line
        x1={shoulder.x}
        y1={shoulder.y}
        x2={elbow.x}
        y2={elbow.y}
        stroke="var(--sb-shirt)"
        strokeWidth={20.5}
        strokeLinecap="round"
      />

      {/* bare forearm */}
      <circle cx={elbow.x} cy={elbow.y} r={8.5} fill="var(--sb-skin)" />
      <line
        x1={elbow.x}
        y1={elbow.y}
        x2={wrist.x}
        y2={wrist.y}
        stroke="var(--sb-skin)"
        strokeWidth={17}
        strokeLinecap="round"
      />
      <line
        x1={elbow.x}
        y1={elbow.y}
        x2={wrist.x}
        y2={wrist.y}
        stroke="var(--sb-skin-shade)"
        strokeWidth={4.5}
        strokeLinecap="round"
        opacity={0.3}
        transform={`translate(${shadeSide} 0)`}
      />
    </g>
  );
}
