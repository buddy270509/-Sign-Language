/**
 * Head + neck: an ellipse with hair, an ear and the face layer inside.
 *
 * The head is rotated as a group (roll) and the face features are offset from the head
 * centre by pitch/yaw, which is how a 2D figure shows head movement without a 3D model.
 */
import type { FaceGeometry, RenderHead } from '../../types/animation';
import { Face } from './Face';
import type { AvatarStyle } from './types';

export interface HeadProps {
  head: RenderHead;
  geometry: FaceGeometry;
  style?: AvatarStyle;
  neckTopY: number;
}

export function Head({ head, geometry, style = 'human', neckTopY }: HeadProps) {
  const stick = style === 'stick';
  const origin = { cx: head.cx + head.faceDx, cy: head.cy + head.faceDy };
  const neckHalf = 15;

  return (
    <g transform={`rotate(${head.roll} ${head.cx} ${head.cy})`}>
      {/* neck */}
      <path
        d={`M ${head.cx - neckHalf} ${head.cy + head.ry - 16} L ${head.cx - neckHalf} ${neckTopY + 8} Q ${head.cx} ${neckTopY + 14} ${head.cx + neckHalf} ${neckTopY + 8} L ${head.cx + neckHalf} ${head.cy + head.ry - 16} Z`}
        fill={stick ? 'none' : 'var(--sb-skin-shade)'}
        stroke={stick ? 'var(--sb-ink)' : 'none'}
        strokeWidth={stick ? 2 : 0}
      />
      {/* ears */}
      {!stick ? (
        <>
          <ellipse cx={head.cx - head.rx + 2} cy={head.cy + 6} rx={4.5} ry={7.5} fill="var(--sb-skin-shade)" />
          <ellipse cx={head.cx + head.rx - 2} cy={head.cy + 6} rx={4.5} ry={7.5} fill="var(--sb-skin-shade)" />
        </>
      ) : null}
      {/* skull */}
      <ellipse
        cx={head.cx}
        cy={head.cy}
        rx={head.rx}
        ry={head.ry * head.squash}
        fill={stick ? 'var(--sb-surface)' : 'var(--sb-skin)'}
        stroke={stick ? 'var(--sb-ink)' : 'var(--sb-skin-deep)'}
        strokeWidth={stick ? 2.2 : 1}
      />
      {/* hair */}
      {!stick ? (
        <path
          d={`M ${head.cx - head.rx} ${head.cy - 6} Q ${head.cx - head.rx + 4} ${head.cy - head.ry - 6} ${head.cx} ${head.cy - head.ry - 4} Q ${head.cx + head.rx - 4} ${head.cy - head.ry - 6} ${head.cx + head.rx} ${head.cy - 6} Q ${head.cx + head.rx - 8} ${head.cy - head.ry * 0.55} ${head.cx} ${head.cy - head.ry * 0.62} Q ${head.cx - head.rx + 8} ${head.cy - head.ry * 0.55} ${head.cx - head.rx} ${head.cy - 6} Z`}
          fill="var(--sb-hair)"
        />
      ) : null}
      <Face geometry={geometry} origin={origin} style={style} />
    </g>
  );
}
