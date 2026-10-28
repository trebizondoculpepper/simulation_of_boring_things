"""The piezo beep library: every beep synthesised from scratch (mission 100).

One cheap piezo sounder behind a panel, played three ways (pitch), with
thirteen cadences (meaning), each rendered dry and in two rooms (reverb):
13 x 3 x 3 = 117 MP3s, named piezo_<meaning>_<pitch>_<room>.mp3. Nothing
here is recorded, sampled or derived from any recording.

The chain, per file (doc/research/piezo-beeper-sounds.md):
  band-limited pulse-wave drive (duty 0.46, pulling in to pitch over 4 ms,
  1 ms gated edges)
  -> the transducer: three parallel resonances and a little of the drive
  -> soft clip (tanh, +9 dB, asymmetry 0.18)
  -> the fascia: a 0.18 ms comb, a level-following rattle, 100 Hz ripple
  -> 700 Hz high-pass, 9.5 kHz low-pass
  -> the room: convolution with a synthesised impulse response

Loudness: each dry file is brought to one K-weighted RMS (ITU-R BS.1770
weighting) over its sounding part only, the one level chosen so that the
loudest file in the library peaks at -1 dBFS once decoded; each small and
large file keeps its dry file's gain, so the beep is as loud in every room
and only the tail is added.

Loops (countdown, hurry, warning, alarm) are rendered over many cycles of
an exactly periodic drive and one steady-state cycle kept, so the reverb's
tail is already wrapped round onto its start and the loop joins seamlessly.

After encoding, every file is decoded again and checked: it starts sounding
within 2 ms of its first beep, it peaks at most -1 dBFS, and a loop's end
runs into its start without a step. Any failure stops the run.

Deterministic: the random parts are seeded from each file's name (and each
room's IR from the room's name), and ffmpeg writes bit-exact output, so a
second run leaves every file byte-identical.

Rerun from this folder: python3 -I generate.py .
Needs Python 3 with numpy and scipy, and ffmpeg on the path; the text it
writes is put through the project's formatter (npx vp fmt) when run inside
the repository.
"""

from __future__ import annotations

import json
import subprocess
import sys
import zlib
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 48000

# ---- The sounder -------------------------------------------------------------

# A 27 mm externally driven bender in a plastic housing: (Hz, Q, gain).
MODES: list[tuple[float, float, float]] = [
    (3900.0, 10.0, 1.00),  # the plate's bending resonance (its rated frequency)
    (2650.0, 4.0, 0.45),  # the housing's Helmholtz resonance (cavity and port)
    (9800.0, 7.0, 0.30),  # a higher plate mode: the shrill edge
]
DIRECT = 0.06  # a little of the drive passes unresonated
DUTY = 0.46  # mostly odd harmonics, faint even ones
PULL_IN = (0.025, 0.004)  # starts 2.5 % flat, settling with a 4 ms time constant
EDGE = 0.001  # the gate's edges, seconds (a pin switching a transistor)
RING = 0.03  # each beep's rendered ring-down after its drive stops, seconds
CLIP_DB = 9.0
CLIP_ASYM = 0.18
COMB = (0.00018, 0.45)  # board-to-fascia reflection: delay s, gain
RATTLE = 0.05  # loose-panel buzz, band-passed noise 3 to 7 kHz
RIPPLE = 0.04  # 100 Hz ripple on the drive
HIGH_PASS = 700.0
LOW_PASS = 9500.0

PITCHES: dict[str, float] = {"low": 1300.0, "mid": 2400.0, "high": 3900.0}
WARBLE = 0.84  # the second tone of a two-tone cadence, times the pitch

# ---- The cadences --------------------------------------------------------------


@dataclass(frozen=True)
class Cadence:
    """Each beep's (onset s, length s, pitch multiplier); a loop's cycle, seconds."""

    beeps: tuple[tuple[float, float, float], ...]
    cycle: float | None = None
    use: str = ""


def _train(onsets: list[float], length: float, mult: float = 1.0):
    return tuple((round(o, 6), length, mult) for o in onsets)


