# Ayan Garden redesign

Implemented on top of the games demo commit 829fb19.

## Experience

- Separate teacher and learner spaces, with an explicit mode switch. This is navigation, not an authentication boundary.
- White and light green palette, Nunito typography, inline SVG illustrations, responsive activity cards and garden.
- Removed the adult A / A+ / A++ controls and their help copy. Normal browser text scaling remains available.
- Teacher selects and approves available demo activities in a native modal. The modal includes an overview of the actual exercises. The teacher library now shows all nine activities.
- Existing lesson creation, approval, observations, summaries, legacy games launched from lessons and backup logic remain available.
- JAZ motion reference: dist/motion.css, dist/motion.js and dist/student.css. Adapted easing, reveal rhythm, stagger and button press behavior; used a new Ayan palette and original page layout.

## Activities

The new learner space includes playable pairs, sequencing, sorting, packing a bag, pattern continuation, a four-piece picture swap puzzle, listening with a text alternative, a three-question trail, and planting a garden. These are small curated demo exercises, not a full curriculum or adaptive learning system. The puzzle uses select-two-to-swap rather than drag-and-drop. Audio uses browser speech synthesis after an explicit button press; voice availability, especially Kazakh, depends on the device. Text alternatives remain available.

Progress and garden placement are local to the browser under ayan.experience.v2. An unfinished activity is validated and restored from ayan.session.v2. New data is deliberately separate from the existing observations and is not included in the legacy backup export. Completion unlocks plant variants once per activity; there are no streak penalties, leaderboards or disappearing rewards.

## Mascot

Added a locally served Three.js 0.180.0 runtime and the original GLB. The character is rendered live, not as looped WebP video. Runtime poses include a wave, listening idle, pointing, thinking, supportive nod, resting eyes, expressive celebration with a single turn, and a bounded oval flight. Initial rest transforms are evaluated from the GLB Idle animation before procedural posing: the original GLB does not encode all rest transforms directly on its nodes.

This changes browser animation behavior. It does not regenerate the Blender source, exported clips or a lip-sync rig. PNG fallback works when WebGL or model loading is unavailable. Reduced-motion and manual movement-off use a still image without creating a WebGL renderer. Hidden pages do not advance the animation. Renderer resources and contexts are disposed when leaving a screen.

## Validation

- 29 Node unit tests pass, including 7 new tests for demo metadata, sparse garden persistence, idempotent rewards, answer checking and corrupted-session rejection.
- Browser walkthrough completed all nine activities including the original pairs flow, pause/resume, trail restoration after reload and sparse garden placement restoration.
- Checked the Kazakh learner screen and reduced-motion mode without a canvas.
- Checked desktop and 390px mobile screenshots; no learner home horizontal overflow.
- Verified that 3D loads with a canvas and that the visible character has the correct rest pose. Local Three.js vendor license is included.

## Run

Use `npm start` (default port 4180) or set `PORT` before running `node dev-server.cjs`. Run `npm test` for the pure logic and existing regression suite. No build step or CDN is required.

Teaching content and Kazakh copy need teacher/native-speaker review before classroom use. Broad browser, assistive technology and real-device performance testing remains appropriate before a production rollout.
