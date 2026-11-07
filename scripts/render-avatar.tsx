/**
 * Dev tool: render avatar snapshots to SVG/PNG so the handshapes and expressions can be
 * eyeballed (and reviewed by a deaf signer) without opening a browser.
 *
 *   npm run render:avatar            → docs/avatar-review/*.png
 *
 * This is intentionally a separate renderer from <Avatar> so the output can be a
 * contact sheet of many poses inside one SVG document.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import type { ReactElement } from 'react';

import dictionary from '../src/data/signs/isl-fingerspelling.json';
import type { AvatarFrame, SignDictionaryFile } from '../src/types/sign';
import { EXPRESSION_ORDER, EXPRESSION_PRESETS } from '../src/core/rig/presets';
import { buildAvatarFrame, frameAt, getResolvedSign, idleFrame } from '../src/core/rig/compile';
import { Arm, Torso } from '../src/components/avatar/Body';
import { Head } from '../src/components/avatar/Head';
import { Hand } from '../src/components/avatar/Hand';

const OUT_DIR = 'docs/avatar-review';

/** resvg does not resolve CSS custom properties, so preview builds inline them. */
const COLORS: Record<string, string> = {
  '--sb-skin': '#cf9c74',
  '--sb-skin-light': '#e0b593',
  '--sb-skin-shade': '#b0825e',
  '--sb-skin-deep': '#96694a',
  '--sb-hair': '#2a211a',
  '--sb-shirt': '#12455c',
  '--sb-shirt-edge': '#0c3345',
  '--sb-lip': '#a9625d',
  '--sb-mouth-inner': '#5a2d2f',
  '--sb-brand': '#0d6f66',
  '--sb-ink': '#0a1220',
};

const inlineColors = (markup: string) =>
  markup.replace(/var\((--sb-[a-z-]+)\)/g, (_m, key: string) => COLORS[key] ?? '#888888');

function scene(frame: AvatarFrame, x: number, y: number, scale: number, caption?: string): ReactElement {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={0} y={0} width={360} height={480} rx={18} fill="#f7fafc" stroke="#d3dde9" strokeWidth={2} />
      <Torso torso={frame.torso} />
      <Head face={frame.face} head={frame.head} />
      <Arm arm={frame.leftArm} side="left" />
      <Hand frame={frame.leftHand} />
      <Arm arm={frame.rightArm} side="right" />
      <Hand frame={frame.rightHand} />
      {caption ? (
        <text x={180} y={462} textAnchor="middle" fontFamily="sans-serif" fontSize={30} fill="#0a1220">
          {caption}
        </text>
      ) : null}
    </g>
  );
}