def _priority_high() -> tuple[tuple[float, float, float], ...]:
    # IEC 60601-1-8 (2006) high priority: ten pulses, 3 + 2, a pause, 3 + 2.
    # Pulses 0.1 s, 0.075 s apart; between the third and fourth twice that
    # plus a pulse; between the fifth and sixth 0.5 s.
    pulse, gap = 0.1, 0.075
    onsets, t = [], 0.0
    for group in range(2):
        for i in range(5):
            onsets.append(t)
            t += pulse + (gap if i != 2 else 2 * gap + pulse)
        t += 0.5 - gap  # the pause between the halves
    return _train(onsets, pulse)


CADENCES: dict[str, Cadence] = {
    "entry": Cadence(_train([0.0], 0.035), use="A key pressed, a card presented"),
    "confirm": Cadence(_train([0.0, 0.12], 0.07), use="A value stored, a command accepted, a card read and accepted"),
    "done": Cadence(_train([0.0], 0.3), use="A longer action finished, an arming or a mode change completed"),
    "error": Cadence(_train([0.0, 0.15, 0.30], 0.09), use="A key not allowed now, a limit reached"),
    "deny": Cadence(_train([0.0], 0.55), use="A wrong code, a card refused, LOCAL CONTROL ONLY"),
    "ready": Cadence(_train([0.05], 0.15), use="A controller coming online after its self-test"),
    "fault": Cadence(_train([0.0, 0.30, 0.60], 0.15), use="A controller's fault on power-up or in running"),
    "priority-high": Cadence(_priority_high(), use="A grave alarm, repeated by the caller"),
    "priority-medium": Cadence(_train([0.0, 0.35, 0.70], 0.2), use="A caution, repeated by the caller"),
    "countdown": Cadence(_train([0.0], 0.06), cycle=1.0, use="An entry or exit delay, a timed action running"),
    "hurry": Cadence(_train([0.0, 0.25, 0.5, 0.75], 0.06), cycle=1.0, use="The last seconds of a countdown"),
    "warning": Cadence(_train([0.0, 0.5], 0.25), cycle=1.0, use="A condition needing attention, until acknowledged"),
    "alarm": Cadence(
        tuple((i * 0.0625, 0.0625, 1.0 if i % 2 == 0 else WARBLE) for i in range(4)),
        cycle=0.25,
        use="An alarm sounding until silenced",
    ),
}

# ---- The rooms -------------------------------------------------------------------

# name: (RT60 s, predelay s, early reflections, early spread s, wet gain)
ROOMS: dict[str, tuple[float, float, int, float, float] | None] = {
    "dry": None,
    "small": (0.35, 0.003, 12, 0.012, 0.35),  # a small plant room, a cubicle, a corridor
    "large": (2.2, 0.022, 24, 0.06, 0.55),  # a big tiled plant room, a pool hall
}

PEAK_LIMIT_DB = -1.0
ONSET_LIMIT = 0.002


def seed(name: str) -> np.random.Generator:
    return np.random.default_rng(zlib.crc32(name.encode()))


# ---- Synthesis -------------------------------------------------------------------


def resonator(x: np.ndarray, f: float, q: float) -> np.ndarray:
    """A two-pole band-pass (the RBJ constant 0 dB peak): one damped mode."""
    w = 2 * np.pi * f / SR
    alpha = np.sin(w) / (2 * q)
    b = np.array([alpha, 0.0, -alpha])
    a = np.array([1 + alpha, -2 * np.cos(w), 1 - alpha])
    return lfilter(b / a[0], a / a[0], x)


def drive(hz: float, seconds: float) -> tuple[np.ndarray, np.ndarray]:
    """One beep's drive and its gate: a band-limited pulse wave, pulling in."""
    n = int(round(seconds * SR))
    total = n + int(RING * SR)
    gate = np.zeros(total)
    edge = int(EDGE * SR)
    gate[:n] = 1.0
    gate[:edge] = np.linspace(0.0, 1.0, edge)
    gate[n - edge : n] = np.linspace(1.0, 0.0, edge)
    t = np.arange(total) / SR
    pull = 1 - PULL_IN[0] * np.exp(-t / PULL_IN[1])
    phase = np.cumsum(hz * pull) / SR
    wave = np.zeros(total)
    k = 1
    while k * hz < SR / 2 * 0.95:
        wave += 2 / (k * np.pi) * np.sin(k * np.pi * DUTY) * np.cos(2 * np.pi * k * phase)
        k += 1
    return wave * gate, gate


