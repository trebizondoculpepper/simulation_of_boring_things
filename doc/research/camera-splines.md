# Camera splines for the attract sequence

Research for authored camera moves in the title's attract sequence (`doc/prompts/054-title-attract-sequence.md`, `src/toolkit/title/logic/attract-sequence.ts`). The owner frames shots in noclip and copies each pose as a link (x, y, z in metres; yaw and pitch in degrees, yaw 0 facing north, −z; zoom; roll in degrees to come). The question is how to join a list of such poses into one smooth, film-like glide. Researched 2026-10-24. Anything marked **(inferred)** is my reasoning, not a source's statement.

## Contents

1. Position curves through keyframes
2. Speed along the path
3. Orientation, roll and zoom
4. How engines and tools do it
5. Recommendation for this project
6. Sources

## 1. Position curves through keyframes

**Interpolating versus approximating.** An interpolating spline passes through every keyframe; an approximating one is pulled towards them but generally misses. A Bézier curve interpolates only its first and last control points and approximates the rest ([Weinkauf, KTH, Bézier spline continuity](https://www.csc.kth.se/~weinkauf/notes/beziersplinecontinuity.html)); uniform cubic B-splines are the classic approximating, C2-smooth case. Freya Holmér's lecture covers the whole family (Bézier, Hermite, cardinal, Catmull-Rom, B-spline) and their continuity classes ([The Continuity of Splines](https://classcentral.com/classroom/youtube-the-continuity-of-splines-129118)). For our purpose, where the owner framed each pose deliberately, the camera must pass through the keys, so B-splines are out, except as an optional "smooth through, don't hit" mode.

**Piecewise cubic Bézier with derived handles.** Any C1 interpolating cubic (Hermite, Catmull-Rom, Kochanek-Bartels) can be written as a chain of cubic Béziers: for a segment from P_i to P_{i+1} with tangents m_i, m_{i+1}, the inner control points are P_i + m_i/3 and P_{i+1} − m_{i+1}/3. "Bézier with automatic handles" is therefore not a separate method; the choice is how the tangents are derived. Unity's Splines package says exactly this: its Auto tangent mode computes tangents from neighbouring knots and "creates Catmull-Rom splines", while Bezier mode exposes the handles to edit ([Unity Splines, tangent modes](https://docs.unity3d.com/Packages/com.unity.splines@2.3/manual/tangent-modes)).

**Catmull-Rom: uniform, centripetal, chordal.** Catmull-Rom sets each tangent from the neighbouring points. The knot spacing is |P_{i+1} − P_i|^α: α = 0 uniform, α = 0.5 centripetal, α = 1 chordal. Yuksel, Schaefer and Keyser prove that centripetal is the only member of the family that guarantees no cusps and no self-intersections within a segment; uniform produces loops and cusps where a short segment sits between long ones, and chordal misbehaves on long segments ([Parameterization of Catmull-Rom Curves](https://cemyuksel.com/research/catmullrom_param/); [paper PDF](https://people.engr.tamu.edu/schaefer/research/catmull_rom.pdf)). The intuition: the uniform form gives every segment the same parameter span regardless of length, so a long neighbour produces a tangent far too long for a short segment, which overshoots and loops back; centripetal's square-root spacing shrinks that tangent enough to prevent it. The guarantee is per segment, not for the whole curve. The Python `splines` documentation reproduces the properties with worked figures ([splines: Catmull-Rom properties](https://splines.readthedocs.io/en/0.3.0/euclidean/catmull-rom-properties.html)). Mapillary's photo viewer chose centripetal for its camera path for exactly this reason ([Mapillary, viewer improvements](https://blog.mapillary.com/news/2015/09/30/viewer-improvements.html)). Catmull-Rom is C1, not C2: acceleration can jump at a key, which is rarely visible on a slow camera.

**Kochanek-Bartels (TCB).** A cubic Hermite spline whose tangents add three per-key controls: tension (tangent length, how tight the bend), continuity (lets incoming and outgoing tangents differ, so a deliberate corner) and bias (bend shifted before or after the key, overshoot or undershoot). With all three at zero it is Catmull-Rom ([Wikipedia, Kochanek–Bartels spline](https://en.wikipedia.org/wiki/Kochanek%E2%80%93Bartels_spline); [Kochanek and Bartels 1984, SIGGRAPH](https://history.siggraph.org/learning/interpolating-splines-with-local-tension-continuity-and-bias-control-by-kochanek-and-bartels/)). In practice animators mostly lowered tension slightly and left continuity and bias alone ([Bournemouth NCCA notes](https://nccasymposium.bournemouth.ac.uk/2005/mscca/AHERNE_html/splines.html)). A per-key tension is a cheap extension to keep in mind; it is not needed to start.

**Natural (C2) cubic splines.** Solving a tridiagonal system gives a curve through all keys with continuous acceleration. The cost is that every key influences the whole curve (moving one pose ripples through the shot) and it overshoots more readily than centripetal Catmull-Rom. For short authored camera paths, local control matters more than C2 **(inferred)**; Cinemachine offers a C2 "Spline Smoother" as an option rather than the default ([Cinemachine Spline Smoother](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineSplineSmoother.html)).

**What Three.js provides.** `CatmullRomCurve3(points, closed, curveType, tension)` with `curveType` 'centripetal' (the default), 'chordal' or 'catmullrom' ([three.js docs, CatmullRomCurve3](https://threejs.org/docs/pages/CatmullRomCurve3.html)); `CubicBezierCurve3`; `CurvePath` to chain curves; and on the base `Curve`, `getPoint(t)`, `getPointAt(u)` (arc-length, equal distance per u), `getTangentAt`, `getUtoTmapping` and `arcLengthDivisions` (default 200) for the arc-length table ([three.js docs, Curve](https://threejs.org/docs/pages/Curve.html)). Limits, from the source: the global t is split equally between segments whatever their length, and the centripetal exponent only shapes the tangents inside each segment; open ends are handled by mirrored phantom points (2·P0 − P1) ([CatmullRomCurve3.js](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/extras/curves/CatmullRomCurve3.js)). So `getPoint` gives uneven speed, and `getPointAt` gives constant speed over the whole curve but has no notion of time per key, so it cannot make the camera arrive at key 3 at 7.5 s. The arc-length table is a linear-segment approximation and has been reported confusing on short curves ([three.js forum](https://discourse.threejs.org/t/getutotmapping-cannot-get-the-correct-progress/13380)). For this project there is a further reason not to use it: `logic/` folders must be pure, with no Three.js. A centripetal Catmull-Rom segment is about 30 lines of plain TypeScript.

## 2. Speed along the path

**Arc-length reparameterisation.** A spline's parameter is not distance, so stepping it at a constant rate gives a camera that rushes along long segments and crawls on short ones ([splines: re-parameterization](https://splines.readthedocs.io/en/latest/euclidean/re-parameterization.html)). The standard fix is a table of (parameter, cumulative length) from many small samples, inverted by binary search and linear interpolation at run time ([Parent, Computer Animation ch. 3](https://web.cse.ohio-state.edu/~parent.1/classes/683/Lectures/chapter03.pdf); [Parent, arc length notes](https://research.cs.wisc.edu/graphics/Courses/cs-838-1999/Papers/Parent/parent4.pdf)). Parent separates the two concerns cleanly: a space curve parameterised by distance, and a separate distance-time function for speed control (ease-in/ease-out, constant speed, etc.). That separation is the core of the design below.

**Ease at the ends.** With a distance-time function s(t), ease-in/out is just its slope going to zero at t = 0 and t = end (smoothstep, or a sine ease), while the space curve is unchanged ([SIGGRAPH HyperGraph, slow in and out](https://education.siggraph.org/static/HyperGraph/animation/character_animation/principles/slow_in_and_out.htm)). Because the attract sequence fades in and out over 1.2 s, the camera may also start and end already moving ("flying start"), which looks more like a film shot cut mid-move; worth making optional **(inferred)**.

**Per-key times versus uniform speed.** Two options: uniform speed (only a total duration; each key reached when the distance says so) or timed keys (each key reached at its own time stamp, as the spec 054 already asks: "timed presets"). Timed keys give the author control of pacing (slow over the interesting part) but naïve per-segment linear timing makes the speed jump at every key: segment A covers 6 m in 2 s, segment B 2 m in 2 s, so the speed drops from 3 to 1 m/s instantly. The fix is to treat (t_i, s_i), the time and cumulative arc length at each key, as data and fit a smooth, monotone curve through it: a cubic Hermite with Catmull-Rom-style slopes, limited by Fritsch-Carlson so it never runs backwards or overshoots a key ([Wikipedia, monotone cubic interpolation](https://en.wikipedia.org/wiki/Monotone_cubic_interpolation)). s(t) is then C1, so speed is continuous through every key, and the camera still arrives at each key exactly on time. Setting the first and last slopes to zero gives ease-in/out for free; a key repeated at two times gives a hold. Unity's dolly expresses position in "Distance", "Knot" or "Normalized" units for the same reason: knot units hit keys, distance units give even speed ([Cinemachine Spline Dolly](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineSplineDolly.html)).

## 3. Orientation, roll and zoom

**Euler angles versus quaternions.** Quaternions are the standard for arbitrary rotation: no gimbal lock, and slerp moves at constant angular speed along the shortest arc ([Shoemake 1985, Animating Rotation with Quaternion Curves](https://history.siggraph.org/?p=107413); [Ramamoorthi and Barr notes, UCSD](https://cseweb.ucsd.edu/%7Eravir/quaternion.pdf)). Slerping key to key is only C0: the angular velocity jumps at each key, visible as a small kick. Shoemake's spherical cubic, and Squad (spherical quadrangle, three slerps), compute inner control quaternions from the neighbours and give C1 rotation through all keys; its derivation assumes uniform parameter spacing and its original continuity proof has since been corrected ([splines: Squad](https://splines.readthedocs.io/en/latest/rotation/squad.html)). Quaternion pitfalls: q and −q are the same rotation, so flip each key into the previous key's hemisphere (dot product ≥ 0) before interpolating, or the camera takes the long way round.

**When yaw/pitch/roll interpolation is fine.** A real film camera on a fluid or geared head is itself a pan-tilt(-roll) gimbal, and our poses are authored as yaw, pitch and roll. Interpolating the three angles independently with the same cubic as position is smooth and predictable provided (a) yaw is unwrapped so each key is within ±180° of the previous one (shortest arc: 170° to −170° becomes 170° to 190°, a 20° pan, not 340°), and (b) pitch stays well away from ±90°, where yaw becomes meaningless (gimbal lock) **(inferred)**. Pitch is clamped in noclip, so (b) holds for our authored shots. Roll is applied last, about the view axis, so it reads as a dutch angle independent of pan and tilt. The noclip roll is free all the way round (`src/toolkit/controls/logic/noclip.ts`), so roll should be unwrapped like yaw.

**Look-along-tangent, authored look, look-at target.** Three common modes: (1) face along the path tangent (Blender's Follow Path "Follow Curve" option ([Blender manual, Follow Path](https://docs.blender.org/manual/en/dev/animation/constraints/relationship/follow_path.html))), which suits fly-throughs but cannot pan across a room while tracking sideways; (2) authored orientation per key, interpolated (what noclip links give us, and what a dolly shot with an operator does); (3) look at a target point, itself possibly on a spline (Cinemachine's "Aim" stage, Unreal's camera Look At tracking). Mode 2 fits the owner's workflow; mode 3 is worth adding later for orbit-style shots, and the existing `title-orbit.ts` is effectively mode 3 with a fixed target. Banking into turns is a variant of mode 1: roll proportional to the path's lateral acceleration (curvature × speed²), smoothed. With authored roll there is no need for automatic banking, but it could be an additive option.

**Zoom.** A zoom ratio is multiplicative: going 1× to 2× should look like the same rate of change as 2× to 4×. Linear interpolation of zoom or FOV makes the zoom appear to speed up or slow down; interpolating the logarithm keeps it steady ([Game Developer, Logarithmic interpolation](https://www.gamedeveloper.com/programming/logarithmic-interpolation); [gamedev.net, equation for zooming](https://www.gamedev.net/forums/topic/666225-equation-for-zooming)). Tools differ on what they interpolate: KeyShot interpolates FOV linearly, giving non-linear focal length ([KeyShot forum](https://community.keyshot.com/forum/t/dolly-zoom-keyframe/8474)). Since magnification is proportional to focal length (and to 1/tan(FOV/2)), interpolate log(zoom), equivalently log focal length, then derive FOV **(inferred)**. For small zoom ranges the difference from linear is slight.

## 4. How engines and tools do it

**Unreal Engine.** The Camera Rig Rail is a spline actor with a mount point; Sequencer keys its "Current Position on Rail", normalised 0–1 along the rail, while camera rotation and focal length are separate tracks ([UE 4.27, Camera Rig Rail](https://docs.unrealengine.com/4.27/AnimatingObjects/Sequencer/Cameras/CameraRigRail); [UE5, camera jibs and dollies](https://dev.epicgames.com/documentation/en-us/unreal-engine/camera-jibs-and-dollies-in-unreal-engine)). Position along the rail is driven by Sequencer's curve editor, so speed profile is authored as a curve, separate from the rail's shape: the same split as Parent's.

**Unity Cinemachine.** A Spline Dolly body puts the camera on a Unity spline (Auto knots are Catmull-Rom) at a position in Distance, Knot or Normalized units, optionally with automatic constant speed; aiming is a separate stage ([Spline Dolly](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineSplineDolly.html); [Spline Cart](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineSplineCart.html); [Cinemachine 2.x Tracked Dolly](https://docs.unity3d.com/Packages/com.unity.cinemachine@2.6/manual/CinemachineBodyTrackedDolly.html)). Spline knots carry their own rotation for roll along the track.

**Blender.** A camera follows a Bézier path via the Follow Path constraint; progress is the curve's Evaluation Time (keyed against frames, so its F-curve is the speed profile) or a 0–1 offset factor, and "Follow Curve" orients along the tangent ([Blender manual, Follow Path](https://docs.blender.org/manual/en/dev/animation/constraints/relationship/follow_path.html)).

**Source engine.** I found no Valve documentation of demo camera smoothing. The community "keyframes" script for CS:GO builds smooth camera moves from placed keyframes in game ([samisalreadytaken/keyframes](https://github.com/samisalreadytaken/keyframes)), which is the same workflow as ours (fly, drop a key, play back). Older engines did similar: Unreal 2's cinematic interpolation points could either pass through each point or treat them as anchors for a smoother curve ([Beyond Unreal / Runegame tutorial](https://www.moddb.com/tutorials/cinematicsbeetle-tutorial)).

**Further reading.** Mark Haigh-Hutchinson, _Real-Time Cameras_ (Morgan Kaufmann 2009), by the camera engineer on Metroid Prime, is the standard book on game cameras including path cameras ([listing](https://www.abebooks.com/9780123116345/Real-Time-Cameras-Guide-Game-0123116341/plp)). Torque 3D's PathCamera is a small, readable example of linear or Catmull-Rom knot traversal ([Torque 3D PathCamera](https://torque-3d.readthedocs.io/en/latest/script/class/PathCamera.html)).

**Common pattern.** Every tool separates three things: the path's shape (a spline through knots, usually Catmull-Rom or Bézier with automatic handles), the progress along it over time (an authored curve, often in distance units, with easing), and the aim (authored rotation, tangent or target). Our design should do the same.

## 5. Recommendation for this project

**Data.** Keep authored values in the units the noclip link gives, so a link pastes straight in:

```ts
/** One pose from a noclip link, at a time in the shot. */
export interface CameraKey {
  /** Seconds from the start of the shot's camera move. */
  t: number;
  x: number;
  y: number;
  z: number; // metres
  yaw: number;
  pitch: number; // degrees; yaw 0 faces north (−z)
  roll?: number; // degrees, default 0
  zoom?: number; // magnification, default 1
}

export interface CameraPath {
  keys: readonly CameraKey[]; // strictly increasing t
  /** Ease from rest at the start and to rest at the end (default both true). */
  easeIn?: boolean;
  easeOut?: boolean;
}

/** What the view needs each frame (radians, as `orbitPose` returns). */
export interface CameraSample {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  zoom: number;
}

export function samplePath(path: CameraPath, seconds: number): CameraSample;
export function parseViewLink(url: string): Omit<CameraKey, 't'>;
```

`AttractShot` gains `path?: CameraPath` beside `orbit`, and the view uses whichever is present. The pose convention must match `orbitPose` and the walker (yaw 0 faces −z, pitch up positive).

**Position.** Centripetal Catmull-Rom through the key positions, written in pure TypeScript in a new `src/toolkit/title/logic/camera-path.ts` (Barry-Goldman pyramid form, or as Hermite segments with the centripetal tangents). Ends by mirrored phantom points, as Three.js does. Guard coincident consecutive positions (a hold) with an epsilon so the knot spacing never divides by zero. Two keys give a straight line; one key a fixed camera.

**Timing.** Precompute once per path: an arc-length table per segment (e.g. 64 samples each), the cumulative distance s_i at each key, and a monotone cubic (Fritsch-Carlson) through the points (t_i, s_i), with zero end slopes when easing. To sample at time t: s = S(t), look up the segment and local parameter for distance s in the table, evaluate the curve. Result: every key reached exactly at its time, speed continuous through every key, never reversing, easing at the ends, holds by repeating a position. A shot authored with only a duration (uniform speed) is the special case t_i ∝ s_i.

**Orientation and zoom.** Unwrap yaw and roll so each key is within 180° of the previous one, then interpolate yaw, pitch, roll and log(zoom) as four scalar channels, each a cubic Hermite in time (non-uniform Catmull-Rom slopes over the key times, so angular speed is continuous through each key). The Fritsch-Carlson limiter is optional here: with it, a pan never swings past a key's angle and back; without it, moves are slightly rounder. Worth exposing as an option. This is C1, follows shortest arcs, and is simple to test. Pitch stays clear of ±90°, so gimbal lock does not arise. If a shot ever needs to pass near straight up or down, switch that channel set to quaternions with hemisphere-corrected Squad; the data shape need not change.

**Why not Three.js curves.** `logic/` must stay free of Three.js, `CatmullRomCurve3` allots equal t to unequal segments and has no time per key, and orientation and zoom need the same timing as position anyway. Three.js is only needed in the view, to apply the sample to the camera (Euler order YXZ for yaw, pitch, then roll about view Z, as the walker does).

**Tests (`camera-path.test.ts`, vite-plus/test).**

- At each key's time the sample equals that key (position to 1e-6 m, angles to 1e-6°, zoom).
- Yaw from 170° to −170° passes through 180°, never 0°; roll likewise.
- Speed is continuous at interior keys: finite-difference speed just before and just after each key agrees within a small tolerance, and the velocity direction agrees.
- Distance travelled is monotone in time (no backing up), including with very uneven key spacing in time.
- With ease-in and ease-out, speed at t = 0 and t = end is ~0; without, it is not.
- Collinear keys produce a straight path with no overshoot past the last key.
- A uniform-spacing case (equal distances, equal times) moves at constant speed within 1 %.
- A short segment between two long ones (the classic uniform Catmull-Rom loop case) produces no reversal of the tangent direction.
- Two keys at zoom 1 and 4: the midpoint zoom is 2 (geometric mean).
- `parseViewLink` round-trips a link produced by noclip's own copy-link code.
- Times before the first key clamp to it; after the last, to the last.

**Possible later additions.** Per-key tension (Kochanek-Bartels) for tighter or looser bends; a look-at target channel for orbit-like shots; automatic banking added to authored roll; a "pass near, not through" B-spline mode for hand-held-looking drift.

## 6. Sources

- Yuksel, Schaefer, Keyser, On the Parameterization of Catmull-Rom Curves: https://cemyuksel.com/research/catmullrom_param/ and https://people.engr.tamu.edu/schaefer/research/catmull_rom.pdf
- splines (Python) documentation, Catmull-Rom properties: https://splines.readthedocs.io/en/0.3.0/euclidean/catmull-rom-properties.html
- splines, re-parameterization: https://splines.readthedocs.io/en/latest/euclidean/re-parameterization.html
- splines, Squad: https://splines.readthedocs.io/en/latest/rotation/squad.html
- Weinkauf, Bézier splines: continuity: https://www.csc.kth.se/~weinkauf/notes/beziersplinecontinuity.html
- Freya Holmér, The Continuity of Splines: https://classcentral.com/classroom/youtube-the-continuity-of-splines-129118
- Kochanek–Bartels spline: https://en.wikipedia.org/wiki/Kochanek%E2%80%93Bartels_spline ; original paper: https://history.siggraph.org/learning/interpolating-splines-with-local-tension-continuity-and-bias-control-by-kochanek-and-bartels/ ; NCCA notes: https://nccasymposium.bournemouth.ac.uk/2005/mscca/AHERNE_html/splines.html
- Monotone cubic interpolation: https://en.wikipedia.org/wiki/Monotone_cubic_interpolation
- Parent, Computer Animation, ch. 3: https://web.cse.ohio-state.edu/~parent.1/classes/683/Lectures/chapter03.pdf ; arc length notes: https://research.cs.wisc.edu/graphics/Courses/cs-838-1999/Papers/Parent/parent4.pdf
- SIGGRAPH HyperGraph, slow in and out: https://education.siggraph.org/static/HyperGraph/animation/character_animation/principles/slow_in_and_out.htm
- Shoemake, Animating Rotation with Quaternion Curves (1985): https://history.siggraph.org/?p=107413 ; Ramamoorthi and Barr: https://cseweb.ucsd.edu/%7Eravir/quaternion.pdf
- three.js CatmullRomCurve3: https://threejs.org/docs/pages/CatmullRomCurve3.html ; Curve: https://threejs.org/docs/pages/Curve.html ; source: https://raw.githubusercontent.com/mrdoob/three.js/dev/src/extras/curves/CatmullRomCurve3.js ; forum: https://discourse.threejs.org/t/getutotmapping-cannot-get-the-correct-progress/13380
- Unity Splines tangent modes: https://docs.unity3d.com/Packages/com.unity.splines@2.3/manual/tangent-modes
- Cinemachine Spline Dolly: https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineSplineDolly.html ; Spline Cart: https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineSplineCart.html ; Spline Smoother: https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineSplineSmoother.html ; Tracked Dolly (2.x): https://docs.unity3d.com/Packages/com.unity.cinemachine@2.6/manual/CinemachineBodyTrackedDolly.html
- Unreal Camera Rig Rail: https://docs.unrealengine.com/4.27/AnimatingObjects/Sequencer/Cameras/CameraRigRail ; jibs and dollies: https://dev.epicgames.com/documentation/en-us/unreal-engine/camera-jibs-and-dollies-in-unreal-engine
- Blender Follow Path constraint: https://docs.blender.org/manual/en/dev/animation/constraints/relationship/follow_path.html
- CS:GO keyframes script: https://github.com/samisalreadytaken/keyframes
- Unreal 2 cinematics tutorial: https://www.moddb.com/tutorials/cinematicsbeetle-tutorial
- Mapillary viewer improvements: https://blog.mapillary.com/news/2015/09/30/viewer-improvements.html
- Logarithmic interpolation: https://www.gamedeveloper.com/programming/logarithmic-interpolation ; gamedev.net zoom: https://www.gamedev.net/forums/topic/666225-equation-for-zooming ; KeyShot forum: https://community.keyshot.com/forum/t/dolly-zoom-keyframe/8474
- Haigh-Hutchinson, Real-Time Cameras: https://www.abebooks.com/9780123116345/Real-Time-Cameras-Guide-Game-0123116341/plp
- Torque 3D PathCamera: https://torque-3d.readthedocs.io/en/latest/script/class/PathCamera.html
