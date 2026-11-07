// Splits one ElevenLabs narration MP3 into one clip per narration line and writes src/audio.json.
// Usage: node scripts/split-voice.mjs <voice.mp3>
// The narration must be generated from LINES in src/shots.ts, pasted as one block with a blank
// line between lines. Cuts are chosen among detected pauses by dynamic programming so each cut
// lands closest to where the text predicts it.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LINES } from "../src/shots.ts";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/split-voice.mjs <voice.mp3>");
const ff = (args) => execFileSync("npx", ["remotion", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
// ffmpeg/ffprobe print their reports on stderr, so capture both streams.
const run = (args) => {
  const r = spawnSync("npx", ["remotion", ...args], { encoding: "utf8" });
  return `${r.stdout ?? ""}${r.stderr ?? ""}`;
};

const total = Number(/Duration: (\d+):(\d+):([\d.]+)/.exec(run(["ffprobe", src])).slice(1).reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0));
const log = run(["ffmpeg", "-i", src, "-af", "silencedetect=noise=-40dB:d=0.18", "-f", "null", "-"]);
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
const sil = starts.map((s, i) => [s, ends[i] ?? s]).filter(([s, e]) => e > s);

const K = LINES.length - 1;
const w = LINES.map((l) => l.text.length);
const sum = w.reduce((a, b) => a + b, 0);
const expected = w.map((_, i) => (w.slice(0, i + 1).reduce((a, b) => a + b, 0) / sum) * total);
const cost = (j, k) => Math.abs((sil[j][0] + sil[j][1]) / 2 - expected[k]) - 3 * (sil[j][1] - sil[j][0]);
if (sil.length < K) throw new Error(`Only ${sil.length} pauses found for ${K} cuts. Regenerate the voice with longer pauses between paragraphs.`);

const n = sil.length;
const dp = Array.from({ length: K }, () => Array(n).fill(Infinity));
const prev = Array.from({ length: K }, () => Array(n).fill(-1));
for (let j = 0; j < n; j++) dp[0][j] = cost(j, 0);
for (let k = 1; k < K; k++)
  for (let j = k; j < n; j++)
    for (let i = 0; i < j; i++) {
      const c = dp[k - 1][i] + cost(j, k);
      if (c < dp[k][j]) {
        dp[k][j] = c;
        prev[k][j] = i;
      }
    }
let best = dp[K - 1].indexOf(Math.min(...dp[K - 1]));
const pick = [];
for (let k = K - 1; k >= 0; k--) {
  pick.unshift(best);
  best = prev[k][best];
}

const cuts = pick.map((j) => sil[j]);
const clipStart = [0, ...cuts.map(([, e]) => e - 0.04)];
const clipEnd = [...cuts.map(([s]) => s + 0.1), total];
mkdirSync("public/voice", { recursive: true });
const audio = JSON.parse(readFileSync("src/audio.json", "utf8"));
audio.voice = {};
let worst = 0;
cuts.forEach(([s, e], k) => (worst = Math.max(worst, Math.abs((s + e) / 2 - expected[k]))));
for (let i = 0; i <= K; i++) {
  ff(["ffmpeg", "-y", "-loglevel", "error", "-ss", clipStart[i].toFixed(3), "-to", clipEnd[i].toFixed(3), "-i", src, "-c:a", "libmp3lame", "-b:a", "160k", `public/voice/line-${i}.mp3`]);
  audio.voice[i] = Number((clipEnd[i] - clipStart[i]).toFixed(2));
}
writeFileSync("src/audio.json", JSON.stringify(audio, null, 2) + "\n");
console.log(`${K + 1} clips written. Total ${total.toFixed(1)} s. Worst cut is ${worst.toFixed(2)} s from the text estimate${worst > 1.5 ? " — CHECK THE CUTS" : ""}.`);
