/**
 * Head + face renderer.
 *
 * Every meaningful facial channel in sign language is driven by the rig:
 *   eyebrows (raise / furrow / asymmetry) · eyelids (openness, squint) · gaze ·
 *   cheeks (raise) · mouth (open, width, smile, rounding, tongue) · nostrils.
 *
 * The head shape, ears and hair are static; the features parallax with head yaw/pitch
 * and the whole head rolls around a neck pivot so nods/shakes/tilts read clearly.
 */
import { useId } from 'react';
import type { FaceControls, HeadControls } from '../../types/sign';
import { BODY } from '../../core/rig/body';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const HEAD_PATH = `
  M -42 -20
  C -44 -48 -27 -61 0 -61
  C 27 -61 44 -48 42 -20
  C 41 8 36 24 26 35
  C 18 44 9 48 0 48
  C -9 48 -18 44 -26 35
  C -36 24 -41 8 -42 -20 Z
`;

/** Hair dome with a soft fringe sweeping right-to-left across the forehead. */
const HAIR_PATH = `
  M -43 -7
  C -46 -53 -24 -67 0 -67
  C 24 -67 46 -53 43 -7
  C 41 -23 36 -34 26 -39
  C 16 -43 4 -43 -6 -40
  C -18 -36 -32 -30 -43 -7 Z
`;

/** Face layout follows standard proportions: eyes at ~48% of head height. */
const EYE_Y = -8;
const EYE_DX = 17.4;

function eyePath(rx: number, ry: number): string {
  const ryU = Math.max(0.6, ry);
  const ryL = Math.max(0.5, ry * 0.9);
  return `M ${-rx} 0 C ${-rx * 0.55} ${-ryU * 1.25} ${rx * 0.55} ${-ryU * 1.25} ${rx} 0 C ${rx * 0.55} ${ryL} ${-rx * 0.55} ${ryL} ${-rx} 0 Z`;
}

function Eye({ side, face, uid }: { side: -1 | 1; face: FaceControls; uid: string }) {
  const e = clamp(face.eyeOpen, 0, 1);
  const squint = clamp(face.eyeSquint, 0, 1);
  const rx = 8.4;
  const ry = 1.1 + 6.2 * e * (1 - 0.4 * squint);
  const cx = side * EYE_DX;
  const clipId = `${uid}-eye-${side === -1 ? 'l' : 'r'}`;
  const closed = e < 0.08;
  const gazeX = clamp(face.gaze.x, -1, 1) * (e > 0.2 ? 2.6 : 0);
  const gazeY = clamp(face.gaze.y, -1, 1) * 1.7;

  return (
    <g transform={`translate(${cx} ${EYE_Y})`}>
      <defs>
        <clipPath id={clipId}>
          <path d={eyePath(rx, ry)} />
        </clipPath>
      </defs>
      {closed ? (
        <path
          d={`M ${-rx} 0 Q 0 3.6 ${rx} 0`}
          fill="none"
          stroke="var(--sb-skin-deep)"
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      ) : (
        <>
          <path d={eyePath(rx, ry)} fill="#f7f4f1" />
          <g clipPath={`url(#${clipId})`}>
            <circle cx={gazeX} cy={gazeY} r={4.3} fill="#5b4232" />
            <circle cx={gazeX} cy={gazeY} r={2.05} fill="#16100c" />
            <circle cx={gazeX - 1.35} cy={gazeY - 1.3} r={1.15} fill="#ffffff" opacity={0.92} />
          </g>
          {/* upper lid: gives the eye its expression, and thickens when squinting */}
          <path
            d={`M ${-rx - 0.4} 0 C ${-rx * 0.55} ${-ry * 1.3} ${rx * 0.55} ${-ry * 1.3} ${rx + 0.4} 0`}
            fill="none"
            stroke="var(--sb-skin-deep)"
            strokeWidth={1.1 + squint * 1.5}
            strokeLinecap="round"
            opacity={0.85}
          />
          {/* cheek-raised lower lid (the "smiling eyes" cue) */}
          <path
            d={`M ${-rx * 0.9} ${ry * 0.55} Q 0 ${ry * 0.55 + 1.6 + face.cheekRaise * 2.4} ${rx * 0.9} ${ry * 0.55}`}
            fill="none"
            stroke="var(--sb-skin-shade)"
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.5 + face.cheekRaise * 0.35}
          />
        </>
      )}
    </g>
  );
}

