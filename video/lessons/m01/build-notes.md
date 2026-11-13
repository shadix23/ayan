# M01 video: build notes

Date: 13.11.2026. Result: `dist/media/M01/0.1.0/` (lesson.mp4 3.29 MB, 54.1 s, 1280x720, 30 fps, H.264/AAC).

## Tools actually used
- Voice: ElevenLabs through the Claude connector, voice "El - Calm & Friendly - Character", model eleven_v4, one take, 682 credits. No voice cloning.
- Mascot: PNG sequences rendered from `assets-src/ayan.blend` with Blender 5.3.0 (EEVEE), script `assets-src/render_video_frames.py`.
- Assembly and render: Remotion 4.0.484 (`video/`). The "VideoCraft" skill named in the brief is not installed; the installed `video-shotcraft` skill is for product promos and was not used.
- Audio analysis: ffmpeg bundled with Remotion (silencedetect).

## Rebuild
```bash
# 1. mascot frames (about 4 minutes), written to video/public/ayan (not in git)
/Applications/Blender.app/Contents/MacOS/Blender -b assets-src/ayan.blend -P assets-src/render_video_frames.py -- Idle Explain Wave PointLeft Think Nod
# 2. timing, captions and transcripts from the real audio
cd video && npm install && node scripts/timing.mjs m01
# 3. video and poster
npx remotion render src/index.ts M01 out/m01/lesson.mp4 --codec h264 --crf 21 --audio-bitrate 128k
npx remotion still src/index.ts M01 out/m01/poster.png --frame 640
```
The voiceover file `video/public/m01/audio.ru.mp3` is kept in git: regenerating it costs credits and gives a different take.

## Checks done
- 19 speech segments found, 19 expected from the script; speaking rate 15 chars/s, uniform (the script fails otherwise).
- Pauses in the final MP4 are at 6.44-7.59, 13.46-14.55, 24.27-25.41, 32.28-33.41, 38.92-40.06, 46.00-47.14 s: they match the timing file, so scenes and captions follow the voice.
- Peak -4.2 dBFS, no clipped samples. No music bed.
- Figures are drawn from exact angles (4 x 90 degrees; counterexample 135/45/90/90). Text is rendered with Nunito, not generated as an image.
- Still camera, slow fades, no flashes.

## Not done
- A teacher has not reviewed the script or the video: status `review`. It is shown only in the demo, with a label.
- Nobody listened to the take for wrong word stress; this needs a human ear.
- No separate reduced-motion cut: the player offers captions and the full transcript instead.
- Kazakh audio is a later stage; Kazakh captions need a native check.
