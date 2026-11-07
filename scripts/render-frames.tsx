/**
 * Dev tool: render avatar frames to PNG so the rig can be eyeballed (and reviewed by a
 * deaf signer) without a browser.
 *
 *   npm run render:frames      → docs/avatar-review/*.png
 *
 * It renders the same React components the app uses, with the CSS variables inlined
 * because resvg does not resolve custom properties.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';

import { Avatar } from '../src/components/avatar/Avatar';
import { Head } from '../src/components/avatar/Head';
import { Hand } from '../src/components/avatar/Hand';
import { buildRenderPose } from '../src/core/rig/render';
import { neutralPose, clampPose } from '../src/core/rig/pose';
import { idlePose, compileAnimation, poseAtProgress } from '../src/core/animation/compile';
import { BASIC_HANDSHAPES } from '../src/core/rig/handshapes';
import { EXPRESSIONS } from '../src/core/rig/face';
import { FIGURE, STAGE } from '../src/core/rig/anatomy';
import { DEMO_ANIMATIONS } from '../src/data/animations';
import type { RenderPose, RigPose } from '../src/types/animation';

const OUT_DIR = 'docs/avatar-review';

const COLORS: Record<string, string> = {
  '--sb-canvas': '#eef2f8',
  '--sb-surface': '#ffffff',
  '--sb-surface-2': '#f5f8fc',
  '--sb-line': '#d3dde9',
  '--sb-ink': '#0a1220',
  '--sb-ink-soft': '#46566d',
  '--sb-brand': '#0d6f66',
  '--sb-skin': '#cf9c74',
  '--sb-skin-light': '#e0b593',
  '--sb-skin-shade': '#b0825e',
  '--sb-skin-deep': '#96694a',
  '--sb-hair': '#2a211a',
  '--sb-shirt': '#12455c',
  '--sb-shirt-edge': '#0c3345',
  '--sb-lip': '#a9625d',
  '--sb-mouth-inner': '#5a2d2f',
};

const inlineColors = (markup: string) =>
  markup.replace(/var\((--sb-[a-z0-9-]+)\)/g, (_match, key: string) => COLORS[key] ?? '#888888');

function document_(children: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#eef2f8"/>
  ${inlineColors(children)}
</svg>`;
}

function write(name: string, svg: string, width: number) {
  writeFileSync(`${OUT_DIR}/${name}.svg`, svg);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true } }).render();
  writeFileSync(`${OUT_DIR}/${name}.png`, png.asPng());
  console.log(`  ${OUT_DIR}/${name}.png`);
}

function caption(x: number, y: number, text: string, size = 22) {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" fill="#0a1220">${text}</text>`;
}

/**
 * Cell that shows one pose. Full and hands views use the app's own <Avatar> component;
 * the face view draws the head directly, because resvg panics when a small viewBox has to
 * clip away most of the figure.
 */
let clipSeq = 0;
const nextClipId = () => `sbclip${(clipSeq += 1)}`;

