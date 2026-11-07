# SignBridge sign format (v0.1)

A dictionary file is plain JSON. Nothing in the format assumes a spoken language, and nothing
in the renderer assumes one sign language. TypeScript definitions live in
[`src/types/sign.ts`](../src/types/sign.ts); this document is the human-readable spec.

```
SignDictionaryFile
├── meta      → which language, which version, who reviewed it
└── signs[]   → SignEntry
    ├── identity & meaning     (id, gloss, displayLabel, kind, languageTag, english)
    ├── timing                 (durationMs, speed, size)
    ├── anatomy metadata       (handshape, location, movement, palmOrientation, nonManual)
    ├── review metadata        (reviewStatus, reviewer, accuracy)
    ├── base                   → RigKeyframe applied before every keyframe
    └── keyframes[]            → RigKeyframe
```

## 1. `meta`

| Field | Type | Notes |
| --- | --- | --- |
| `languageTag` | string | `isl`, `asl`, `bsl`, … (BCP-47-ish, lower case) |
| `languageName` | string | Human readable name shown in Settings |
| `version` | string | Bumped whenever signs change |
| `updated` | string | ISO date |
| `reviewStatus` | `draft` \| `reviewed` \| `supported` | File-level ceiling for its entries |
| `reviewer` | string \| null | Required once anything is `reviewed` |
| `source`, `notes` | string | Provenance and caveats |

## 2. `SignEntry`

| Field | Required | Notes |
| --- | --- | --- |
| `id` | ✅ | Stable, unique, e.g. `isl-fs-a`. Used by models, corrections and analytics. |
| `gloss` | ✅ | Canonical label. Upper case by convention (`WATER`, `NOT`). |
| `displayLabel` | ✅ | What the UI shows in the "now signing" chip. |
| `kind` | ✅ | `fingerspelling` · `number` · `word` · `phrase` · `punctuation` |
| `languageTag` | ✅ | Must match the file. |
| `english` | – | Spoken-language gloss for text processing. |
| `durationMs` | ✅ | Nominal duration, 120–4000 ms. |
| `reviewStatus` | ✅ | `draft` (default) · `reviewed` · `supported`. |
| `reviewer` | – | **Required** when `supported`. |
| `accuracy` | – | **Required** when `supported`, e.g. `{ "overall": 0.94, "bySigner": {…} }`. |
| `handshape` | ✅* | Description for the reviewer ("closed fist with thumb alongside index"). |
| `location` | ✅* | `neutral-space` · `chest` · `chin` · `mouth` · `cheek` · `forehead` · `temple` · `shoulder` · `waist` · `in-front-of-body` |
| `movement` | ✅* | How the sign moves ("little finger draws a J: down, then hook left"). |
| `palmOrientation` | ✅* | Description of the palm facing. |
| `nonManual` | – | Non-manual markers this sign accepts (e.g. `["brow-raise", "head-shake"]`). |
| `speed`, `size` | – | Movement quality; `1` = neutral. Size changes meaning (intensity). |
| `base`, `keyframes` | ✅ | See below. |

\* Enforced by `npm run check:signs` as a warning: the anatomy metadata is what makes a sign
reviewable by a deaf signer, so it should never be missing.

## 3. `RigKeyframe`