def drive_train(cadence: Cadence, hz: float, length: int) -> tuple[np.ndarray, np.ndarray]:
    """The cadence's drive and gate over `length` samples (a loop's wrap round)."""
    x = np.zeros(length)
    gate = np.zeros(length)
    for onset, seconds, mult in cadence.beeps:
        w, g = drive(hz * mult, seconds)
        idx = (int(round(onset * SR)) + np.arange(len(w))) % length
        np.add.at(x, idx, w)
        gate[idx] = np.maximum(gate[idx], g)
    return x, gate


def sounder(x: np.ndarray, gate: np.ndarray, rattle_noise: np.ndarray, clip_norm: float) -> np.ndarray:
    """The transducer, the clip, the fascia and the band limit."""
    y = DIRECT * x
    for f, q, g in MODES:
        y = y + g * resonator(x, f, q)
    g = 10 ** (CLIP_DB / 20)
    y = y / clip_norm
    y = np.tanh(g * (y + CLIP_ASYM * y * y)) / np.tanh(g)
    y = y - np.mean(y)
    d = int(round(COMB[0] * SR))
    z = y.copy()
    z[d:] += COMB[1] * y[:-d]
    z += RATTLE * rattle_noise * gate * np.abs(y)
    t = np.arange(len(z)) / SR
    z *= 1 + RIPPLE * np.sin(2 * np.pi * 100 * t)
    z = sosfilt(butter(4, HIGH_PASS, "highpass", fs=SR, output="sos"), z)
    return sosfilt(butter(4, LOW_PASS, "lowpass", fs=SR, output="sos"), z)


def rattle(rng: np.random.Generator, n: int) -> np.ndarray:
    noise = rng.standard_normal(n)
    return sosfilt(butter(2, [3000, 7000], "bandpass", fs=SR, output="sos"), noise)


def impulse_response(room: str) -> tuple[np.ndarray, float]:
    """A synthesised room: sparse early reflections, then decaying noise whose highs die faster."""
    rt60, predelay, early, spread, wet = ROOMS[room]  # type: ignore[misc]
    rng = seed(f"room:{room}")
    n = int((predelay + rt60 * 1.2) * SR)
    ir = np.zeros(n)
    p = int(predelay * SR)
    for _ in range(early):
        d = p + int(rng.uniform(0, spread) * SR)
        if d < n:
            ir[d] += rng.uniform(0.2, 0.6) * rng.choice([-1, 1])
    t = np.arange(n - p) / SR
    tail = rng.standard_normal(n - p)
    lo = sosfilt(butter(2, 2000, "lowpass", fs=SR, output="sos"), tail) * np.exp(-6.91 * t / rt60)
    hi = sosfilt(butter(2, 2000, "highpass", fs=SR, output="sos"), tail) * np.exp(-6.91 * t / (rt60 * 0.6))
    ramp = np.minimum(1, t / max(spread, 0.002))
    ir[p:] += (lo + hi) * ramp * 0.35
    return ir / np.sqrt(np.sum(ir**2)), wet


def k_weight(x: np.ndarray) -> np.ndarray:
    """ITU-R BS.1770's pre-filter and RLB weighting, 48 kHz coefficients."""
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x))


def loudness(x: np.ndarray, gate: np.ndarray) -> float:
    """K-weighted RMS over the sounding part (gate on), dB."""
    k = k_weight(x)
    on = gate > 0.5
    return float(10 * np.log10(np.mean(k[on] ** 2) + 1e-20))


def db(x: float) -> float:
    return float(20 * np.log10(max(x, 1e-12)))


