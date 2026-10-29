"""Cut the selected ACE-Step item-get cover into the game's two timed cues."""

import argparse
from pathlib import Path
import re
import subprocess
import tempfile


OUT = Path(__file__).resolve().parent
CUES = (("reveal-suspense", 4.40), ("reveal-fanfare", 7.92))


def run(*args: str) -> subprocess.CompletedProcess[str]:
    """Run FFmpeg and return its text output, raising on failure."""
    return subprocess.run(args, capture_output=True, text=True, check=True)


def render(source: Path, name: str, start: float) -> None:
    """Extract, peak-set and encode one 2.5-second mono cue."""
    with tempfile.TemporaryDirectory() as temp:
        cut = Path(temp) / "cut.wav"
        filters = (
            f"atrim=start={start}:duration=2.5,asetpts=PTS-STARTPTS,"
            "pan=mono|c0=0.5*c0+0.5*c1,apad=pad_dur=2.5,atrim=duration=2.5,"
            "afade=t=in:st=0:d=0.005,afade=t=out:st=2.47:d=0.03"
        )
        run("ffmpeg", "-v", "error", "-y", "-i", str(source), "-af", filters,
            "-ar", "48000", str(cut))
        measured = run("ffmpeg", "-i", str(cut), "-af", "volumedetect", "-f", "null", "-")
        match = re.search(r"max_volume: ([\d.-]+) dB", measured.stderr)
        if match is None:
            raise RuntimeError(f"Could not measure peak for {name}")
        gain = -6.5 - float(match.group(1))
        run("ffmpeg", "-v", "error", "-y", "-i", str(cut), "-af", f"volume={gain}dB",
            "-codec:a", "libmp3lame", "-b:a", "128k", str(OUT / f"{name}.mp3"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="selected full-length stereo cover WAV")
    args = parser.parse_args()
    for cue, offset in CUES:
        render(args.source, cue, offset)