function cell(pose: RenderPose, x: number, y: number, w: number, h: number, view: 'full' | 'hands' | 'face', style: 'human' | 'stick' = 'human') {
  const id = nextClipId();
  if (view === 'face') {
    const head = pose.head;
    const size = head.ry * 3.05;
    const scale = h / size;
    const tx = x + w / 2 - head.cx * scale;
    const ty = y + h / 2 - (head.cy + 6) * scale;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f7fafc"/>
      <clipPath id="clip-${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
      <g clip-path="url(#clip-${id})"><g transform="translate(${tx} ${ty}) scale(${scale})">
        ${renderToStaticMarkup(<Head head={head} geometry={pose.face.geometry} neckTopY={pose.body.shoulders.left.y} style={style} />)}
      </g></g>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f7fafc"/>
    ${renderToStaticMarkup(<Avatar pose={pose} view={view} style={style} x={x} y={y} width={w} height={h} />)}`;
}

mkdirSync(OUT_DIR, { recursive: true });

/* ---------------- 1. hero + camera views ---------------- */
const idle = buildRenderPose(idlePose(2400));
const heroW = 1080;
const hero = [
  cell(idle, 20, 40, 320, 440, 'full'),
  cell(idle, 360, 40, 320, 440, 'hands'),
  cell(idle, 700, 40, 320, 440, 'face'),
  caption(180, 30, 'Full body'),
  caption(520, 30, 'Hands zoom'),
  caption(860, 30, 'Face zoom'),
].join('\n');
console.log('Hero:');
write('hero', document_(hero, heroW, 510), heroW);

/* ---------------- 2. handshape gallery (all basic shapes) ---------------- */
const HAND_CELL = { w: 196, h: 200, cols: 7 };
const handRows = Math.ceil(BASIC_HANDSHAPES.length / HAND_CELL.cols);
const handCells = BASIC_HANDSHAPES.map((preset, index) => {
  const pose = clampPose({
    ...neutralPose(),
    right: { ...neutralPose().right, wrist: [0.5, 0.45, 0.4], handshape: preset.id, palm: 'forward', roll: 0, scale: 1.15 },
  });
  const render = buildRenderPose(pose);
  const xs = render.rightHand.landmarks.map((p) => p.x);
  const ys = render.rightHand.landmarks.map((p) => p.y);
  const x = 20 + (index % HAND_CELL.cols) * (HAND_CELL.w + 6);
  const y = 30 + Math.floor(index / HAND_CELL.cols) * (HAND_CELL.h + 26);
  const handSvg = renderToStaticMarkup(<Hand hand={render.rightHand} />);
  const clipId = nextClipId();
  return `<rect x="${x}" y="${y}" width="${HAND_CELL.w}" height="${HAND_CELL.h}" fill="#f7fafc"/>
    <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${HAND_CELL.w}" height="${HAND_CELL.h}"/></clipPath>
    <g clip-path="url(#${clipId})"><g transform="translate(${x + HAND_CELL.w / 2} ${y + HAND_CELL.h / 2}) scale(${(Math.min(HAND_CELL.w / (Math.max(...xs) - Math.min(...xs) + 52), HAND_CELL.h / (Math.max(...ys) - Math.min(...ys) + 52))).toFixed(3)}) translate(${-((Math.max(...xs) + Math.min(...xs)) / 2)} ${-((Math.max(...ys) + Math.min(...ys)) / 2)})">${handSvg}</g></g>
    ${caption(x + HAND_CELL.w / 2, y + HAND_CELL.h + 18, preset.name.slice(0, 22), 13)}`;
});
const galleryW = 40 + HAND_CELL.cols * (HAND_CELL.w + 6);
const galleryH = 40 + handRows * (HAND_CELL.h + 26) + 10;
console.log('Handshapes:');
write('handshapes', document_(handCells.join('\n'), galleryW, galleryH), galleryW * 1.6);

/* ---------------- 3. expressions ---------------- */
const EXPR_CELL = { w: 200, h: 200, cols: 6 };
const expressionIds = Object.keys(EXPRESSIONS);
const exprRows = Math.ceil(expressionIds.length / EXPR_CELL.cols);
const exprCells = expressionIds.map((id, index) => {
  const preset = EXPRESSIONS[id];
  if (!preset) return '';
  const pose = clampPose({
    ...neutralPose(),
    face: { ...neutralPose().face, ...preset.face },
    head: { ...neutralPose().head, ...preset.head },
  });
  const render = buildRenderPose(pose);
  const x = 20 + (index % EXPR_CELL.cols) * (EXPR_CELL.w + 10);
  const y = 30 + Math.floor(index / EXPR_CELL.cols) * (EXPR_CELL.h + 30);
  return `${cell(render, x, y, EXPR_CELL.w, EXPR_CELL.h, 'face')}
    ${caption(x + EXPR_CELL.w / 2, y + EXPR_CELL.h + 20, preset.label, 16)}`;
});
const exprW = 40 + EXPR_CELL.cols * (EXPR_CELL.w + 10);
const exprH = 40 + exprRows * (EXPR_CELL.h + 30);
console.log('Expressions:');
write('expressions', document_(exprCells.join('\n'), exprW, exprH), exprW * 1.7);

/* ---------------- 4. poses: arms, depth, stick style ---------------- */
const signing = (patch: Partial<RigPose>): RenderPose =>
  buildRenderPose(clampPose({ ...neutralPose(), ...patch }));

const poses: Array<{ pose: RenderPose; label: string; style?: 'human' | 'stick' }> = [
  {
    label: 'Signing, both hands',
    pose: signing({
      right: { ...neutralPose().right, wrist: [0.64, 0.567, 0.5], handshape: 'open-5', palm: 'forward', roll: 0 },
      left: { ...neutralPose().left, wrist: [0.36, 0.567, 0.5], handshape: 'open-5', palm: 'forward', roll: 0 },
    }),
  },
  {
    label: 'Above the head',
    pose: signing({
      right: { ...neutralPose().right, wrist: [0.6, 0.04, 0.3], handshape: 'flat', palm: 'forward', roll: 0 },
      left: { ...neutralPose().left, wrist: [0.4, 0.04, 0.3], handshape: 'flat', palm: 'forward', roll: 0 },
      head: { ...neutralPose().head, pitch: -12 },
      body: { ...neutralPose().body, leanForward: 0.2 },
    }),
  },
  {
    label: 'Two hands, one behind',
    pose: signing({
      right: { ...neutralPose().right, wrist: [0.6, 0.53, 0.85], handshape: 'point', palm: 'back', roll: 10 },
      left: { ...neutralPose().left, wrist: [0.42, 0.53, -0.85], handshape: 'flat', palm: 'forward', roll: -10 },
    }),
  },
  {
    label: 'Contact at the face',
    pose: signing({
      right: { ...neutralPose().right, wrist: [0.56, 0.19, 0.55], handshape: 'pinch', palm: 'back', roll: -25 },
      head: { ...neutralPose().head, pitch: 10, yaw: -8 },
      face: { ...neutralPose().face, ...EXPRESSIONS.thinking?.face },
    }),
  },
  {
    label: 'Lean + shoulder drop',
    pose: signing({
      body: { leanForward: 0.4, leanSide: 0.45, turn: 0.3, shoulderRaiseL: -0.3, shoulderRaiseR: 0.4 },
      head: { ...neutralPose().head, roll: 12, yaw: 14 },
      right: { ...neutralPose().right, wrist: [0.68, 0.38, 0.4], handshape: 'three-finger', palm: 'up', roll: 0 },
    }),
  },
  {
    label: 'Stick style',
    style: 'stick',
    pose: signing({
      right: { ...neutralPose().right, wrist: [0.62, 0.567, 0.5], handshape: 'v-shape', palm: 'forward', roll: 0 },
      left: { ...neutralPose().left, wrist: [0.38, 0.66, 0.4], handshape: 'fist', palm: 'forward', roll: 0 },
    }),
  },
];

const POSE_CELL = { w: 230, h: 300, cols: 3 };
const poseRows = Math.ceil(poses.length / POSE_CELL.cols);
const poseCells = poses.map((entry, index) => {
  const x = 20 + (index % POSE_CELL.cols) * (POSE_CELL.w + 12);
  const y = 30 + Math.floor(index / POSE_CELL.cols) * (POSE_CELL.h + 34);
  return `${cell(entry.pose, x, y, POSE_CELL.w, POSE_CELL.h, 'full', entry.style ?? 'human')}
    ${caption(x + POSE_CELL.w / 2, y + POSE_CELL.h + 22, entry.label, 17)}`;
});
const poseW = 40 + POSE_CELL.cols * (POSE_CELL.w + 12);
const poseH = 40 + poseRows * (POSE_CELL.h + 34);
console.log('Poses:');
write('poses', document_(poseCells.join('\n'), poseW, poseH), poseW * 1.5);

/* ---------------- 5. animation strip (a demo sign) ---------------- */
const strips = DEMO_ANIMATIONS.map((animation) => ({
  file: `demo-${animation.id.replace(/^demo-/, '')}`,
  label: animation.label,
}));

for (const strip of strips) {
  const animation = DEMO_ANIMATIONS.find((entry) => `demo-${entry.id.replace(/^demo-/, '')}` === strip.file);
  if (!animation) {
    console.log(`  (skipped ${strip.file} — not in the registry)`);
    continue;
  }
  const compiled = compileAnimation(animation);
  const frames = 6;
  const W = 200;
  const H = 260;
  const cells = Array.from({ length: frames }, (_v, index) => {
    const progress = index / (frames - 1);
    const pose = buildRenderPose(poseAtProgress(compiled, progress));
    return `${cell(pose, 20 + index * (W + 8), 40, W, H, 'full')}${caption(20 + index * (W + 8) + W / 2, 30, `${Math.round(progress * 100)}%`, 15)}`;
  });
  const width = 40 + frames * (W + 8);
  console.log(`Strip: ${strip.label}`);
  write(`strip-${strip.file}`, document_(cells.join('\n'), width, H + 80), width);
}

/* A single big frame of the stage for proportion checks. */
const big = buildRenderPose(idlePose(0));
write(
  'stage',
  document_(cell(big, 0, 0, STAGE.width, STAGE.height, 'full'), STAGE.width, STAGE.height),
  STAGE.width * 2,
);
console.log(`Head height ${FIGURE.head.halfHeight * 2}px, stage ${STAGE.width}×${STAGE.height}`);
