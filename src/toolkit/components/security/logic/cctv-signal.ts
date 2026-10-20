/**
 * The CCTV's video signal: what each camera is sending down its cable,
 * and who is watching it. A camera in one room transmits its picture, a
 * small RGBA frame, as often as it sends one; a monitor in another room
 * receives the latest, and shows snow when none has come for a while, as
 * a monitor does whose camera has lost its power or its cable. A monitor
 * watching a camera says so, so that a camera in a room nobody is in
 * keeps sending only while somebody watches. Pure: frames are plain
 * arrays, and time is passed in.
 */

export interface VideoFrame {
  width: number;
  height: number;
  /** Its pixels, RGBA, rows from the bottom up (as WebGL reads them). */
  data: Uint8Array;
  /** When it was sent, seconds. */
  at: number;
}

/**
 * The picture's size: a CCTV camera's 4:3 picture, 1536 × 1152 lines'
 * worth, sent at 1/16 of it.
 */
export const FEED = { width: 96, height: 72 } as const;
/** Frames a second a camera sends while watched. */
export const FEED_RATE = 12.5;
/** How long without a frame before a monitor loses the signal, seconds. */
export const SIGNAL_TIMEOUT = 1;

export interface CctvNetwork {
  transmit(camera: string, frame: VideoFrame): void;
  /** The latest frame from `camera`, if it is still live at `now`. */
  receive(camera: string, now: number): VideoFrame | null;
  /** Start watching `camera`; the function returned stops. */
  watch(camera: string): () => void;
  watched(camera: string): boolean;
}

export function createCctvNetwork(): CctvNetwork {
  const frames = new Map<string, VideoFrame>();
  const watchers = new Map<string, number>();
  return {
    transmit(camera, frame) {
      frames.set(camera, frame);
    },
    receive(camera, now) {
      const frame = frames.get(camera);
      return frame && now - frame.at <= SIGNAL_TIMEOUT ? frame : null;
    },
    watch(camera) {
      watchers.set(camera, (watchers.get(camera) ?? 0) + 1);
      let watching = true;
      return () => {
        if (!watching) return;
        watching = false;
        watchers.set(camera, (watchers.get(camera) ?? 1) - 1);
      };
    },
    watched: (camera) => (watchers.get(camera) ?? 0) > 0,
  };
}

/** The building's one CCTV network, shared by every room in the page. */
export const CCTV = createCctvNetwork();

/** The camera over dev16's pool. */
export const POOL_CAMERA = 'dev16-cam1';

/**
 * Snow, as a monitor shows with no signal: grey noise from `seed`, into
 * `out` (RGBA, `width` × `height`).
 */
export function snow(out: Uint8Array, seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = 0; i < out.length; i += 4) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const g = (s >>> 0) % 200;
    out[i] = out[i + 1] = out[i + 2] = g;
    out[i + 3] = 255;
  }
}

/**
 * A monitor's picture from a frame: its brightness added and its contrast
 * multiplied about mid-grey, each 0 to 1 (0.5 leaves it as sent), into
 * `out`.
 */
export function adjust(
  frame: Uint8Array,
  out: Uint8Array,
  brightness: number,
  contrast: number,
) {
  const gain = 0.25 + contrast * 1.5;
  const lift = (brightness - 0.5) * 160;
  for (let i = 0; i < frame.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = (frame[i + c] - 128) * gain + 128 + lift;
      out[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    out[i + 3] = 255;
  }
}