@dataclass
class Rendered:
    name: str
    meaning: str
    pitch: str
    room: str
    signal: np.ndarray  # before the library's one gain
    direct_db: float  # the direct (dry) part's loudness, before the gain
    sounding_db: float  # the whole file's loudness over its sounding part, before the gain
    gain_db: float  # the dry file's gain to the reference level
    loop: float | None
    first_onset: float


REFERENCE_DB = -20.0  # the level the dry beeps are matched to before the library's one gain


def render_meaning(meaning: str, pitch: str, irs: dict[str, tuple[np.ndarray, float]]) -> list[Rendered]:
    """One meaning at one pitch, dry and in each room."""
    cadence = CADENCES[meaning]
    hz = PITCHES[pitch]
    base = f"piezo_{meaning}_{pitch}"
    rng = seed(base)
    out: list[Rendered] = []
    if cadence.cycle is None:
        end = max(o + s for o, s, _ in cadence.beeps) + RING + 0.02
        length = int(round(end * SR))
        x, gate = drive_train(cadence, hz, length)
        rattle_noise = rattle(rng, length)
        clip_norm = np.max(np.abs(sounder_linear(x)))
        dry = sounder(x, gate, rattle_noise, clip_norm)
        gain_db = REFERENCE_DB - loudness(dry, gate)
        dry = dry * 10 ** (gain_db / 20)
        for room in ROOMS:
            if room == "dry":
                y = dry.copy()
            else:
                ir, wet = irs[room]
                y = wet * fftconvolve(dry, ir)
                y[: len(dry)] += dry
                thr = np.max(np.abs(y)) * 1e-3  # trimmed once 60 dB down
                last = int(np.nonzero(np.abs(y) > thr)[0][-1])
                y = y[: last + int(0.01 * SR)]
            fade = int(0.003 * SR)
            y[-fade:] *= np.linspace(1.0, 0.0, fade)
            g = np.zeros(len(y))
            g[: len(gate)] = gate
            out.append(
                Rendered(
                    name=f"{base}_{room}.mp3",
                    meaning=meaning,
                    pitch=pitch,
                    room=room,
                    signal=y,
                    direct_db=loudness(dry, gate),
                    sounding_db=loudness(y, g),
                    gain_db=gain_db,
                    loop=None,
                    first_onset=cadence.beeps[0][0],
                )
            )
        return out
    # A loop: an exactly periodic drive (one cycle, tiled; its noise one
    # cycle's, tiled too), many cycles long, so filters and reverb settle;
    # then one steady cycle kept.
    c = int(round(cadence.cycle * SR))
    x1, gate1 = drive_train(cadence, hz, c)
    noise1 = rattle(rng, c)
    longest = max(len(ir) for ir, _ in irs.values())
    settle = int(np.ceil(0.5 * SR / c)) + 1  # IIR filters and the clip's mean
    cycles = settle + int(np.ceil(longest / c)) + 2
    x = np.tile(x1, cycles)
    gate = np.tile(gate1, cycles)
    clip_norm = np.max(np.abs(sounder_linear(x)))
    dry_long = sounder(x, gate, np.tile(noise1, cycles), clip_norm)
    steady = slice(settle * c, (settle + 1) * c)
    gain_db = REFERENCE_DB - loudness(dry_long[steady], gate1)
    dry_long = dry_long * 10 ** (gain_db / 20)
    keep = slice((cycles - 1) * c, cycles * c)
    for room in ROOMS:
        if room == "dry":
            y = dry_long[keep].copy()
        else:
            ir, wet = irs[room]
            full = dry_long + wet * fftconvolve(dry_long, ir)[: len(dry_long)]
            y = full[keep].copy()
        out.append(
            Rendered(
                name=f"{base}_{room}.mp3",
                meaning=meaning,
                pitch=pitch,
                room=room,
                signal=y,
                direct_db=loudness(dry_long[keep], gate1),
                sounding_db=loudness(y, gate1),
                gain_db=gain_db,
                loop=cadence.cycle,
                first_onset=0.0,
            )
        )
    return out


