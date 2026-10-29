"""Cut the selected ACE-Step item-get cover into the game's two timed cues."""

import argparse
from pathlib import Path
import re
import subprocess
import tempfile


OUT = Path(__file__).resolve().parent
CUES = (("reveal-suspense", 3.85, 3.05), ("reveal-fanfare", 7.92, 2.5))


def run(*args: str) -> subprocess.CompletedProcess[str]:
    """Run FFmpeg and return its text output, raising on failure."""
    return subprocess.run(args, capture_output=True, text=True, check=True)


def render(source: Path, name: str, start: float, duration: float) -> None:
    """Extract, peak-set and encode one mono cue."""
    with tempfile.TemporaryDirectory() as temp:
        cut = Path(temp) / "cut.wav"
        filters = (
            f"atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS,"
            f"pan=mono|c0=0.5*c0+0.5*c1,apad=pad_dur={duration},"
            f"atrim=duration={duration},"
            f"afade=t=in:st=0:d=0.005,afade=t=out:st={duration - 0.03}:d=0.03"
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
    for cue, offset, duration in CUES:
        render(args.source, cue, offset, duration)
