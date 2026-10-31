#!/usr/bin/env python3
"""Render the 10 s Wealth OS reel deterministically with Playwright + ffmpeg.

Usage:
    python video/render.py            # full 300-frame render + encode
    python video/render.py --preview  # render five stills only, no encode

The picture is a pure function of the frame number: scene.html exposes
window.renderAt(frame). All timing comes from cues.json. The same frame
is rendered three times and compared byte-for-byte before the full run.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import imageio_ffmpeg
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
CUES = json.loads((ROOT / "cues.json").read_text(encoding="utf-8"))
FPS = int(CUES["fps"])
FRAMES = int(CUES["frames"])
WIDTH = int(CUES["width"])
HEIGHT = int(CUES["height"])
PORT = 8812
OUT = ROOT / "out" / "wealth-os-reel.mp4"
FRAME_DIR = ROOT / "_frames"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):  # keep the render log readable
        pass


def start_server() -> ThreadingHTTPServer:
    handler = lambda *a, **kw: QuietHandler(*a, directory=str(PROJECT), **kw)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, text=True, encoding="utf-8", errors="replace", capture_output=True)


def parse_probe(ffmpeg: str, path: Path) -> dict:
    info = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(path)],
        text=True, encoding="utf-8", errors="replace",
        capture_output=True,
    ).stderr
    duration = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", info)
    video = re.search(r"Video: .*?(\d{2,5})x(\d{2,5}).*?(\d+(?:\.\d+)?) fps", info)
    audio = "Audio: aac" in info
    seconds = None
    if duration:
        h, m, s = duration.groups()
        seconds = int(h) * 3600 + int(m) * 60 + float(s)
    return {
        "duration_seconds": seconds,
        "video": {"width": int(video.group(1)), "height": int(video.group(2)), "fps": float(video.group(3))} if video else None,
        "audio_aac": audio,
    }


def parse_frames(ffmpeg: str, path: Path) -> int:
    log = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(path), "-f", "null", "-"],
        text=True, encoding="utf-8", errors="replace",
        capture_output=True,
    ).stderr
    matches = re.findall(r"frame=\s*(\d+)", log)
    return int(matches[-1]) if matches else -1


def parse_loudness(ffmpeg: str, path: Path) -> dict:
    log = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
        text=True, encoding="utf-8", errors="replace",
        capture_output=True,
    ).stderr
    integrated = re.findall(r"I:\s*(-?\d+(?:\.\d+)?) LUFS", log)
    peak = re.findall(r"Peak:\s*(-?\d+(?:\.\d+)?) dBFS", log)
    return {
        "integrated_lufs": float(integrated[-1]) if integrated else None,
        "true_peak_dbfs": float(peak[-1]) if peak else None,
    }


def master_audio(ffmpeg: str, source: Path, dest: Path) -> None:
    """Two-pass EBU R128 normalisation.

    The source has a deliberate peaky click bed. Target -12.5 LUFS / -1.5 dBTP
    so that after limiting the integrated result lands near -14 LUFS.
    """
    first = subprocess.run(
        [
            ffmpeg, "-hide_banner", "-i", str(source),
            "-af", "loudnorm=I=-12.5:TP=-1.5:LRA=7:print_format=json",
            "-f", "null", "-",
        ],
        text=True, encoding="utf-8", errors="replace",
        capture_output=True,
    ).stderr
    start = first.rfind("{")
    end = first.rfind("}")
    if start < 0 or end < start:
        raise RuntimeError("loudnorm did not return JSON")
    measured = json.loads(first[start:end + 1])
    second = (
        "loudnorm=I=-12.5:TP=-1.5:LRA=7"
        f":measured_I={measured['input_i']}"
        f":measured_TP={measured['input_tp']}"
        f":measured_LRA={measured['input_lra']}"
        f":measured_thresh={measured['input_thresh']}"
        f":offset={measured['target_offset']}"
        ":linear=true:print_format=summary"
    )
    run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(source), "-af", second, "-ar", "48000", str(dest),
    ])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()

    score = ROOT / "assets" / "score.wav"
    if not score.exists():
        subprocess.run([sys.executable, str(ROOT / "make_score.py")], check=True)

    server = start_server()
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    FRAME_DIR.mkdir(parents=True, exist_ok=True)
    report = {
        "fps": FPS,
        "frames_expected": FRAMES,
        "size": [WIDTH, HEIGHT],
        "cues": "video/cues.json",
        "font_checks": {},
        "determinism": {},
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=1)
            page.goto(f"http://127.0.0.1:{PORT}/video/scene.html", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_function("window.__ready === true", timeout=60000)
            page.wait_for_timeout(250)

            fonts = page.evaluate(
                """() => ({
                  publicSans: document.fonts.check('13px "Public Sans"'),
                  dmMono400: document.fonts.check('400 12px "DM Mono"'),
                  dmMono500: document.fonts.check('500 12px "DM Mono"')
                })"""
            )
            report["font_checks"] = fonts
            if not all(fonts.values()):
                raise RuntimeError(f"font fallback detected: {fonts}")

            test_frames = [42, 120, 198, 280]
            for frame in test_frames:
                hashes = []
                for _ in range(3):
                    page.evaluate("frame => window.renderAt(frame)", frame)
                    page.wait_for_timeout(12)
                    hashes.append(hashlib.sha256(page.screenshot(type="png")).hexdigest())
                report["determinism"][str(frame)] = {
                    "hashes": hashes,
                    "identical": len(set(hashes)) == 1,
                }
                if len(set(hashes)) != 1:
                    raise RuntimeError(f"frame {frame} is not deterministic: {hashes}")

            if args.preview:
                preview_dir = ROOT / "out" / "preview"
                preview_dir.mkdir(parents=True, exist_ok=True)
                for frame in [0, 42, 120, 198, 264, 299]:
                    page.evaluate("frame => window.renderAt(frame)", frame)
                    page.wait_for_timeout(20)
                    page.screenshot(path=str(preview_dir / f"frame-{frame:03d}.png"))
                print(f"preview written to {preview_dir}")
                browser.close()
                return 0

            for frame in range(FRAMES):
                page.evaluate("frame => window.renderAt(frame)", frame)
                page.wait_for_timeout(8)
                page.screenshot(path=str(FRAME_DIR / f"frame_{frame:04d}.png"))
                if frame % 30 == 0:
                    print(f"frame {frame:03d}/{FRAMES - 1:03d}")
            browser.close()

        # Sample luminance: a completely flat black frame would fail the reel.
        samples = []
        for frame in [0, 42, 120, 198, 264, 299]:
            path = FRAME_DIR / f"frame_{frame:04d}.png"
            with Image.open(path) as image:
                gray = image.convert("L")
                extrema = gray.getextrema()
                samples.append({"frame": frame, "min": extrema[0], "max": extrema[1]})
        report["luminance_samples"] = samples

        OUT.parent.mkdir(parents=True, exist_ok=True)
        mastered = ROOT / "assets" / "score_mastered.wav"
        master_audio(ffmpeg, score, mastered)
        cmd = [
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
            "-framerate", str(FPS), "-i", str(FRAME_DIR / "frame_%04d.png"),
            "-i", str(mastered),
            "-vf", f"scale={WIDTH}:{HEIGHT}:flags=lanczos,format=yuv420p",
            "-c:v", "libx264", "-profile:v", "high", "-level", "4.2",
            "-preset", "slow", "-crf", "16", "-g", "60",
            "-x264-params", "aq-mode=3",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-shortest", "-movflags", "+faststart",
            "-metadata", "title=Wealth OS — Product Reel",
            str(OUT),
        ]
        run(cmd)
        shutil.rmtree(FRAME_DIR, ignore_errors=True)

        probe = parse_probe(ffmpeg, OUT)
        frames = parse_frames(ffmpeg, OUT)
        loud = parse_loudness(ffmpeg, OUT)
        report.update({"output": "video/out/wealth-os-reel.mp4", "probe": probe, "decoded_frames": frames, "loudness": loud})
        report["duration_ok"] = abs((probe["duration_seconds"] or 0) - CUES["duration"]) < 0.05
        report["frames_ok"] = frames == FRAMES
        report["loudness_ok"] = (
            loud["integrated_lufs"] is not None
            and -15.5 <= loud["integrated_lufs"] <= -12.5
            and loud["true_peak_dbfs"] is not None
            and loud["true_peak_dbfs"] <= -1.0
        )
        report["pass"] = all([
            report["duration_ok"], report["frames_ok"], report["loudness_ok"],
            probe["audio_aac"], all(v["identical"] for v in report["determinism"].values()),
            all(s["max"] > 32 for s in samples),
        ])
        (OUT.parent / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0 if report["pass"] else 1
    finally:
        server.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
