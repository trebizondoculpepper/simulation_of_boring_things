# Full-motion video on in-game screens

Status: research only (2026-10-27, for the owner). Nothing implemented; no code changed. Facts about this repository were read at `cf7eb55`; facts about Three.js were read from the installed `three@0.186.1` sources (`node_modules/three/src/textures/VideoTexture.js`, `VideoFrameTexture.js`); the GitHub Pages range-request behaviour was checked with `curl` against the live site. Anything marked **(guess)** is reasoning, not a measurement.

## Contents

- The question
- Short answer
- How screens are built today
- Three.js: VideoTexture and its alternatives
- Autoplay, sound and the first click
- Formats, codecs and encoding
- Hosting on GitHub Pages
- Rights and credits
- Making it look like a screen
- A screen with sources: the component
- Performance
- Risks
- Recommended approach, step by step
- Minimal proof of concept
- Open questions for the owner
- Sources

## The question

The owner (2026-10-27): is it possible to inject two-dimensional full-motion video into the game, so video files play on one of the in-game screens, as if it were a television (or the control room's main viewscreen, the CCTV monitors and so on)? Find out if it is possible and how we would do it.

## Short answer

- **Yes, and it is cheap and well trodden.** A hidden `<video>` element is the source of a `THREE.VideoTexture`, put on the screen's mesh as an unlit (`MeshBasicMaterial`, `toneMapped: false`) map, exactly as the CCTV monitor shows its `DataTexture` today. The browser's hardware decoder does the work; Three.js 0.186 uploads a new frame only when the video has one (it uses `requestVideoFrameCallback`), so a 25 fps clip costs 25 small uploads a second, not 60.
- **Muted video can start by itself; sound needs the first click.** The game already has the gesture (click to start, pointer lock) and an audio output that starts on it (`src/toolkit/components/core/audio/part-audio.ts`). The music playlist already streams an `<audio>` element into that output through `createMediaElementSource` (`src/toolkit/components/sound/audio/music-playlist.ts`); a TV's sound is the same pattern with a `<video>`, positioned by the output's existing `PannerNode`. Use that, not `THREE.PositionalAudio`, which would bring a second audio context and listener.
- **Encode H.264 in MP4 (`+faststart`), small: 640 × 360 or 854 × 480, 25 fps, about 0.6–1.2 Mbit/s, keyframe every 2 s.** That plays everywhere (Chrome, Firefox, Safari desktop and iOS). A 30-second loop is about 2.5–4.5 MB. WebM (VP9/AV1) can be offered as an extra `<source>` but is not needed.
- **GitHub Pages is fine for a handful of short clips.** It serves byte ranges (checked: `206 Partial Content`), which Safari needs for video. Limits that matter: a 1 GB published site, a soft 100 GB/month bandwidth, git's 100 MB per file. Put clips in `public/video/` with relative paths (as `public/posters/` is), or import them with `new URL(…, import.meta.url)` (as the audio is). No LFS, no CDN, no HLS for now.
- **Only footage we own or that is openly licensed**, recorded in `CREDITS.md`: public domain (Prelinger, NASA), CC0, CC-BY (Blender's open films, much of Wikimedia Commons), or our own (recorded from the game, rendered, or drawn procedurally). Avoid Pexels and Pixabay files in the repository: their licences forbid redistributing the files as they are, which a public GPL repository and its Pages site do.
- **Recommended:** one screen component with sources (off, no signal, a video channel, a CCTV camera, a `ui2d` panel), its channel state in pure logic, its picture drawn by a view; a channel's playback position derived from the world clock so it behaves like a broadcast; videos paused whenever no screen showing them is drawn. Proof of concept: one muted, looping MP4 on a TV in a dev room, sound joining on the first click: about half a day to a day. The full component with channels, CRT look and the control-room viewscreen: about 3–5 days **(guess)**.

## How screens are built today

- **Canvas textures.** Lettering, LCDs, mimics and dials are 2D canvases wrapped in `CanvasTexture` by `createCanvasTexture` (`src/toolkit/components/core/views/screens.ts:4`), sRGB, anisotropy 8, redrawn and flagged `needsUpdate` when they change. The new `ui2d` kit (`src/ui2d/`, prompt 093 stage 1) paints a touch-panel tree to a canvas only while `needsPaint`.
- **CCTV.** A camera in one room renders the scene to a small viewport at 12.5 Hz and reads it back with `gl.readPixels` (`src/toolkit/gallery/rooms/water-room.ts:400-460`); the frame (96 × 72 RGBA) goes through a pure in-memory network (`src/toolkit/components/security/logic/cctv-signal.ts`); a monitor in another room copies it, with BRIGHT and CONTRAST, or snow when the signal has gone, into a `DataTexture` with `NearestFilter`, shown on `MeshBasicMaterial({ map, toneMapped: false })` (`src/toolkit/components/security/views/cctv.ts:139-262`). The readback exists because **every room has its own canvas and its own `WebGLRenderer`** (`src/main.ts:968-993`, `createRenderer` in `src/toolkit/components/core/parts/render-style.ts:104`), and a GPU texture cannot be shared between WebGL contexts.
- **Rooms' lifecycle.** A built room stays alive, hidden, and the shell calls its handle's `suspend()` when the player leaves and `resume()` when they return (`src/main.ts:138-144`, `1214`, `1272`, `1308`). A room may also be run unseen when another room watches it (`pool-plant:run-room`, `src/main.ts:995-1010`).
- **Audio.** One `AudioContext` for the game, started on the first gesture, with a `PannerNode` per placed sound (`part-audio.ts:105-170`); the listener follows the camera (`partAudio.listen`). Long sounds are `LoopRecipe`s; the music playlist streams a hidden `<audio>` element through `createMediaElementSource` into that output, and its transport (track, position) lives in pure logic (`src/toolkit/components/sound/logic/music-source.ts`).
- **Performance work in hand.** `doc/research/display-only-updates.md` found that displays which re-upload every frame (the CCTV monitor among them) cost more than the world model, and proposes redraw-on-change, throttling, and distance and frustum gating. `doc/research/graphics-quality-presets.md` lists GTAO and bloom as the heavy passes. Video fits that picture: its upload is already "on change" (one per decoded frame), and it should be gated the same way.

Video therefore plugs in at the same place as the CCTV monitor's `DataTexture`: a texture on an unlit screen mesh. It is actually easier than CCTV across rooms, because an `HTMLVideoElement` is not tied to a WebGL context: two rooms' renderers can each make a `VideoTexture` from the same element with no readback.

## Three.js: VideoTexture and its alternatives

**`VideoTexture`** (installed source, `three/src/textures/VideoTexture.js`): its constructor sets `generateMipmaps = false`, defaults `minFilter` and `magFilter` to `LinearFilter`, and, where the browser has `requestVideoFrameCallback` (rVFC), registers a callback that sets `needsUpdate = true` each time the video presents a new frame and re-registers itself. Without rVFC, `update()` (called by the renderer each frame the texture is used) flags it whenever `readyState >= HAVE_CURRENT_DATA`, which re-uploads every rendered frame. rVFC is in Chrome and Edge (83+), Safari (15.4+) and Firefox (132+), so the fallback is only for old browsers. `dispose()` cancels the callback and frees the GPU texture.

Settings that matter:

| Setting                                    | Use                                             | Why                                                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `colorSpace`                               | `SRGBColorSpace`                                | Video is encoded in sRGB-like BT.709; without it the picture looks washed out under the renderer's linear workflow. Same as `createCanvasTexture` and the CCTV texture.        |
| `minFilter` / `magFilter`                  | `LinearFilter` (defaults)                       | Mipmaps would need regenerating on every frame upload; leave `generateMipmaps` false. Encode the video near the size it is seen at instead, so minification aliasing is small. |
| `magFilter` for a deliberately blocky look | `NearestFilter`                                 | As the CCTV monitor does, for a low-resolution feed.                                                                                                                           |
| `anisotropy`                               | 1–4                                             | Helps a screen seen at a steep angle; cheap.                                                                                                                                   |
| material                                   | `MeshBasicMaterial({ map, toneMapped: false })` | Unlit, so the picture glows the same whatever the room's lighting, and is not tone-mapped twice; bloom will pick up its bright parts.                                          |

**`VideoFrameTexture`** (in 0.186): a `VideoTexture` whose `setFrame(frame)` takes a WebCodecs `VideoFrame` (or anything `texImage2D` accepts) and flags an upload. It is for when we decode ourselves with WebCodecs (`VideoDecoder`), for example from a demuxed MP4, to get frame-exact seeking, decoding in a worker, or many streams from one file. It needs a demuxer (mp4box.js or similar), frames must be `close()`d promptly or the decoder stalls, and Safari's WebCodecs arrived later than Chrome's. Not worth it for TVs: the `<video>` element already decodes in hardware, loops, buffers and syncs its sound.

**Several videos at once.** Each playing `<video>` is one decoder. Desktop browsers handle several small ones easily; mobile browsers limit simultaneous hardware decoders (Chrome on Android caps concurrent media players, and iOS has historically allowed only one video _with sound_ to play at a time; muted inline videos may play together). Keep at most about four distinct clips playing, and share: **one `<video>` per clip, however many screens show it**. In one room, one `VideoTexture` can be the `map` of several screens' materials (one upload a frame). Across rooms, each room's renderer needs its own `VideoTexture` from the same element.

**Pausing.** A paused video costs nothing but its memory; a playing one decodes even when nobody sees it, and `requestVideoFrameCallback` keeps flagging uploads (which only happen if a renderer draws the texture). Pause when: the screen is off; the room is suspended (its `suspend()`); the screen is far away or out of the frustum (the display-only-updates gating); the tab is hidden (browsers throttle this themselves, but pausing keeps the clock honest). Resume by seeking to where the channel's broadcast clock says it should be (see the component below), so pausing is invisible.

**Disposal.** `texture.dispose()` (cancels rVFC, frees GPU memory); then `video.pause()`, `video.removeAttribute('src')`, `video.load()` to release the decoder and its buffers; remove the element from the document. A `MediaElementAudioSourceNode` cannot be re-attached to another context, so keep one element per clip for the session rather than recreating it.

## Autoplay, sound and the first click

- **Muted autoplay is allowed everywhere** (Chrome, Firefox, Safari): `video.muted = true` (set the property, and the `muted` attribute), `autoplay` or a scripted `play()`, `loop`, and `playsInline = true` (the `playsinline` attribute), without which iOS Safari takes the video full screen. `play()` returns a promise; catch its rejection and try again on the next gesture.
- **Sound needs a user gesture** (a click, tap or key press; Chrome also allows it after a site has earned media engagement, but we cannot rely on that). The game already starts its `AudioContext` on the first gesture (`part-audio.ts:105-152`), and pointer lock is itself a click.
- **Route the video's sound through the game's audio, not the element.** `context.createMediaElementSource(video)` takes over the element's output: the sound then plays only through the Web Audio graph, so the element can stay `muted = false` but silent until the context runs, and the TV is heard from where it stands through the output's `PannerNode`, with the game's master volume and pause. This is exactly how `musicPlaylist` streams music today, as a `LoopRecipe`. When the context is suspended (before the first gesture) the video simply plays in silence; sound "joins" on the first click with no extra code. Two caveats: an element can feed only one `MediaElementAudioSourceNode` ever; and Safari has had bugs where a `MediaElementAudioSourceNode` stays silent unless the element was played after the context resumed **(guess, from reports)**, so call `video.play()` again in the gesture handler.
- **`THREE.PositionalAudio` + `THREE.AudioListener`** would also work (`setMediaElementSource(video)`), but `AudioListener` uses Three's own shared `AudioContext` (`THREE.AudioContext.getContext()`), a second audio graph and listener beside `partAudio`'s. Only consider it if `partAudio` is retired; otherwise `partAudio`'s placed panner is the consistent choice. A TV's speaker is better heard with `distanceModel: 'inverse'` and a small `refDistance` (as `placed` already sets), and could have a low-pass to sound like a small cabinet speaker.
- **Same origin or CORS.** WebGL refuses to upload a cross-origin video without CORS, and `createMediaElementSource` outputs silence for one. From our own Pages site there is no problem; from a CDN set `video.crossOrigin = 'anonymous'` and serve `Access-Control-Allow-Origin`.

## Formats, codecs and encoding

| Codec / container   | Chrome             | Firefox                  | Safari macOS                          | Safari iOS                   | Notes                                                                                   |
| ------------------- | ------------------ | ------------------------ | ------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| H.264 (AVC) in MP4  | Yes                | Yes (via the OS decoder) | Yes                                   | Yes                          | The one safe choice; hardware-decoded nearly everywhere.                                |
| VP9 in WebM         | Yes                | Yes                      | Yes in recent versions                | Recent versions, patchy      | Smaller than H.264 at equal quality; offer as a second `<source>` only if size matters. |
| AV1 in MP4/WebM     | Yes                | Yes                      | Only with AV1 hardware (M3 and later) | Only iPhone 15 Pro and later | Smallest; software decode is heavy on older machines. Not yet.                          |
| HEVC (H.265) in MP4 | Hardware-dependent | Limited                  | Yes                                   | Yes                          | Patent-encumbered, uneven; not worth it.                                                |

Recommended encode for an in-game screen (ffmpeg):

```sh
ffmpeg -i source.mov \
  -vf "scale=640:-2,fps=25" \
  -c:v libx264 -profile:v main -preset slow -crf 26 -maxrate 1.2M -bufsize 2.4M \
  -g 50 -keyint_min 50 -sc_threshold 0 -pix_fmt yuv420p \
  -c:a aac -b:a 96k -ac 1 \
  -movflags +faststart \
  public/video/clip.mp4
```

- **Resolution.** A TV that fills a fifth of the view on a 1080p display is about 400 px across; 640 × 360 (16:9) or 640 × 480 (4:3) is plenty, and a CRT look hides more. Use 854 × 480 or 1280 × 720 only for the control room's big viewscreen.
- **Frame rate.** 25 fps (UK PAL heritage, fits the setting) or the source's own; lower (12.5 fps) for CCTV-like footage.
- **Bitrate and size.** About 0.6–1.2 Mbit/s for 360p–480p: 30 s ≈ 2.5–4.5 MB, 2 min ≈ 10–18 MB. Mono AAC at 96 kbit/s (a TV speaker), or strip audio (`-an`) for silent screens.
- **Keyframes.** A fixed GOP (`-g 50`, every 2 s) makes seeking (for channel changes and resuming at the broadcast clock) quick.
- **`+faststart`** moves the MP4's index (`moov`) to the front, so playback starts before the whole file has arrived.
- **`yuv420p`, Main profile**, for the widest hardware support.
- **Seamless looping.** `loop` on the element works but some browsers show a small hitch at the wrap (the decoder restarts at the first keyframe). Make clips whose last frame leads into the first (cut on a matching frame, or cross-fade the end into the start before encoding), start the file on a keyframe, and keep audio the same length as video (trim to whole AAC frames, or fade the audio at both ends). If a hitch remains, two elements alternating (A plays while B is seeked to 0; swap at the end) removes it, at the cost of a second decoder.

## Hosting on GitHub Pages

- **Limits** (GitHub's documentation): published site at most 1 GB; source repository recommended under 1 GB; soft bandwidth limit 100 GB a month; deployments time out after 10 minutes. Git itself rejects files over 100 MB and warns over 50 MB. The repository's pack is about 64 MB now, so a few tens of MB of video is comfortable; hundreds of MB is not.
- **Bandwidth arithmetic.** 100 GB a month is about 25,000 downloads of a 4 MB clip. Browsers cache it (Pages sends `cache-control: max-age=600` plus an ETag, so repeat visits revalidate rather than re-download). With `preload="none"` or `"metadata"` a clip is fetched only when a screen showing it first plays.
- **Range requests.** Checked on the live site: `curl -H 'Range: bytes=0-99' https://trebizondoculpepper.github.io/the_pool/posters/01.jpg` returns `206 Partial Content` and `accept-ranges: bytes`. Safari will not play video from a server that does not honour ranges; Pages does.
- **Git LFS.** Pages built from a branch does not serve LFS objects (it serves the pointer files). This project deploys with a GitHub Actions workflow (`upload-pages-artifact`, `deploy-pages`), so `actions/checkout` with `lfs: true` would put the real files into the artifact; but every CI run would then spend the account's limited LFS bandwidth. Not worth it while clips are small: commit them normally.
- **Vite.** Two ways, both already used here and both safe with `base: './'`:
  - `public/video/clip.mp4`, referenced as the relative string `'video/clip.mp4'` (as `corridor-posters.ts:75` loads `posters/01.jpg`). Copied as is, unhashed; good for large files and a list of channels built from data.
  - `new URL('./assets/clip.mp4', import.meta.url)` beside the component (as the door and button sounds are). Vite treats `.mp4` and `.webm` as assets, hashes the name (cache-busting) and rewrites the URL relative to the bundle. Good for a clip owned by one component.
  - Never `import clip from './clip.mp4?inline'`: base64 in the bundle.
- **Alternatives.** A CDN or object store (Cloudflare R2, Bunny, a DigitalOcean Space for this personal project) only when clips outgrow the repository; it needs CORS headers (see above) and adds a second deploy. **HLS with hls.js** (adaptive bitrate, segmenting) is for long or live streams over variable networks; for short loops seen on a small in-game screen it adds a library, a segmenting step and Safari/other-browser differences (Safari plays HLS natively, others need hls.js over MSE) for no visible gain. Not worth it.

## Rights and credits

The program is GPL-3.0; media keep their own licences, listed in `CREDITS.md` with author, source and licence, and credited wherever the game is distributed (README, "Licence"). The same goes for video.

| Source                                                              | Licence                                 | Fit                                                                                                                                                                              |
| ------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Our own: recorded from the game, rendered, drawn procedurally       | Ours (GPL, or CC-BY-SA if we prefer)    | Best. CCTV-like views of our own rooms, test cards, idents, a "pool safety" information film made in-engine.                                                                     |
| Prelinger Archives (Internet Archive)                               | Public domain (most items)              | Good for period television: 1940s–70s industrial and educational films. Check each item's stated rights; not everything on the Internet Archive is free.                         |
| NASA                                                                | Generally public domain (US government) | Good; no implied endorsement, and some NASA-hosted footage is third-party.                                                                                                       |
| Wikimedia Commons                                                   | Per file: PD, CC0, CC-BY, CC-BY-SA      | Good; read each file's licence; CC-BY(-SA) needs author, title, licence and link.                                                                                                |
| Blender open films (Big Buck Bunny, Sintel, Tears of Steel, Spring) | CC-BY                                   | Good television fodder; credit the Blender Foundation.                                                                                                                           |
| Pexels, Pixabay                                                     | Own licences, attribution optional      | Avoid in the repository: both forbid redistributing the files unaltered or as stock, which a public repository and website do. Use only re-edited in-game recordings, if at all. |
| Broadcast television, YouTube, films                                | Copyright                               | Never.                                                                                                                                                                           |

Generating our own is attractive here: `canvas.captureStream(25)` + `MediaRecorder` records any room's canvas to WebM in the browser (convert to H.264 with ffmpeg); or render a sequence of screenshots offline and assemble them. A procedural "channel" (a test card, a clock, an ident, scrolling teletext) is better drawn live with the `ui2d` kit or a canvas than encoded as video at all.

## Making it look like a screen

- **Glow.** `MeshBasicMaterial({ map, toneMapped: false })`: unlit, so the picture is the same in a dark room as a lit one, and the rooms' `UnrealBloomPass` will bloom its brightest parts slightly, as a real screen does. Scale `color` below white (say `#d0d0d0`) for a dimmer LCD; a BRIGHT knob can drive `color` as the CCTV monitor's does.
- **Aspect ratio and letterboxing.** Make the screen mesh's UVs fit the video's `videoWidth / videoHeight` (known on `loadedmetadata`) inside the screen's own aspect: pillarbox 4:3 on a 16:9 panel, letterbox 16:9 on a 4:3 CRT, by setting `texture.repeat` and `texture.offset` with `wrapS/wrapT = ClampToEdgeWrapping` and a black border colour from the shader, or by sizing a child plane. A pure helper (`fitRect(source, screen)`) belongs in a `logic/` folder.
- **CRT.** A small `ShaderMaterial` (or `onBeforeCompile` on the basic material) on the screen mesh only, not a full-screen post pass: barrel distortion of the UV (curvature) with black outside, horizontal scanlines (`sin(uv.y * lines * π)`), an aperture-grille or shadow-mask RGB pattern at the screen's pixel pitch, a vignette, a slight horizontal blur and chroma bleed, and noise. The CCTV monitor's slightly domed glass and its `snow` already set the tone. Cost: one fragment shader over a few thousand screen pixels; negligible.
- **LCD / LED panel.** A faint pixel grid (`step` on `fract(uv * resolution)`), slight backlight bleed, and a viewing-angle falloff (darken and shift contrast with the view angle, from `dot(normal, viewDir)`).
- **No signal.** A screen whose source is missing or not yet ready shows the CCTV's snow (shader noise or the existing `snow` function), a blue "NO SIGNAL" card (a canvas texture), or black for "off"; the video's `waiting`/`stalled` events and `readyState` say when to fall back. A pure `signalOf(state)` decides which.
- **Channel switching.** On a change: a short burst of snow and a roll (a vertical offset that settles, in the shader) while the new source seeks to its broadcast time and reports `seeked`; a click and a speaker thump from `partAudio`.

## A screen with sources: the component

The project's rules point to one shape: state in pure logic, a view that only shows it, input through the parts that already use the control scheme, and the world state for anything that must survive leaving the room.

- **Logic** (`src/toolkit/components/security/logic/` or a new `components/av/logic/`): a `ScreenState` (`power`, `channel`, `volume`, `brightness`) and a channel list where each channel is one of `{ kind: 'video', clip }`, `{ kind: 'cctv', camera }`, `{ kind: 'panel', panel }` or `{ kind: 'none' }`; pure functions `selectChannel`, `nextChannel`, `signalOf(state, sourceReady)`, `fitRect`, and **`broadcastTime(clip, worldSeconds) = worldSeconds mod duration`**, so every screen on a channel shows the same moment, as if broadcast, and a paused or newly built screen resumes in the right place. Tested beside it. This mirrors `music-source.ts`'s transport.
- **World state.** If the owner wants a TV's channel or power to persist across rooms and reloads, it goes in the world (`src/game/world.ts`, bump `WORLD_VERSION`, add a migration). Playback position does not need saving: it is derived from the world clock.
- **A video library** (view side, one per page): `videoLibrary.acquire(clip)` returns the shared `<video>` element, created on first use (`muted`, `playsInline`, `loop`, `preload="metadata"`), reference-counted by screens that are actually being drawn; it plays while any holder is active and pauses when none is; `release` disposes after a grace period. Each room asks it for a `VideoTexture` per renderer. Its sound is a `LoopRecipe` fed to `partAudio` from the screen's position.
- **The screen view**: the mesh, the material (basic, CRT or LCD variant), and a `show(now)` like the CCTV monitor's that picks the texture for the current source: the `VideoTexture`, the CCTV `DataTexture`, or a `ui2d` panel's `CanvasTexture`; snow or the no-signal card otherwise.
- **Controls.** The set's own parts: `pushButton` for POWER and CHANNEL ▲▼ (or numbered buttons for a 1980s set, a rotary detent knob for an older one), `potentiometer` for VOLUME and BRIGHT, as the CCTV monitor already does; for a control-room viewscreen, a video switcher panel of illuminated push buttons (the owner's rule for boards shown in two places), one per source, tried on dev0's boards first and in dev39 when assembled. No new key bindings: everything through `src/toolkit/controls/`.
- **Engineering rule.** A TV in a staff room is near set decoration; a CCTV monitor, a video matrix switcher or the control room's viewscreen is engineering and must be a real, working, branded product (`brands.ts`), with the sources it switches real.

## Performance

- **Decode** is in hardware for H.264 almost everywhere: a few per cent of a core per 480p stream **(guess)**. It happens only while the element plays.
- **Upload** is one `texImage2D` per decoded frame per renderer drawing it: at 640 × 360 and 25 fps about 23 MB/s of texels, often GPU to GPU in Chrome and Safari. Compare the CCTV monitor today, which uploads a CPU-built frame on every rendered frame (60 a second) and costs a `readPixels` stall in the camera's room. A video screen is cheaper than the existing CCTV.
- **Keep it cheap:** encode near display size; one `<video>` per clip shared by all screens; one `VideoTexture` per clip per room; pause when off, when the room is suspended, out of range (about 5 m for a small TV, farther for the viewscreen) or out of the frustum; at most about four clips playing at once (mobile decoder limits); no mipmaps; `preload="none"` until first shown; expose a "screens animate" option in the graphics presets (a still frame when off).
- **Memory.** A 480p `VideoTexture` is about 1.6 MB of GPU memory per renderer; the element's buffer a few MB. Negligible beside the room scenes.

## Risks

| Risk                                                                          | Likelihood | Mitigation                                                                                                   |
| ----------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| iOS Safari: full-screen takeover, one audible video at a time, decoder limits | Medium     | `playsinline`; route sound through Web Audio; share elements; cap concurrent clips.                          |
| Safari `MediaElementAudioSourceNode` silence quirks                           | Medium     | Re-`play()` in the gesture handler; test on a real iPhone early (step 1).                                    |
| Seam at the loop point                                                        | Medium     | Encode loops carefully; fall back to two alternating elements.                                               |
| Repository growth                                                             | Low–medium | Short clips, small encodes; a size budget (say 50 MB of video in total) in the reuse inventory or CREDITS.   |
| Licence mistakes                                                              | Low        | Only PD/CC0/CC-BY or our own; every file in `CREDITS.md` before commit.                                      |
| "Screens within screens" taking over the instruments                          | Low        | The owner's period rule stands: TVs and the viewscreen are a kind of display among many, not a SCADA screen. |
| Cross-origin if moved to a CDN                                                | Low        | `crossOrigin = 'anonymous'` and CORS headers.                                                                |

## Recommended approach, step by step

1. **Proof of concept** (below) in one dev room, tested on Chrome, Firefox, Safari macOS and an iPhone. Half a day to a day.
2. **Pure logic**: `ScreenState`, channels, `signalOf`, `fitRect`, `broadcastTime`, with tests. Half a day.
3. **Video library and screen view**: shared elements, per-renderer textures, reference-counted play/pause wired to `suspend`/`resume` and distance/frustum, disposal; sound as a `LoopRecipe` through `partAudio`. One day.
4. **Looks**: CRT and LCD materials, letterboxing, snow, no-signal card, channel-change roll. One day.
5. **Sources**: CCTV feed and a `ui2d` panel as channels beside video; a switcher panel for the control room, tried on dev0 and dev39. One to two days.
6. **Content**: a first test card, ident and a couple of clips (our own or PD), encoded per the settings above, credited. Ongoing.
7. **Placement**: a staff-room TV, the control room's viewscreen, CCTV monitors through the same component; channel state into the world if the owner wants it to persist.

Total for steps 2–5: about 3–5 days **(guess)**, plus content.

## Minimal proof of concept

One muted, looping MP4 on a TV in a dev room, sound joining on the first click. In outline (view code, not pure logic):

```ts
import {
  MeshBasicMaterial,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
  VideoTexture,
} from 'three';

const video = document.createElement('video');
video.src = 'video/test-card.mp4'; // public/video/test-card.mp4, relative to base './'
video.muted = true; // muted autoplay is allowed everywhere
video.loop = true;
video.playsInline = true; // no full-screen takeover on iOS
video.preload = 'auto';
video.hidden = true;
document.body.append(video);
void video.play().catch(() => {}); // retried on the first gesture

const texture = new VideoTexture(video); // uploads on each new frame (rVFC)
texture.colorSpace = SRGBColorSpace;
const screen = new Mesh(
  new PlaneGeometry(0.64, 0.36),
  new MeshBasicMaterial({ map: texture, toneMapped: false }),
);

// Sound: a LoopRecipe through partAudio, from the screen's position, like musicPlaylist:
//   const input = context.createMediaElementSource(video); input.connect(gain).connect(out);
//   video.muted = false; void video.play();
// It is silent until the game's AudioContext runs, which it does on the first click.

// Room suspend/resume: video.pause() / video.play(); dispose: texture.dispose(),
// video.pause(), video.removeAttribute('src'), video.load(), video.remove().
```

Acceptance: the picture plays on load with no click; sound starts from the TV's position on the first click and pans as the player walks round it; leaving the room pauses it (check `video.paused`); frame time unchanged within noise on the frame-time readout; works on an iPhone without going full screen.

## Open questions for the owner

1. Which screen first: a staff-room television, the control room's main viewscreen, or the CCTV monitors?

## Sources

- Three.js `VideoTexture` and `VideoFrameTexture`, installed `three@0.186.1` sources; docs: https://threejs.org/docs/#api/en/textures/VideoTexture
- Three.js manual, colour management: https://threejs.org/manual/#en/color-management
- `requestVideoFrameCallback`: https://web.dev/articles/requestvideoframecallback-rvfc and https://caniuse.com/wf-request-video-frame-callback (Firefox 132+)
- WebCodecs: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
- Autoplay guide (MDN): https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- Chrome autoplay policy: https://developer.chrome.com/blog/autoplay
- WebKit video policies for iOS (muted autoplay, `playsinline`): https://webkit.org/blog/6784/new-video-policies-for-ios/
- `createMediaElementSource`: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource
- Three.js `PositionalAudio`: https://threejs.org/docs/#api/en/audio/PositionalAudio
- Media container and codec guides (MDN): https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs
- Apple AV1 support (M3, iPhone 15 Pro): https://bitmovin.com/blog/apple-av1-support
- ffmpeg H.264 guide: https://trac.ffmpeg.org/wiki/Encode/H.264
- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- GitHub large files: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
- Vite static asset handling and `public/`: https://vite.dev/guide/assets
- hls.js: https://github.com/video-dev/hls.js
- Prelinger Archives: https://archive.org/details/prelinger
- NASA media usage guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/
- Wikimedia Commons reuse: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- Blender open movies: https://studio.blender.org/films/
- Pexels licence: https://www.pexels.com/license/ ; Pixabay content licence: https://pixabay.com/service/license-summary/
- `MediaRecorder` and `captureStream`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
