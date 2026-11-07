# Phase 2 — Full Avatar Engine: plan

## Goal

Turn the Phase 1 fingerspelling figure into a **data-driven signing engine**: five independent
channels (hands, arms, face, head, body) described in JSON, compiled onto a joint-level rig,
played back with transitions, layering and a queue, and authored visually in a Sign Studio.

Nothing in this phase adds vocabulary, grammar, speech or camera recognition.

## Build order

1. **Rig + renderer** — `core/rig/skeleton.ts` (anatomy, joint limits, finger FK, arm IK,
   body collision), `core/rig/render.ts` (pose → drawing model), `components/avatar/*` (SVG).
2. **Handshapes** — `core/rig/handshapes.ts`: 40+ named presets as explicit joint angles,
   plus the A–Z / 0–9 shapes; palm orientation is a separate parameter.
3. **Face engine** — `core/rig/face.ts`: 21 blendshape-style parameters, 10 named expressions,
   masked blending so an emotion never overwrites a sign's mouth shape.
4. **Head + body** — separate channels (`HeadState`, `BodyState`) layered on top of any sign.
5. **Animation engine** — `core/animation/*`: format + validator, per-track sampling, overlay
   layering with weights, transition blender with an arc path, queue with events, player hook.
6. **Sign Studio** — `/studio`: inspector, per-track timeline, IndexedDB autosave, import/export.
7. **Demo signs** — 10 hand-authored JSON animations, clearly marked as unverified demos.
8. **Tests** — Vitest unit tests for interpolation, joint limits, schema validation, transitions,
   handshapes, mirroring and the queue.

## File structure (new / changed)

```
src/
├── types/
│   ├── animation.ts        NEW  SignAnimation schema, tracks, RigPose, Face/Head/Body state
│   └── sign.ts             removed (superseded by animation.ts)
├── core/
│   ├── rig/
│   │   ├── anatomy.ts      NEW  figure metrics, joint limits, torso collision body
│   │   ├── hand.ts         NEW  finger FK (21 MediaPipe landmarks), palm orientation
│   │   ├── arm.ts          NEW  2-bone IK, elbow limits, body-collision clamp
│   │   ├── handshapes.ts   NEW  40+ presets + A–Z / 0–9 joint-angle sets
│   │   ├── face.ts         NEW  21 face parameters, 10 expressions, masked blend
│   │   ├── pose.ts         NEW  neutral pose, blend, clamp, mirror, intensity
│   │   └── render.ts       NEW  RigPose → render model (paths, landmark sets)
│   ├── animation/
│   │   ├── easing.ts       NEW  linear/easeIn/easeOut/easeInOut/snappy
│   │   ├── interpolate.ts  NEW  track sampling, angle shortest-path lerp
│   │   ├── schema.ts       NEW  validator with JSON-path error messages
│   │   ├── compile.ts      NEW  SignAnimation → RigPose at t (+ overlay layering)
│   │   ├── transition.ts   NEW  pose blender with arc path + timing
│   │   └── queue.ts        NEW  queue engine: play/pause/seek/speed/loop/events
│   └── text/fingerspell.ts NEW  planFingerspelling: text → animation queue (no grammar)
├── hooks/
│   └── useAnimationPlayer.ts NEW React binding for the queue + FPS meter
├── components/
│   ├── avatar/             rewritten: Avatar, Hand, Arm, Head, Torso, AvatarStage
│   └── studio/             NEW  Timeline (five lanes, playhead) — the inspectors live in the page
├── pages/
│   ├── GalleryPage.tsx     NEW  handshape gallery with a rotating hand
│   ├── StudioPage.tsx      NEW  Sign Studio
│   ├── TextToSignPage.tsx  rewritten on the new engine (fingerspelling demo)
│   └── …                   Home / Camera / Settings updated
├── data/animations/        NEW  10 demo signs + the alphabet animation bundle
└── lib/idb.ts              NEW  minimal IndexedDB wrapper for Studio autosave
```

