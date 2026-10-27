"""Resynthesise short console bleeps with a sinusoidal-plus-noise model.

For each input: decode to mono, short-time Fourier transform, pick the
strongest spectral peaks per frame (parabolic interpolation), link them
into tracks, and rebuild them with phase-continuous sine oscillators
following each track's frequency and amplitude. What the sines do not
explain (the residual) is kept only as its coarse spectral envelope and
rebuilt from white noise, so hiss and clicks keep their character without
copying any samples.
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import get_window, stft, istft
from scipy.ndimage import uniform_filter1d

SR = 48000
N = 2048
HOP = 240  # 5 ms
PEAKS = 6
FLOOR_DB = -60


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR),
         "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def frame_peaks(x: np.ndarray):
    win = get_window("blackmanharris", N)
    pad = np.concatenate([np.zeros(N // 2), x, np.zeros(N)])
    frames = 1 + (len(pad) - N) // HOP
    wsum = win.sum() / 2
    out = []
    for i in range(frames):
        seg = pad[i * HOP: i * HOP + N] * win
        mag = np.abs(np.fft.rfft(seg)) / wsum
        db = 20 * np.log10(mag + 1e-12)
        cand = np.where((db[1:-1] > db[:-2]) & (db[1:-1] >= db[2:]) & (db[1:-1] > FLOOR_DB))[0] + 1
        cand = cand[np.argsort(db[cand])[::-1][:PEAKS]]
        peaks = []
        for k in cand:
            a, b, c = db[k - 1], db[k], db[k + 1]
            p = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
            f = (k + p) * SR / N
            amp = 10 ** ((b - 0.25 * (a - c) * p) / 20)
            if 80 < f < 16000:
                peaks.append((f, amp))
        out.append(peaks)
    return out


def track(peaks):
    """Greedy partial tracking: continue a track if a peak is within 6 % in frequency."""
    tracks = []  # each: dict(start, f[], a[])
    active = []
    for t, frame in enumerate(peaks):
        used = set()
        still = []
        for tr in active:
            last = tr["f"][-1]
            best, bi = None, None
            for i, (f, a) in enumerate(frame):
                if i in used:
                    continue
                d = abs(f - last) / last
                if d < 0.06 and (best is None or d < best):
                    best, bi = d, i
            if bi is not None:
                used.add(bi)
                tr["f"].append(frame[bi][0])
                tr["a"].append(frame[bi][1])
                still.append(tr)
            else:
                tracks.append(tr)
        for i, (f, a) in enumerate(frame):
            if i not in used:
                still.append({"start": t, "f": [f], "a": [a]})
        active = still
    tracks.extend(active)
    # Drop fragments shorter than 15 ms.
    return [tr for tr in tracks if len(tr["f"]) >= 3]


def synth_sines(tracks, length):
    y = np.zeros(length + N)
    for tr in tracks:
        n = len(tr["f"])
        f = np.array(tr["f"])
        a = np.array(tr["a"])
        # Fade each track in and out over one frame so births and deaths do not click.
        a = np.concatenate([[0.0], a, [0.0]])
        f = np.concatenate([[f[0]], f, [f[-1]]])
        start = (tr["start"] - 1) * HOP
        t_frames = np.arange(n + 2) * HOP
        t = np.arange((n + 1) * HOP)
        fi = np.interp(t, t_frames, f)
        ai = np.interp(t, t_frames, a)
        phase = 2 * np.pi * np.cumsum(fi) / SR
        seg = ai * np.sin(phase)
        s0 = max(0, start)
        seg = seg[s0 - start:]
        e = min(len(y), s0 + len(seg))
        y[s0:e] += seg[: e - s0]
    return y[:length]


def synth_noise(residual, length, rng):
    """Rebuild the residual as noise with its coarse time-varying spectral envelope."""
    _, _, Z = stft(residual, fs=SR, nperseg=1024, noverlap=1024 - 256)
    env = np.abs(Z)
    # Coarse: smooth across frequency (about 1/3 octave at mid bands) and a little in time.
    env = uniform_filter1d(env, size=9, axis=0)
    env = uniform_filter1d(env, size=3, axis=1)
    noise = rng.standard_normal(length)
    _, _, W = stft(noise, fs=SR, nperseg=1024, noverlap=1024 - 256)
    W = W[:, : env.shape[1]]
    W = W / (np.abs(W) + 1e-12) * env[:, : W.shape[1]]
    _, y = istft(W, fs=SR, nperseg=1024, noverlap=1024 - 256)
    out = np.zeros(length)
    out[: min(length, len(y))] = y[:length]
    return out


def resynth(src: Path, dst: Path, rng) -> None:
    x = decode(src)
    tracks = track(frame_peaks(x))
    sines = synth_sines(tracks, len(x))
    residual = x - sines
    noise = synth_noise(residual, len(x), rng)
    # Noise only where the original was noisy: keep it, but a touch lower, since
    # the residual also holds the sine model's own errors.
    y = sines + 0.7 * noise
    # Match the original's peak level; gentle 3 ms fades at the ends.
    y *= np.max(np.abs(x)) / (np.max(np.abs(y)) + 1e-12)
    fade = int(0.003 * SR)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    tmp = dst.with_suffix(".wav")
    wavfile.write(tmp, SR, (y * 32767).clip(-32768, 32767).astype(np.int16))
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-c:a", "libmp3lame",
         "-q:a", "2", str(dst)],
        check=True,
    )
    tmp.unlink()
    print(f"{src.name}: {len(tracks)} partial tracks, {len(x) / SR:.2f} s")


def main(src_dir: str, dst_dir: str) -> None:
    rng = np.random.default_rng(1)
    out = Path(dst_dir)
    out.mkdir(parents=True, exist_ok=True)
    for src in sorted(Path(src_dir).glob("*.mp3")):
        resynth(src, out / src.name, rng)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