function Brow({ side, face }: { side: -1 | 1; face: FaceControls }) {
  const raise = clamp(face.browRaise, -1, 1);
  const furrow = clamp(face.browFurrow, 0, 1);
  const asym = clamp(face.browAsymmetry, -1, 1) * (side === -1 ? 1 : -1);
  const outerX = side * 30;
  const innerX = side * 8;
  const baseY = -24.5 - raise * 6.6 - asym * 3.2;
  const innerY = baseY + furrow * 6;
  const outerY = baseY + 1.2 + furrow * 1.1;
  const midX = side * 19.5;
  const midY = Math.min(innerY, outerY) - 3.2 - raise * 1.2;
  const thickness = 5.1 - furrow * 0.7;

  return (
    <g>
      <path
        d={`M ${innerX} ${innerY} Q ${midX} ${midY} ${outerX} ${outerY}`}
        fill="none"
        stroke="var(--sb-hair)"
        strokeWidth={thickness}
        strokeLinecap="round"
      />
      {/* frown crease between the brows: a strong grammatical marker in signed languages */}
      {furrow > 0.25 && (
        <path
          d={`M ${side * 3.8} -16 q ${side * 1.8} 4.5 ${side * 0.2} 9`}
          fill="none"
          stroke="var(--sb-skin-shade)"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={Math.min(0.7, (furrow - 0.2) * 1.4)}
        />
      )}
    </g>
  );
}

function Mouth({ face }: { face: FaceControls }) {
  const smile = clamp(face.mouthSmile, -1, 1);
  const round = clamp(face.mouthRound, 0, 1);
  const width = 11 + clamp(face.mouthWidth, 0, 1) * 12.5;
  const w = width * (1 - 0.42 * round);
  const open = clamp(face.mouthOpen, 0, 1) * 15 * (1 + 0.55 * round);
  const cornerY = -4.3 * smile;
  const upper = 1.7 + open * 0.62 + round * 2.6;
  const lower = 2.5 + open * 0.62 + Math.max(0, smile) * 1.2 + round * 3.4;

  const path = `M ${-w} ${cornerY} C ${-w * 0.55} ${cornerY - upper} ${w * 0.55} ${cornerY - upper} ${w} ${cornerY} C ${w * 0.55} ${cornerY + lower} ${-w * 0.55} ${cornerY + lower} ${-w} ${cornerY} Z`;

  return (
    <g transform="translate(0 29)">
      <path d={path} fill="var(--sb-mouth-inner)" stroke="var(--sb-lip)" strokeWidth={2.3} strokeLinejoin="round" />
      {open > 0.45 && (
        <path
          d={`M ${-w * 0.62} ${cornerY - upper * 0.5} q ${w * 0.62} ${upper * 0.34} ${w * 1.24} 0`}
          fill="none"
          stroke="#fffaf4"
          strokeWidth={open * 0.32}
          strokeLinecap="round"
          opacity={0.92}
        />
      )}
      {face.tongue > 0.15 && (
        <ellipse cx={0} cy={cornerY + lower * 0.42} rx={w * 0.4} ry={lower * 0.36} fill="#c0706d" opacity={face.tongue} />
      )}
      {Math.abs(smile) > 0.5 && (
        <>
          <path
            d={`M ${-w - 4.5} ${cornerY + 0.5} q -2 5 -0.5 8`}
            fill="none"
            stroke="var(--sb-skin-shade)"
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.45}
          />
          <path
            d={`M ${w + 4.5} ${cornerY + 0.5} q 2 5 0.5 8`}
            fill="none"
            stroke="var(--sb-skin-shade)"
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.45}
          />
        </>
      )}
    </g>
  );
}

