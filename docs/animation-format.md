# The SignBridge animation format

One JSON file holds one animation (or a bundle of them). The format is language-agnostic:
nothing in it mentions Indian Sign Language specifically — `meta.language` does.

A complete example, `src/data/animations/demo-hello.json`:

```json
{
  "id": "demo-hello",
  "label": "Hello (wave)",
  "duration_ms": 1600,
  "tracks": {
    "rightHand": [
      { "t": 0.0,  "wrist": [0.7, 0.6, 0.3],   "handshape": "flat",   "palm": "forward", "roll": -8,  "ease": "easeOut" },
      { "t": 0.18, "wrist": [0.75, 0.22, 0.35], "handshape": "open-5", "roll": -14, "ease": "easeOut" },
      { "t": 0.34, "roll": 12,  "ease": "easeInOut" },
      { "t": 0.5,  "roll": -14, "ease": "easeInOut" },
      { "t": 0.66, "roll": 12,  "ease": "easeInOut" },
      { "t": 0.82, "roll": -4,  "ease": "easeInOut" },
      { "t": 1.0,  "wrist": [0.7, 0.58, 0.3],  "handshape": "relaxed", "roll": 0, "ease": "easeInOut" }
    ],
    "leftHand": [],
    "face": [
      { "t": 0.0, "mouthSmile": 0.1, "browRaiseL": 0.12, "browRaiseR": 0.12 },
      { "t": 0.2, "mouthSmile": 0.6, "mouthWidth": 0.65, "browRaiseL": 0.4, "browRaiseR": 0.4, "cheekRaise": 0.5, "ease": "easeOut" }
    ],
    "head": [
      { "t": 0.0, "pitch": 0, "roll": 0 },
      { "t": 0.2, "pitch": -4, "roll": 5, "ease": "easeOut" }
    ],
    "body": [
      { "t": 0.0, "leanForward": 0 },
      { "t": 0.3, "leanForward": 0.12, "ease": "easeOut" }
    ]
  },
  "nonManualOverlay": { "expression": "happy", "weight": 0.55, "groups": ["brows", "eyes", "cheeks"] },
  "meta": {
    "language": "ISL",
    "description": "An open right hand raised beside the head, waving side to side twice.",
    "reviewed_by_deaf_signer": false,
    "demo": true,
    "channels": ["hands", "arms", "face", "head", "body"]
  }
}
```

(Trimmed here for reading; the real file has keyframes at every stop of the wave and a
`face`/`head`/`body` return to neutral.)

## Top level

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Unique across the registry. Lower-case, digits and dashes; must start with a letter. |
| `label` | string | Short name shown in the UI. |
| `duration_ms` | number | 200–20000. |
| `tracks` | object | All five tracks are required, even when empty: `rightHand`, `leftHand`, `face`, `head`, `body`. |
| `nonManualOverlay` | object? | `{ expression, weight, groups? }` — an expression laid over the hands. `groups` narrows which face groups it may touch. |
| `meta` | object | Required, see below. |

At least one keyframe must exist across all tracks.

## Keyframes

Every keyframe has `t` in **normalised time** (`0` = start, `1` = end) and an optional
`ease` naming the curve of the segment that **ends** at this keyframe:
`linear`, `easeIn`, `easeOut`, `easeInOut`, `snappy`. Easings are monotonic — they change the
speed of a move, never its direction.

Keyframes must be listed in time order. Duplicate times keep the last value.

Inside a track, **fields carry forward**: a keyframe only has to mention what changes. The
`t: 0.34` keyframe above only sets `roll`; the handshape, palm and wrist continue from `0.18`.

### `rightHand` / `leftHand`

```ts
{
  t: number,
  handshape?: string,          // preset id, see src/core/rig/handshapes.ts
  palm?: 'forward' | 'back' | 'up' | 'down' | 'left' | 'right',
  roll?: number,               // −62…62, rotation in the picture plane
  wrist?: [x, y, z],           // normalised signing space: x 0…1, y 0…1, z −1 (behind) … 1 (front)
  scale?: number,              // hand size multiplier, 0.7…1.3
  ease?: EasingName
}
```