function sheet(content: ReactElement, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="sb-head-shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/>
      </linearGradient>
      <linearGradient id="sb-hair-sheen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <filter id="sb-hand-shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="1.2" dy="2" stdDeviation="1.5" flood-color="#0a1220" flood-opacity="0.22"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="#eef2f8"/>
    ${inlineColors(renderToStaticMarkup(content))}
  </svg>`;
}

function write(name: string, svg: string, width: number) {
  writeFileSync(`${OUT_DIR}/${name}.svg`, svg);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true } }).render();
  writeFileSync(`${OUT_DIR}/${name}.png`, png.asPng());
  console.log(`  ${OUT_DIR}/${name}.png`);
}

const dict = dictionary as unknown as SignDictionaryFile;
mkdirSync(OUT_DIR, { recursive: true });

/* 1. Fingerspelling sheet: A–Z + 0–9, each at 60% through its own hold. */
const cell = { w: 220, h: 300, scale: 0.52, pad: 14 };
const cols = 7;
const rows = Math.ceil(dict.signs.length / cols);
const grid = dict.signs.map((sign, i) => {
  const frame = frameAt(getResolvedSign(sign), 0.6, { expression: 'neutral', timeMs: 0 });
  const x = cell.pad + (i % cols) * (cell.w + cell.pad);
  const y = cell.pad + Math.floor(i / cols) * (cell.h + cell.pad);
  return <g key={sign.id}>{scene(frame, x, y, cell.scale, undefined)}<text x={x + cell.w / 2} y={y + cell.h - 12} textAnchor="middle" fontFamily="sans-serif" fontSize={26} fill="#0a1220">{sign.displayLabel}</text></g>;
});
const gridW = cell.pad + cols * (cell.w + cell.pad);
const gridH = cell.pad + rows * (cell.h + cell.pad) + 40;
console.log('Fingerspelling sheet:');
write('fingerspelling', sheet(<>{grid}</>, gridW, gridH), gridW * 2);

/* 2. Expression sheet: the four non-manual markers, face zoomed. */
const expCols = 4;
const expCell = { w: 300, h: 380, scale: 0.72 };
const expSheet = EXPRESSION_ORDER.map((id, i) => {
  const preset = EXPRESSION_PRESETS[id];
  const base = idleFrame({ timeMs: 1200 });
  const frame = buildAvatarFrame(
    { right: base.rightHand.controls, left: base.leftHand.controls, face: base.face, head: base.head, torso: base.torso, speed: 1, size: 1 },
    { expression: id, timeMs: 1200 },
  );
  const x = cell.pad + i * (expCell.w + cell.pad);
  const y = cell.pad + 50;
  return (
    <g key={id}>
      <text x={x + expCell.w / 2} y={y - 16} textAnchor="middle" fontFamily="sans-serif" fontSize={26} fill="#0a1220">
        {preset.label}
      </text>
      <g transform={`translate(${x + expCell.w / 2} ${y + expCell.h / 2}) scale(2.3) translate(-180 -94)`}>
        <Head face={frame.face} head={frame.head} />
      </g>
    </g>
  );
});
const expW = cell.pad + expCols * (expCell.w + cell.pad);
const expH = cell.pad + 50 + expCell.h + 30;
console.log('Expression sheet:');
write('expressions', sheet(<>{expSheet}</>, expW, expH), expW * 2);

/* 3. Hand close-ups, one cell per letter: the sheet a signer actually reviews. */
const hz = { w: 230, h: 260, scale: 1.55, pad: 12, cols: 6 };
const hzRows = Math.ceil(dict.signs.length / hz.cols);
const cropX = 204;
const cropY = 196;
const handGrid = dict.signs.map((sign, i) => {
  const frame = frameAt(getResolvedSign(sign), 0.6, { expression: 'neutral', timeMs: 0 });
  const x = hz.pad + (i % hz.cols) * (hz.w + hz.pad);
  const y = hz.pad + Math.floor(i / hz.cols) * (hz.h + hz.pad);
  return (
    <g key={sign.id}>
      <g transform={`translate(${x + hz.w / 2} ${y + hz.h / 2}) scale(${hz.scale}) translate(${-cropX} ${-cropY})`}>
        <rect x={cropX - 90} y={cropY - 100} width={180} height={220} fill="#f7fafc" />
        <Hand frame={frame.rightHand} />
      </g>
      <rect x={x} y={y} width={hz.w} height={hz.h} fill="none" stroke="#d3dde9" strokeWidth={2} />
      <text x={x + hz.w / 2} y={y + hz.h - 10} textAnchor="middle" fontFamily="sans-serif" fontSize={26} fill="#0a1220">
        {sign.displayLabel}
      </text>
    </g>
  );
});
const hzW = hz.pad + hz.cols * (hz.w + hz.pad);
const hzH = hz.pad + hzRows * (hz.h + hz.pad);
console.log('Hand close-ups:');
write('handshapes', sheet(<>{handGrid}</>, hzW, hzH), hzW * 1.6);

/* 4. Full-body idle pose. */
console.log('Idle pose:');
write('idle', sheet(scene(idleFrame({}), 20, 20, 1), 400, 520), 400);