def sounder_linear(x: np.ndarray) -> np.ndarray:
    """The transducer alone, to normalise the drive into the clip."""
    y = DIRECT * x
    for f, q, g in MODES:
        y = y + g * resonator(x, f, q)
    return y


# ---- Encoding and checks ------------------------------------------------------------


def encode(x: np.ndarray, path: Path) -> None:
    pcm = np.clip(x, -1.0, 1.0).astype("<f4").tobytes()
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y",
            "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
            "-fflags", "+bitexact", "-flags:a", "+bitexact", "-map_metadata", "-1",
            "-c:a", "libmp3lame", "-q:a", "2", "-ar", str(SR), "-ac", "1",
            str(path),
        ],
        input=pcm,
        check=True,
    )


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


class CheckFailed(RuntimeError):
    pass


def check(r: Rendered, decoded: np.ndarray) -> dict[str, float]:
    peak = db(float(np.max(np.abs(decoded))))
    if peak > PEAK_LIMIT_DB + 1e-6:
        raise CheckFailed(f"{r.name}: peak {peak:.2f} dBFS over {PEAK_LIMIT_DB}")
    # Onset: where its first beep sounds (a tenth of the file's peak).
    if r.loop is None or r.room == "dry":
        above = np.nonzero(np.abs(decoded) > 0.1 * np.max(np.abs(decoded)))[0]
        onset = above[0] / SR
        if r.loop is not None:
            onset = 0.0 if np.max(np.abs(decoded[: int(ONSET_LIMIT * SR)])) > 0.05 * np.max(np.abs(decoded)) else onset
        if abs(onset - r.first_onset) > ONSET_LIMIT:
            raise CheckFailed(f"{r.name}: sounds at {onset * 1000:.1f} ms, not {r.first_onset * 1000:.0f} ms")
    else:
        onset = 0.0
    if r.loop is not None:
        n = int(round(r.loop * SR))
        if abs(len(decoded) - n) > 2:
            raise CheckFailed(f"{r.name}: decodes to {len(decoded)} samples, its loop is {n}")
        # The join: its last 5 ms run into its first without a step bigger
        # than its own steepest sample-to-sample change.
        w = int(0.005 * SR)
        seam = np.concatenate([decoded[-w:], decoded[:w]])
        step = abs(seam[w] - seam[w - 1])
        steepest = float(np.max(np.abs(np.diff(decoded))))
        if step > steepest * 1.05 + 1e-4:
            raise CheckFailed(f"{r.name}: steps {step:.4f} at its join (steepest inside {steepest:.4f})")
    return {"peak": peak, "onset": float(onset)}