## Assumptions

1. **2D SVG rig, not 3D.** The hand/arm solver works in 3D-ish local space (x, y, depth z) and
   projects orthographically, so landmark data stays compatible with MediaPipe ordering.
2. **Wrist positions are normalized** in signing space (0..1 × 0..1 × −1..1 depth) so the rig can
   be re-proportioned or replaced by Three.js without touching animation data.
3. **Angles in degrees** for authoring; converted to radians in the rig.
4. **Depth is used for layering and foreshortening only** — there is no full 3D camera.
5. **Handedness mirroring happens in the rig** (swap hands, negate x/roll/yaw), not by flipping
   the SVG, so landmark output stays anatomically meaningful for Phase 4/5 training data.
6. **Demo signs are motion studies**, not verified ISL; every one carries
   `reviewed_by_deaf_signer: false` and the UI says so.
7. **Performance target** is measured with the in-app FPS overlay; SVG with ~250 nodes is used
   because it styles with CSS variables (theming) and is fast enough at 60 FPS.
8. **IndexedDB** stores Studio drafts only; no user data leaves the device.

## Open questions (carried into the README)

- Which regional ISL fingerspelling variant should replace the draft alphabet?
- Should the Studio eventually export directly into the Phase 3 dictionary format?
- Do we need a signer-facing (not developer-facing) authoring mode with video reference?

---

## Status: delivered

Phase 2 shipped. What that means in numbers, all enforced by `npm run check`:

| Item | Planned | Delivered |
| --- | --- | --- |
| Handshape presets | 40+ | **71** (32 basic, 36 alphabet, 3 classifier), all inside anatomical limits |
| Face parameters | 22 | **21**, every one verified to change the drawing |
| Named expressions | 11 | **10** (a separate "neutral" pose is the base, not an expression) |
| Demo animations | 10 | **10**, covering hands, arms, face, head and body |
| Fingerspelling set | A–Z / 0–9 | 36 animations in one bundle, still `reviewed_by_deaf_signer: false` |
| Routes | 4 new | 7 total: `/`, `/text-to-sign`, `/demos`, `/gallery`, `/studio`, `/camera`, `/settings` |
| Tests | unit tests for interpolation, limits, schema, transitions, handshapes, mirroring, queue | **117** across 9 files, plus a jsdom runtime test of every page |

### Where reality diverged from the plan

1. **The elbow solver needed two rewrites.** A hard choice between the two IK solutions popped
   the elbow across the chest whenever an animation folded the arm; it is now a continuous
   preference blended towards a fixed "elbow down and out" pole as the wrist approaches the
   shoulder. Result: the worst elbow movement in any demo at 2× speed fell from 241 px/frame to
   under 40 px, and the test suite locks that in.
2. **Depth-aware reach.** The signing space had to learn that a hand held *in front of the body*
   can be closer to the shoulder in a flat projection than a hand held at the side — otherwise
   nearly every "raise a hand past the shoulder" path was clamped away from the body.
3. **The mouth is part of the sign, not the expression.** The overlay mask is now decided per
   animation (`overlayGroupsFor`), so eyebrows never eat a mouth morpheme.
4. **A separate `HandPreview`** was added for the gallery and the camera screen: an auto-fitted
   viewBox around a single hand, from the same rig.
5. **`text/planFingerspelling`** replaced the Phase 1 script reader; it reports skipped
   characters instead of dropping them, and caps the queue at 32 characters.
6. **The Studio exports the same JSON the loader validates**, so an exported draft can be
   dropped into `src/data/animations/` and registered without edits.

### Carried forward (Phase 3+)

- A reviewed ISL vocabulary and the regional fingerspelling variant to replace the drafts.
- Stroke/shape hints for faces and hands that the 2D projection cannot disambiguate.
- A signer-facing authoring mode with video reference alongside the Studio timeline.
