# Credits

## Project media

- UI screenshots in `video/assets/`: captured from this repository's own Wealth OS app using the demo account.
- They contain no third-party photography, stock footage, or fonts outside the licenses below.

## Type

- **Public Sans** — SIL Open Font License 1.1. Source: <https://github.com/uswds/public-sans>. Bundled at `static/fonts/public-sans.woff2`.
- **DM Mono** — SIL Open Font License 1.1. Source: <https://fonts.google.com/specimen/DM+Mono>. Bundled at `static/fonts/dm-mono-400.woff2` and `dm-mono-500.woff2`.

The reel loads both fonts locally from `/static/fonts/`; it does not call Google Fonts at render time.

## Audio

- `make_score.py` synthesizes the complete 10-second score from sine waves, a seeded texture generator, and fixed cue times. No external samples or music recordings are used.
- Seed: `1661905713`. The generated PCM is deterministic for the same Python/NumPy version.

## Code / technique

- Pipeline structure and delivery checks follow the `code-video-pipeline` skill (DSH skills directory).
- `scene.html`, `render.py`, and `make_score.py` are original project code written for this repository.
