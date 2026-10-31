#!/usr/bin/env python3
"""Deterministic 10 s score for the Wealth OS product reel.

The picture has no random values. The audio uses a fixed seed only for
texture, so every run of this file writes the same PCM data.
"""
from __future__ import annotations

import json
import math
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
SR = 48_000
DURATION = 10.0
SEED = 1_661_905_713


def wav_write(path: Path, samples: np.ndarray) -> None:
    pcm = np.clip(samples, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(pcm.tobytes())


def main() -> None:
    cues = json.loads((ROOT / "cues.json").read_text(encoding="utf-8"))
    n = int(SR * DURATION)
    t = np.arange(n, dtype=np.float64) / SR
    rng = np.random.default_rng(SEED)

    # A quiet, slowly breathing low bed. Mono is duplicated to both channels.
    bed = (
        0.020 * np.sin(2 * math.pi * 55.0 * t)
        + 0.010 * np.sin(2 * math.pi * 82.5 * t + 0.4)
        + 0.006 * np.sin(2 * math.pi * 110.0 * t + 1.2)
    )
    bed *= 0.65 + 0.35 * (0.5 + 0.5 * np.sin(2 * math.pi * 0.10 * t - 0.5))

    mix = np.zeros(n, dtype=np.float64)
    cue_frames = [event["frame"] / cues["fps"] for event in cues["events"]]

    for index, cue in enumerate(cue_frames):
        start = int(cue * SR)
        length = min(n - start, int(0.65 * SR))
        if length <= 0:
            continue
        tt = np.arange(length) / SR
        env = np.exp(-tt * 10.0) * (1.0 - np.exp(-tt * 160.0))
        low = np.sin(2 * math.pi * 58.0 * tt) * env * 0.32
        click = np.sin(2 * math.pi * (1_250.0 + index * 90.0) * tt) * env * 0.045
        grain = rng.standard_normal(length) * env * 0.008
        hit = low + click + grain
        mix[start:start + length] += hit

    # A barely-there high tick on the final hold, so the last frame still moves.
    start = int(8.85 * SR)
    tt = np.arange(n - start) / SR
    tail = np.sin(2 * math.pi * 1_760.0 * tt) * np.exp(-tt * 5.0) * 0.018
    mix[start:] += tail

    mono = bed + mix
    # Slight stereo width without phasing: 9 samples of delay on the right.
    left = mono
    right = np.concatenate([np.zeros(9), mono[:-9]])
    stereo = np.stack([left, right], axis=1)
    stereo *= 0.70 / max(1e-9, np.max(np.abs(stereo)))

    out = ROOT / "assets" / "score.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    wav_write(out, stereo)
    print(f"wrote {out} ({out.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