# ---- The library ---------------------------------------------------------------------


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    irs = {room: impulse_response(room) for room, spec in ROOMS.items() if spec}
    rendered: list[Rendered] = []
    for meaning in CADENCES:
        for pitch in PITCHES:
            rendered.extend(render_meaning(meaning, pitch, irs))
    # The one gain: the loudest file peaks at -1 dBFS once decoded. A first
    # guess from the rendered peaks, corrected once by the decoded peaks.
    top = max(db(float(np.max(np.abs(r.signal)))) for r in rendered)
    library_db = PEAK_LIMIT_DB - 0.05 - top
    for attempt in range(4):
        scale = 10 ** (library_db / 20)
        decoded_peaks = []
        for r in rendered:
            encode(r.signal * scale, out / r.name)
            decoded_peaks.append(db(float(np.max(np.abs(decode(out / r.name))))))
        excess = max(decoded_peaks) - PEAK_LIMIT_DB
        if excess <= 0:
            break
        library_db -= excess + 0.02
    else:
        raise CheckFailed("could not bring the library under its peak limit")
    target = REFERENCE_DB + library_db
    rows = []
    for r in rendered:
        measured = check(r, decode(out / r.name))
        rows.append(
            {
                "file": r.name,
                "meaning": r.meaning,
                "pitch": r.pitch,
                "room": r.room,
                "seconds": round(len(r.signal) / SR, 4),
                "loops": r.loop is not None,
                "loopSeconds": r.loop,
                "gainDb": round(r.gain_db + library_db, 3),
                "loudness": round(r.direct_db + library_db, 2),
                "soundingLoudness": round(r.sounding_db + library_db, 2),
                "peak": round(measured["peak"], 2),
                "onsetMs": round(measured["onset"] * 1000, 2),
            }
        )
    manifest = {
        "generator": "generate.py",
        "sampleRate": SR,
        "targetLoudness": round(target, 2),
        "peakLimit": PEAK_LIMIT_DB,
        "pitches": PITCHES,
        "rooms": {k: (None if v is None else {"rt60": v[0], "predelay": v[1], "earlySpread": v[3], "wet": v[4]}) for k, v in ROOMS.items()},
        "meanings": {
            k: {"loops": c.cycle is not None, "cycle": c.cycle, "beeps": [list(b) for b in c.beeps]}
            for k, c in CADENCES.items()
        },
        "files": rows,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    write_index(out, rows, target)
    write_player(out, rows)
    tidy(out)
    print(f"{len(rows)} files; target {target:.2f} dB K-weighted; loudest peak {max(r['peak'] for r in rows):.2f} dBFS")


def tidy(out: Path) -> None:
    """Put the written text through the project's formatter (`vp fmt`), so a rerun leaves the repository's checks clean."""
    texts = [(out / name).resolve() for name in ("index.md", "index.html", "manifest.json")]
    root = next((d for d in [out.resolve(), *out.resolve().parents] if (d / "package.json").exists()), None)
    if root is None:
        print("not in the project: index.md, index.html and manifest.json left unformatted")
        return
    try:
        subprocess.run(["npx", "vp", "fmt", *map(str, texts)], cwd=root, check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError) as error:
        print(f"vp fmt failed ({error}): index.md, index.html and manifest.json left unformatted")


def describe(c: Cadence) -> str:
    beeps = c.beeps
    lengths = sorted({round(s * 1000, 1) for _, s, _ in beeps})
    text = f"{len(beeps)} beep{'s' if len(beeps) > 1 else ''} of {', '.join(f'{v:g}' for v in lengths)} ms at " + ", ".join(
        f"{o * 1000:g}" + ("" if m == 1 else f" (x{m:g})") for o, _, m in beeps
    ) + " ms"
    if c.cycle:
        text += f", a {c.cycle:g} s loop"
    return text


def write_index(out: Path, rows: list[dict], target: float) -> None:
    lines = [
        "# Piezo beeps",
        "",
        "A library of beeps from one cheap piezo sounder behind a panel, by pitch, meaning and reverb (mission 100, `doc/prompts/100-piezo-beeper-library.md`). Every file is synthesised from scratch by `generate.py` in this folder; nothing is recorded, sampled or derived from any recording. Rerun with `python3 -I generate.py .` from this folder (Python 3, numpy, scipy, ffmpeg); it is deterministic, so a rerun changes nothing. This file and `manifest.json` are written by it.",
        "",
        "Method (the research note `doc/research/piezo-beeper-sounds.md` explains it): a band-limited pulse-wave drive (duty 0.46, starting 2.5 % flat and pulling in to pitch over 4 ms, gated with 1 ms edges) into a modal model of an externally driven 27 mm bender in its housing (three parallel two-pole resonances: the plate at 3900 Hz Q 10, the housing's port at 2650 Hz Q 4 at 0.45, a higher plate mode at 9800 Hz Q 7 at 0.3, with 6 % of the drive straight through); a soft clip (`tanh`, +9 dB, asymmetry 0.18); the fascia (a 0.18 ms comb at 0.45, a level-following rattle of 3 to 7 kHz noise at 0.05, 4 % of 100 Hz ripple); a 700 Hz high-pass and a 9.5 kHz low-pass; then, for `small` and `large`, convolution with a synthesised impulse response (early reflections and two-band exponentially decaying noise), added to the dry beep at the room's wet gain. Mono, 48 kHz, MP3 (LAME VBR `-q:a 2`).",
        "",
        f"Loudness: every dry beep is brought to {target:.2f} dB K-weighted RMS (ITU-R BS.1770 weighting) over its sounding part only (a loop over one cycle's), the one level chosen so that the loudest file in the library peaks at -1 dBFS once decoded. Each `small` and `large` file keeps its dry file's gain, so the beep is as loud in every room and only the tail is added; its `loudness` is its direct part's, `soundingLoudness` (in `manifest.json`) the whole file's over the same sounding part. The game's caller gives each event its level.",
        "",
        "Loops (`countdown`, `hurry`, `warning`, `alarm`) are exactly one cycle long, cut from the steady state of many cycles, so the reverb's tail is wrapped round onto the start and the loop joins without a click when held.",
        "",
        "Checks, run on every file after decoding: it sounds within 2 ms of its first beep (`ready` begins with 50 ms of silence by design); it peaks at most -1 dBFS; a loop's end runs into its start without a step.",
        "",
        "## Pitches",
        "",
        "| Pitch | Drive | Character |",
        "| --- | --- | --- |",
        "| `low` | 1.3 kHz | Off resonance; its third harmonic lands on the plate's mode: nasal, buzzy |",
        "| `mid` | 2.4 kHz | Between the port and the plate: fuller, a little rough |",
        "| `high` | 3.9 kHz | On resonance: the loudest, nearly pure, piercing |",
        "",
        "A two-tone cadence's second tone is the pitch times 0.84.",
        "",
        "## Meanings",
        "",
        "| Meaning | Cadence | For |",
        "| --- | --- | --- |",
    ]
    for name, c in CADENCES.items():
        lines.append(f"| `{name}` | {describe(c)} | {c.use} |")
    lines += [
        "",
        "## Rooms",
        "",
        "| Room | RT60 | Predelay | Early spread | Wet |",
        "| --- | --- | --- | --- | --- |",
        "| `dry` | none | | | |",
    ]
    for name, spec in ROOMS.items():
        if spec:
            lines.append(f"| `{name}` | {spec[0]:g} s | {spec[1] * 1000:g} ms | {spec[3] * 1000:g} ms | {spec[4]:g} |")
    lines += [
        "",
        "## Files",
        "",
        "| File | Meaning | Pitch | Room | Seconds | Loop | Loudness dB | Peak dBFS |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for r in rows:
        loop = f"{r['loopSeconds']:g} s" if r["loops"] else ""
        lines.append(
            f"| [{r['file']}]({r['file']}) | {r['meaning']} | {r['pitch']} | {r['room']} | {r['seconds']:.2f} | {loop} | {r['loudness']:.2f} | {r['peak']:.2f} |"
        )
    (out / "index.md").write_text("\n".join(lines) + "\n")


def write_player(out: Path, rows: list[dict]) -> None:
    """A page of players, for listening outside the game."""
    cells = []
    for meaning in CADENCES:
        cells.append(f"<h2>{meaning}</h2><p>{CADENCES[meaning].use}</p><table><tr><th></th>" + "".join(f"<th>{room}</th>" for room in ROOMS) + "</tr>")
        for pitch in PITCHES:
            cells.append(f"<tr><th>{pitch}</th>")
            for room in ROOMS:
                name = f"piezo_{meaning}_{pitch}_{room}.mp3"
                loop = " loop" if CADENCES[meaning].cycle else ""
                cells.append(f'<td><audio controls preload="none"{loop} src="{name}"></audio></td>')
            cells.append("</tr>")
        cells.append("</table>")
    html = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        "<title>Piezo beeps</title><style>body{font-family:system-ui,sans-serif;margin:16px;background:#fff;color:#111}"
        "table{border-collapse:collapse}td,th{padding:4px 8px;text-align:left}audio{width:220px}</style></head><body>"
        "<h1>Piezo beeps</h1><p>Every file synthesised from scratch by <code>generate.py</code> (see <code>index.md</code>). Loops are marked to repeat.</p>"
        + "".join(cells)
        + "</body></html>\n"
    )
    (out / "index.html").write_text(html)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
