// Measures the real voiceover and builds the scene timing, captions and transcript from it.
// Usage (from video/): node scripts/timing.mjs m01
// Input:  lessons/<id>/script.json, public/<id>/audio.ru.mp3
// Output: src/<id>.timing.json, out/<id>/captions.ru.vtt, captions.kk.vtt, transcript.ru.md, transcript.kk.md
// The take is one recording. Speech segments are found with ffmpeg silencedetect and mapped onto the sentences
// of the script in order. The script fails if the number of segments or the speaking rate does not fit,
// so a wrong mapping cannot silently produce shifted captions.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';

const id = (process.argv[2] || 'm01').toLowerCase();
const script = JSON.parse(fs.readFileSync(`lessons/${id}/script.json`, 'utf8'));
const audio = `public/${id}/audio.ru.mp3`;
const LEAD = 0.9, GAP = 0.9, TAIL = 2.2, PAD_IN = 0.08, PAD_OUT = 0.14, FPS = 30;

let log = '';
try { log = execFileSync('npx', ['remotion', 'ffmpeg', '-hide_banner', '-i', audio, '-af', 'silencedetect=noise=-38dB:d=0.25', '-f', 'null', '-'], {stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8'}); }
catch (e) { log = String(e.stdout || '') + String(e.stderr || ''); }
// ffmpeg prints to stderr even on success
if (!/silence_start|Duration/.test(log)) { const r = execFileSync('sh', ['-c', `npx remotion ffmpeg -hide_banner -i ${audio} -af silencedetect=noise=-38dB:d=0.25 -f null - 2>&1 || true`], {encoding: 'utf8'}); log = r; }
const dur = (() => { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(log); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : NaN; })();
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
if (!Number.isFinite(dur) || !starts.length) throw Error('ffmpeg silencedetect gave no data');
// speech segments = gaps between silences
const speech = []; let cursor = 0;
for (let i = 0; i < starts.length; i++) { if (starts[i] - cursor > 0.12) speech.push([cursor, starts[i]]); cursor = ends[i] ?? dur; }
if (dur - cursor > 0.12) speech.push([cursor, dur]);

const sentences = script.lines.flatMap(l => l.sentences.map(s => ({line: l.id, ...s})));
const expected = sentences.reduce((n, s) => n + (s.segments || 1), 0);
if (speech.length !== expected) throw Error(`Found ${speech.length} speech segments, the script expects ${expected}. Check the take or the "segments" hints.`);
let k = 0;
for (const s of sentences) { const n = s.segments || 1; s.srcStart = speech[k][0]; s.srcEnd = speech[k + n - 1][1]; k += n; s.rate = s.ru.length / (s.srcEnd - s.srcStart); }
const rates = sentences.filter(s => s.ru.length > 15).map(s => s.rate), mean = rates.reduce((a, b) => a + b, 0) / rates.length;
const off = sentences.filter(s => s.ru.length > 15 && (s.rate < mean * 0.6 || s.rate > mean * 1.5));
if (off.length) throw Error('Speaking rate does not fit for: ' + off.map(s => s.ru).join(' | '));

// Final timeline: each line keeps its own audio, lines are spaced with calm pauses.
let t = LEAD; const lines = [];
for (const l of script.lines) {
  const ss = sentences.filter(s => s.line === l.id);
  const srcStart = Math.max(0, ss[0].srcStart - PAD_IN), srcEnd = Math.min(dur, ss.at(-1).srcEnd + PAD_OUT);
  const start = t, end = t + (srcEnd - srcStart);
  lines.push({id: l.id, srcStart: +srcStart.toFixed(3), srcEnd: +srcEnd.toFixed(3), start: +start.toFixed(3), end: +end.toFixed(3),
    sentences: ss.map(s => ({ru: s.ru, kk: s.kk, start: +(start + s.srcStart - srcStart).toFixed(3), end: +(start + s.srcEnd - srcStart).toFixed(3)}))});
  t = end + GAP;
}
const duration = +(t - GAP + TAIL).toFixed(3);
const hash = crypto.createHash('sha256').update(fs.readFileSync(audio)).digest('hex');
fs.writeFileSync(`src/${id}.timing.json`, JSON.stringify({lessonId: script.lessonId, scriptVersion: script.scriptVersion, fps: FPS, audio: `${id}/audio.ru.mp3`, audioSha256: hash, sourceDuration: dur, duration, durationInFrames: Math.ceil(duration * FPS), lines}, null, 1) + '\n');

// Captions: one cue per sentence, a very short opener joins the next one; long cues wrap into two lines.
const ts = s => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
const wrap = text => { if (text.length <= 44) return text; const mid = text.length / 2; let best = -1; for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i; return text.slice(0, best) + '\n' + text.slice(best + 1); };
function vtt(lang) {
  const cues = [];
  for (const l of lines) { const ss = l.sentences.map(s => ({text: s[lang], start: s.start, end: s.end}));
    for (let i = 0; i < ss.length; i++) { if (i + 1 < ss.length && ss[i].text.length < 12) { ss[i + 1] = {text: ss[i].text + ' ' + ss[i + 1].text, start: ss[i].start, end: ss[i + 1].end}; continue; }
      const next = ss[i + 1]; cues.push({start: Math.max(0, ss[i].start - 0.05), end: next ? next.start - 0.05 : l.end + 0.25, text: ss[i].text}); } }
  return 'WEBVTT\n\nNOTE ' + script.lessonId + ' script ' + script.scriptVersion + ', timed from the real voiceover (' + hash.slice(0, 12) + '). ' + (lang === 'kk' ? 'Kazakh text is a caption translation of the Russian audio.' : 'Russian audio.') + '\n\n'
    + cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${wrap(c.text)}\n`).join('\n');
}
fs.mkdirSync(`out/${id}`, {recursive: true});
for (const lang of ['ru', 'kk']) {
  fs.writeFileSync(`out/${id}/captions.${lang}.vtt`, vtt(lang));
  fs.writeFileSync(`out/${id}/transcript.${lang}.md`, `# ${script.lessonId}: ${lang === 'kk' ? 'мәтін' : 'расшифровка'}\n\n` + lines.map(l => l.sentences.map(s => s[lang]).join(' ')).join('\n\n') + '\n');
}
console.log(JSON.stringify({segments: speech.length, meanCharsPerSec: +mean.toFixed(1), sourceDuration: dur, duration, lines: lines.map(l => [l.id, l.start, l.end])}));