`x` grows to the right of the screen, `y` grows **down** the stage. The shoulder is around
`(0.32, 0.35)` on the left and `(0.68, 0.35)` on the right, so a wrist at the hip is
`y ≈ 0.73`.

### `face`

Any of the 21 parameters, each `−1…1` unless noted:

| Group | Parameters |
| --- | --- |
| Brows | `browRaiseL`, `browRaiseR`, `browFurrowL`, `browFurrowR` |
| Eyes | `eyeOpenL`, `eyeOpenR`, `blink`, `gazeX`, `gazeY` |
| Cheeks / nose | `cheekPuff`, `cheekRaise`, `noseWrinkle` |
| Mouth | `mouthOpen`, `mouthWidth`, `mouthSmile` (signed), `lipPurse`, `lipsPressed`, `tongueOut`, `mouthAh`, `mouthEe`, `mouthPa` |

Unknown parameter names are a **warning**, not an error, so an older file still loads — but
they are reported when a file is imported into the Studio.

### `head`

`pitch` (nod, −20…20), `yaw` (turn), `roll` (tilt), plus optional `gazeX`/`gazeY`.

### `body`

`leanForward`, `leanSide`, `turn`, `shoulderRaiseL`, `shoulderRaiseR`, `breath`.

## `meta`

| Field | Notes |
| --- | --- |
| `language` | `ISL`, `ASL`, `BSL`… free text in practice; the UI only shows `ISL` content today. |
| `description` | One sentence, shown in the demos list. Required for demos. |
| `reviewed_by_deaf_signer` | **Required and must be explicit.** `false` until a fluent deaf signer has reviewed the motion. Every draft in this repo is `false`. |
| `demo` | `true` marks a demo (adds the "demo motion" label in the player). |
| `channels` | Which channels the animation exercises: `hands`, `arms`, `face`, `head`, `body`, `two-hands`. |
| `source` | Optional free-text provenance. |

## Bundles

A file may hold many animations:

```json
{ "meta": { "name": "Fingerspelling", "language": "ISL" }, "animations": [ … ] }
```

Validation errors then carry indexed paths (`animations[4].tracks.rightHand[0].wrist`) so a
broken entry is easy to find.

## Order of operations when a frame is drawn

```
sample tracks → apply non-manual overlay (masked) → transition blend → clamp → mirror → render
```

1. **Sample** each track at the current progress, applying that segment's easing.
2. **Overlay**: blend the named expression over the sampled face. Only the brows/eyes/cheeks/
   nose groups are on by default; the mouth is left to the sign unless the sign has no mouth
   keyframes.
3. **Transition**: between two queued animations, blend pose → pose over 200 ms with the wrists
   travelling on a shallow arc, so the hand does not cut through the body.
4. **Clamp**: joint limits, reach limits, the signing space.
5. **Mirror** for left-handed mode (swaps the hands, flips lateral channels).
6. **Render** to a `RenderPose`: stage-pixel landmarks for both hands, arm bones, face geometry,
   head and body.

## Validating

```bash
npm run check:animations
```

or programmatically:

```ts
import { validateAnimation, formatIssues, parseAnimation } from './src/core/animation/schema';

const result = validateAnimation(json);
result.issues.filter((issue) => issue.severity === 'error').forEach((issue) => {
  console.log(issue.path, issue.message);   // e.g. "tracks.rightHand[2].t  must be 0..1"
});

parseAnimation(json);   // throws AnimationFormatError listing every problem
```

The Studio validates on import and shows the same messages.

## Rules the rig will enforce for you

- A wrist beyond the arm's reach is pulled back to the reachable set (the Studio warns).
- A hand closer to the shoulder than the elbow can fold is pushed out slightly; with the hand
  in front of the body this is invisible, because the forearm points at the viewer.
- A handshape with impossible joints is clamped. Presets in the repo are checked in CI.
- Keyframe times are clamped to `0…1` and sorted; out-of-order files fail validation.
