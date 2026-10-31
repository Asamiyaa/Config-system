# Wealth OS · Product Reel

A deterministic 10-second product reel for the redesigned Wealth OS, built with the `code-video-pipeline` skill.

## Why this exists

`code-video-pipeline/scripts/audit.mjs` was run against the app first. It correctly reported:

> 这不像 code-gen 视频出片项目（没有找到 renderAt/__ready 契约、Remotion、帧序列编码或 fps+duration 配置）。

Rather than inventing video-specific problems in an app that has no video renderer, this directory adds the smallest useful, reproducible outtake layer:

- one `cues.json` source of timing;
- one `renderAt(frame)` browser scene;
- one Playwright capture + ffmpeg encode pass;
- frame-level determinism checks and a machine-readable report.

The screenshots are captured from the actual redesigned app (demo account), so the reel stays tied to the real product instead of a separate mock UI.

## Output

```text
video/out/wealth-os-reel.mp4
video/out/contact-sheet.png
video/out/report.json
```

- 1920 × 1080
- 30 fps, exactly 300 frames / 10.000 s
- H.264 High, yuv420p, BT.709 flags
- AAC 48 kHz stereo
- measured output: -14.4 LUFS integrated, -1.3 dBTP true peak
- font checks: Public Sans + DM Mono 400/500 loaded
- deterministic checks: frame 42 / 120 / 198 / 280 rendered three times each with identical SHA-256

## Audit

`node <code-video-pipeline>/scripts/audit.mjs video` after the pipeline was added:

```text
score : 94/100
OK   renderAt(t) contract
OK   window.__ready
OK   await document.fonts.ready
OK   cue sheet: cues.json
P2   no motion-blur trace
P2   no concurrency/sharding
NEXT explicit bt709 + aq-mode=3 / motion blur / spec assertions in CI
```

- `bt709` and `aq-mode=3` are now explicit in `render.py`.
- Motion blur is intentionally not added: every shot is a slow 3.5% push, and the only transitions are hard cuts on cue frames. There is no fast action that needs supersampling.
- The 300-frame render is serial and takes roughly one minute on this machine; concurrency is a future speed-up, not a correctness gap.

## Run

```powershell
pip install -r video/requirements.txt
python -m playwright install chromium
python video/render.py
```

Preview six stills without encoding:

```powershell
python video/render.py --preview
```

The bundled `imageio-ffmpeg` binary is used, so a separate ffmpeg install is not required.

## Structure

```text
video/
  cues.json           # frame-number timeline shared by picture and score
  scene.html          # 1920x1080 deterministic browser scene, window.renderAt(frame)
  render.py           # Playwright capture, determinism checks, ffmpeg encode, report
  make_score.py       # deterministic synthesized 48 kHz score
  assets/
    home.png
    health.png
    newconfig.png
    agents.png
  out/
    wealth-os-reel.mp4
    contact-sheet.png
    report.json
```

## Timeline

| Frames | Time | Beat |
|---|---|---|
| 0–41 | 0.0–1.4 s | Title card: **私人操作系统** |
| 42–119 | 1.4–4.0 s | 01 / 工作台 |
| 120–197 | 4.0–6.6 s | 02 / 健康 |
| 198–263 | 6.6–8.8 s | 03 / 新登 |
| 264–299 | 8.8–10.0 s | 04 / 一个系统，全部上下文 |

The last 1.2 s holds the end card with a 0.6% scale breathing move, so it is not a frozen frame.

## Re-rendering after UI changes

1. Re-capture the four screens at 1920×1200 from the running app:
   - `/` home
   - health
   - newconfig
   - agents
2. Replace the four PNGs in `video/assets/`.
3. Run `python video/render.py`.

The scene does not read live data at render time; it uses the captured screenshots as the source of truth. This keeps the output deterministic while preserving the real UI.

## Scope / limits

- No fast camera moves, so no motion-blur supersampling is required. Transitions are hard cuts on cue frames.
- The score is a minimal synthesized bed and click layer, not a licensed music track. See `CREDITS.md`.
- The reel is a product overview, not an interactive app capture; interactions such as the command palette are represented in the screenshots, not performed on camera.
