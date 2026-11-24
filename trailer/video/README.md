# Wheelie launch trailer

A 60-second, 1920×1080, 60 fps trailer built in code with [Remotion](https://www.remotion.dev/).
The storyboard it follows is in `../storyboard.html`.

## Render

```bash
npm install
pip install numpy scipy          # for the soundtrack
python3 audio/make_soundtrack.py # writes public/soundtrack_raw.wav
ffmpeg -i public/soundtrack_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 public/soundtrack.wav
npx remotion render src/index.ts Trailer out/wheelie-trailer.mp4 --crf=16 --audio-bitrate=320k
```

`npx remotion studio` opens a live preview with a scrubber.
`node stills.mjs 120 900 2400` renders half-size JPEG stills of those frames to `out/stills/`.

`remotion.config.ts` points at a local Chromium headless shell; remove that line to let Remotion download its own.

## Where to change things

| What | Where |
| --- | --- |
| Timing of every beat (frames at 60 fps) | `src/timeline.json` (the soundtrack reads it too) |
| Wheelie's RAM figure in the "For the nerds" shot | `WHEELIE_RAM_MB` in `src/lib.ts` |
| Brand colours and fonts | `C` and `FONT` in `src/lib.ts` |
| The eight wheel tools | `DEFAULT_SLOTS` in `src/components/WheelUI.tsx` |
| Character design | `src/components/Wheelie.tsx` |
| End-card text | `src/scenes/Act4.tsx` (`EndCard`) |

## Structure

- `src/scenes/Chaos.tsx`: Acts 1–2 (0:00–0:27), one continuous desktop: overload, meltdown, rescue, fusion.
- `src/scenes/Act3.tsx`: the wheel, tools, offline, for the nerds, launching apps, custom tools.
- `src/scenes/Act4.tsx`: Alt + Space, more tools, end card.
- `audio/make_soundtrack.py`: music and sound effects, synthesized from scratch (no licensed samples).
