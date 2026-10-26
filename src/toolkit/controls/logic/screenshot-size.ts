/** The widest screenshot, pixels (prompt 084: up to 3840 px wide). */
export const SCREENSHOT_MAX_WIDTH = 3840;
/** The most pixels a screenshot holds, to bound the GPU and clipboard allocation. */
export const SCREENSHOT_MAX_PIXELS = 16_000_000;

/**
 * The pixel ratio a best-quality screenshot is drawn at (prompt 084): twice
 * the device's own, whatever the player's render quality, but never wider
 * than 3840 px, never larger on either axis than `maxDimension` (the
 * smallest texture, renderbuffer or viewport limit of every renderer
 * drawing it), and never more than 16 megapixels. Every cap holds even for
 * a display already larger, so its aspect is kept and it is only ever
 * scaled down. `width` and `height` are the view's CSS pixels; null for a
 * view with no size.
 */
export function screenshotPixelRatio(
  width: number,
  height: number,
  devicePixelRatio: number,
  maxDimension: number,
): number | null {
  if (!(width > 0 && height > 0 && maxDimension > 0)) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  const device =
    devicePixelRatio > 0 && Number.isFinite(devicePixelRatio)
      ? devicePixelRatio
      : 1;
  return Math.min(
    2 * device,
    SCREENSHOT_MAX_WIDTH / width,
    maxDimension / width,
    maxDimension / height,
    Math.sqrt(SCREENSHOT_MAX_PIXELS / (width * height)),
  );
}

/** The image a ratio gives, as the renderer sizes its canvas (rounded down). */
export const screenshotSize = (
  width: number,
  height: number,
  ratio: number,
) => ({
  width: Math.floor(width * ratio),
  height: Math.floor(height * ratio),
});

/** A screenshot's file name: `pool-plant-<room>-<yyyy-mm-dd-hhmmss>.png`, local time. */
export function screenshotFileName(room: string, at: Date) {
  const two = (n: number) => String(n).padStart(2, '0');
  const day = `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
  const time = `${two(at.getHours())}${two(at.getMinutes())}${two(at.getSeconds())}`;
  const name =
    room
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'view';
  return `pool-plant-${name}-${day}-${time}.png`;
}