function Nose({ face }: { face: FaceControls }) {
  const flare = clamp(face.nostrilFlare, 0, 1);
  return (
    <g>
      <path
        d="M -1.5 -9 C -1.5 0 -4 6 -6.6 10.5 Q 0 14.6 6.6 10.5 C 4 6 1.5 0 1.5 -9 Z"
        fill="var(--sb-skin-shade)"
        opacity={0.42}
      />
      <ellipse cx={-4.6} cy={10.4} rx={1.5 + flare * 0.9} ry={1.0} fill="var(--sb-skin-deep)" opacity={0.55} />
      <ellipse cx={4.6} cy={10.4} rx={1.5 + flare * 0.9} ry={1.0} fill="var(--sb-skin-deep)" opacity={0.55} />
      {/* lower lip / philtrum shading keeps the mouth from floating on a blank face */}
      <path d="M -3.4 15.5 Q 0 13.4 3.4 15.5" fill="none" stroke="var(--sb-skin-shade)" strokeWidth={0.9} opacity={0.35} />
    </g>
  );
}

export interface HeadProps {
  face: FaceControls;
  head: HeadControls;
  /** Mirror the hair part for the left-handed mirrored stage. */
  mirrored?: boolean;
}

export function Head({ face, head }: HeadProps) {
  const uid = useId().replace(/[:]/g, '');
  const yawShift = clamp(head.yaw, -30, 30) * 0.42;
  const pitchShift = clamp(head.pitch, -30, 30) * 0.32;
  const cheek = clamp(face.cheekRaise, 0, 1);
  const earOpacityLeft = head.yaw > 22 ? 0.35 : 1;
  const earOpacityRight = head.yaw < -22 ? 0.35 : 1;

  return (
    <g transform={`translate(${BODY.headCenter.x + head.offset.x} ${BODY.headCenter.y + head.offset.y})`}>
      <g transform={`rotate(${head.roll} 0 40)`}>
        {/* ears (behind the skull) */}
        <g>
          <ellipse cx={-42} cy={2} rx={6.4} ry={10.5} fill="var(--sb-skin-shade)" opacity={earOpacityLeft} />
          <ellipse cx={42} cy={2} rx={6.4} ry={10.5} fill="var(--sb-skin-shade)" opacity={earOpacityRight} />
        </g>

        {/* skull + jaw */}
        <path d={HEAD_PATH} fill="var(--sb-skin)" stroke="var(--sb-skin-shade)" strokeWidth={1.5} />
        {/* soft shading on the side away from the light */}
        <path d={HEAD_PATH} fill="url(#sb-head-shade)" opacity={0.5} />

        {/* hair */}
        <path d={HAIR_PATH} fill="var(--sb-hair)" />
        <path d={HAIR_PATH} fill="url(#sb-hair-sheen)" opacity={0.35} />

        <g transform={`translate(${yawShift} ${pitchShift}) scale(${1 - Math.abs(yawShift) * 0.006} 1)`}>
          {/* cheeks */}
          <ellipse
            cx={-22}
            cy={12 - cheek * 2.4}
            rx={9.5}
            ry={6.6}
            fill="#d97b62"
            opacity={0.14 + cheek * 0.3}
          />
          <ellipse
            cx={22}
            cy={12 - cheek * 2.4}
            rx={9.5}
            ry={6.6}
            fill="#d97b62"
            opacity={0.14 + cheek * 0.3}
          />

          <Brow side={-1} face={face} />
          <Brow side={1} face={face} />
          <Eye side={-1} face={face} uid={uid} />
          <Eye side={1} face={face} uid={uid} />
          <Nose face={face} />
          <Mouth face={face} />
        </g>
      </g>
    </g>
  );
}
