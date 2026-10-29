"""Render the four original, precisely timed skimmer reveal cues."""

from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np


RATE = 48000
OUT = Path(__file__).resolve().parent
RNG = np.random.default_rng(40829)


def hz(midi: float) -> float:
    """Convert a MIDI pitch to frequency."""
    return 440 * 2 ** ((midi - 69) / 12)


def tone(buf: np.ndarray, at: float, length: float, pitch: float, level: float,
         kind: str = "brass", bend: float = 0) -> None:
    """Mix one shaped, additive instrument note into a mono cue."""
    start = round(at * RATE)
    count = min(round(length * RATE), len(buf) - start)
    if count <= 0:
        return
    t = np.arange(count) / RATE
    f = hz(pitch) * 2 ** (bend * (t / length) / 12)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    if kind == "brass":
        partials = ((1, 1), (2, .42), (3, .24), (4, .12), (5, .055))
        attack, decay = .022, .085
    elif kind == "string":
        partials = ((1, 1), (2, .3), (3, .14), (4, .06))
        attack, decay = .16, .17
        phase += .015 * np.sin(2 * np.pi * 5.2 * t)
    elif kind == "bell":
        partials = ((1, 1), (2.01, .26), (3.96, .11), (5.4, .045))
        attack, decay = .003, .32
    elif kind == "harp":
        partials = ((1, 1), (2, .24), (3, .09))
        attack, decay = .004, .25
    else:
        partials = ((1, 1), (2, .12))
        attack, decay = .09, .2
    wave_data = sum(weight * np.sin(mult * phase) for mult, weight in partials)
    envelope = np.minimum(1, t / attack) * np.minimum(1, (length - t) / decay)
    if kind in ("bell", "harp"):
        envelope *= np.exp(-2.1 * t / length)
    buf[start:start + count] += level * wave_data * np.maximum(0, envelope)


def cymbal(buf: np.ndarray, at: float, length: float, level: float) -> None:
    """Add a quiet, bright noise shimmer with a decaying edge."""
    start = round(at * RATE)
    count = min(round(length * RATE), len(buf) - start)
    if count <= 0:
        return
    noise = RNG.standard_normal(count)
    noise -= np.convolve(noise, np.ones(31) / 31, mode="same")
    t = np.arange(count) / RATE
    buf[start:start + count] += level * noise * np.exp(-5 * t / length)


def pickup(buf: np.ndarray) -> None:
    """Play the shared three-note fanfare pickup."""
    for at, pitch in ((0, 74), (.12, 76), (.24, 78)):
        tone(buf, at, .115, pitch, .14)


def suspense() -> np.ndarray:
    """Build a rising D-centred phrase with no final chord."""
    buf = np.zeros(round(2.5 * RATE))
    tone(buf, 0, 2.5, 50, .055, "string")
    tone(buf, .12, 2.35, 62, .025, "string")
    for index, pitch in enumerate((62, 64, 66, 68, 70, 72, 74, 76)):
        tone(buf, index * .295, .42, pitch, .075 + index * .007, "harp")
        tone(buf, index * .295, .32, pitch + 12, .018 + index * .003, "bell")
    cymbal(buf, 1.5, .95, .005)
    return buf


def fanfare(deflated: bool = False) -> np.ndarray:
    """Build the sincere G-major fanfare or its drooping counterpart."""
    buf = np.zeros(round(2.5 * RATE))
    pickup(buf)
    if deflated:
        for pitch in (67, 71, 74, 79):
            tone(buf, .38, .62, pitch, .092, "brass", bend=-2.7)
        tone(buf, .99, .78, 65, .09, "brass", bend=-3.5)
        tone(buf, 1.69, .77, 43, .115, "brass", bend=-.8)
        cymbal(buf, 2.17, .16, .004)
    else:
        tone(buf, .36, 1.99, 43, .09, "brass")
        for pitch in (67, 71, 74, 79):
            tone(buf, .37, 2.03, pitch, .09, "brass")
        for index, pitch in enumerate((91, 95, 98)):
            tone(buf, .41 + index * .085, .72, pitch, .055, "bell")
        cymbal(buf, .38, 1.5, .008)
    return buf


def cleared() -> np.ndarray:
    """Build a C-major ascending run and two resolving chords."""
    buf = np.zeros(round(3 * RATE))
    for index, pitch in enumerate((72, 76, 79, 84)):
        tone(buf, index * .105, .42, pitch, .095, "bell")
    for at, length, pitches in ((.58, .53, (55, 67, 71, 74)),
                                (1.26, 1.52, (48, 60, 64, 67, 72))):
        for pitch in pitches:
            tone(buf, at, length, pitch, .075, "brass")
    tone(buf, 1.44, 1.25, 96, .044, "bell")
    cymbal(buf, 1.28, .95, .006)
    return buf


def write_mp3(name: str, samples: np.ndarray) -> None:
    """Peak-limit a cue, write a temporary WAV, and encode game-ready MP3."""
    samples *= 10 ** (-6.5 / 20) / max(np.max(np.abs(samples)), 1e-9)
    # Five milliseconds removes boundary clicks without changing the cue's timing.
    edge = round(.005 * RATE)
    samples[:edge] *= np.linspace(0, 1, edge)
    samples[-edge:] *= np.linspace(1, 0, edge)
    with tempfile.TemporaryDirectory() as temp:
        wav_path = Path(temp) / "cue.wav"
        with wave.open(str(wav_path), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(RATE)
            output.writeframes((samples * 32767).astype("<i2").tobytes())
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav_path),
                        "-codec:a", "libmp3lame", "-b:a", "128k", str(OUT / f"{name}.mp3")],
                       check=True)


if __name__ == "__main__":
    for cue, data in (("reveal-suspense", suspense()),
                      ("reveal-fanfare", fanfare()),
                      ("reveal-fanfare-deflated", fanfare(True)),
                      ("skimmer-cleared", cleared())):
        write_mp3(cue, data)