Keyframes are **sparse**: every field is optional and merges onto the previous keyframe (the
first keyframe merges onto `base`, which merges onto the rig's default pose). This keeps files
small and edits local — a movement is usually one or two numbers.

```jsonc
{
  "t": 0.35,                 // normalized time inside the sign, 0..1, strictly increasing
  "ease": "spring",          // easing for the segment ENDING at this keyframe
  "right": { …HandControls },
  "left":  { …HandControls },
  "face":  { …FaceControls },
  "head":  { …HeadControls },
  "torso": { …TorsoControls },
  "speed": 1, "size": 1
}
```

Easings: `linear` · `easeIn` · `easeOut` · `easeInOut` (default) · `spring` (small overshoot, so
a hand *arrives* instead of gliding).

### 3.1 `HandControls`

| Field | Range | Meaning |
| --- | --- | --- |
| `position` | 0..1 × 0..1 | Wrist location in signing space (independent of stage pixels). |
| `orientation.roll` | degrees | In-plane rotation at the wrist. |
| `orientation.yaw` | degrees | Palm facing: `0` = palm to camera, `-90` = palm to the signer's left, `180` = palm away. |
| `orientation.pitch` | degrees | Tilt toward / away from the camera. |
| `fingers.index/middle/ring/pinky` | 0..1 | Curl: `0` extended, `1` fully flexed. |
| `thumb.curl` | 0..1 | Thumb flexion. |
| `thumb.spread` | 0..1 | `0` across the palm, `1` out to the side. |
| `spread` | 0..1 | Global finger abduction. |
| `fingerSpread.index/middle/ring/pinky` | −1..1 | Per-finger override (needed for crossed fingers, e.g. **R**). |
| `scale` | ~0.7..1.3 | Hand size multiplier. |

### 3.2 `FaceControls` (non-manual markers)

| Field | Range | Meaning |
| --- | --- | --- |
| `browRaise` | −1..1 | Up = yes/no question, surprise. |
| `browFurrow` | 0..1 | Down + together = wh-question, negation, intensity. |
| `browAsymmetry` | −1..1 | One brow up (scepticism). |
| `eyeOpen` | 0..1 | `0` closed (blink/negation), `1` wide (question). |
| `eyeSquint` | 0..1 | Lower-lid tension. |
| `gaze` | −1..1 × −1..1 | Eye direction; also used for references to people/things in space. |
| `cheekRaise` | 0..1 | Genuine smile, "mm" marker. |
| `mouthOpen` | 0..1 | Jaw opening (mouth morphemes). |
| `mouthWidth` | 0..1 | Spread mouth shape. |
| `mouthSmile` | −1..1 | Corners up/down. |
| `mouthRound` | 0..1 | Protruded lips ("oo" morpheme). |
| `tongue` | 0..1 | Tongue visible (adverbial markers). |
| `nostrilFlare` | 0..1 | Intensity. |

### 3.3 `HeadControls` / `TorsoControls`

`head`: `pitch` (+ looks down), `yaw` (+ turns to screen right), `roll` (+ tilts), `offset`
(px, for nods/shakes). `torso`: `lean` (−1..1), `turn` (−1..1), `shoulderRaise` (0..1, shrug).

## 4. Authoring conventions

1. **Author right-handed.** The renderer mirrors the whole figure when the user is left-handed.
2. **`right` is the dominant hand.** `left` defaults to the resting hand; set it only for
   two-handed signs.
3. **Movement lives in keyframes; handshape usually lives in `base`.** A hold is
   `t: 0 → 0.3 (settle, spring) → 1 (tiny drift)`.
4. **Keep the wrist inside signing space** (`x` 0.1–0.9, `y` 0.15–0.95). Positions outside the
   arm's reach are clamped by the IK, which would silently change the sign.
5. **Never leave a sign un-reviewed on purpose.** Use `reviewStatus: "draft"` and add it to the
   review sheet; a fluent deaf signer promotes it to `reviewed`, and per-sign accuracy data
   promotes it to `supported`.

## 5. Example: a movement sign (J)

```jsonc
{
  "id": "isl-fs-j", "gloss": "J", "displayLabel": "J", "kind": "fingerspelling",
  "languageTag": "isl", "durationMs": 900, "reviewStatus": "draft",
  "handshape": "Little finger extended (the I handshape) tracing a J in the air",
  "location": "neutral-space",
  "movement": "The little finger draws a J: down, then hooks to the left",
  "palmOrientation": "Palm facing sideways",
  "base": { "right": {
    "position": { "x": 0.65, "y": 0.65 },
    "orientation": { "roll": 0, "yaw": -20, "pitch": 0 },
    "fingers": { "index": 1, "middle": 1, "ring": 1, "pinky": 0.02 },
    "thumb": { "curl": 0.35, "spread": 0.28 },
    "spread": 0.05, "scale": 1 } },
  "keyframes": [
    { "t": 0,    "right": { "position": { "x": 0.68, "y": 0.59 } } },
    { "t": 0.35, "right": { "position": { "x": 0.65, "y": 0.70 } }, "ease": "easeInOut" },
    { "t": 0.75, "right": { "position": { "x": 0.60, "y": 0.72 } }, "ease": "easeOut" },
    { "t": 1,    "right": { "position": { "x": 0.59, "y": 0.71 } }, "ease": "easeOut" }
  ]
}
```

## 6. Validation

`npm run check:signs` fails the build on: invalid JSON, missing meta, missing required fields, a
`languageTag` mismatch, unknown kind/easing/review status, values outside their range,
non-increasing keyframe times, duplicate ids or glosses, missing alphabet coverage (when a file
contains fingerspelling), a `supported` sign without a reviewer, and a `supported` sign without
accuracy data. Warnings are raised for missing anatomy metadata.
