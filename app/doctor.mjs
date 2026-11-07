// Environment checks. `npm run doctor` prints a pass/fail table with the fix for each failure; the
// server uses the same checks for the Claude pill and the status screen.
import { existsSync, statfsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, APP, EXAMPLE_DIR } from "./lib/paths.mjs";
import { findClaude, presentBlockedEnv, INSTALL_HINT, BLOCKED_ENV } from "./lib/env.mjs";
import { authStatus, version } from "./engine/claude.mjs";
import { remotion, run, isWin } from "./lib/proc.mjs";
import { elevenKeySource } from "./lib/secrets.mjs";
import { EXAMPLE_BUILD } from "./lib/workspace.mjs";

const row = (id, name, status, detail, fix = "") => ({ id, name, status, detail, fix });

const chromeInstalled = () => {
  const base = path.join(ROOT, "node_modules", ".remotion");
  return existsSync(base) && readdirSync(base).some((d) => /chrome/i.test(d));
};

// `fresh` re-runs the PATH lookup (a short synchronous `where`/`which`); the server only does that at
// start-up and on Connect, so status polling never blocks the event loop.
export const checkClaude = async ({ fresh = true } = {}) => {
  const found = findClaude({ fresh });
  if (!found) return { installed: row("claude", "Claude Code installed", "fail", "The `claude` program was not found.", `Install Claude Code: ${INSTALL_HINT}`), auth: null };
  const v = await version();
  const installed = row("claude", "Claude Code installed", "pass", `${v ?? "unknown version"} · ${found.source}`);
  const a = await authStatus();
  const auth = a.loggedIn
    ? row("claude-auth", "Claude signed in", "pass", `${a.authMethod === "claude.ai" ? "Claude subscription" : a.authMethod ?? "signed in"}${a.plan ? ` (${a.plan})` : ""}`)
    : row("claude-auth", "Claude signed in", "fail", "Signed out or the login expired.", "Press Connect in Studio (runs `claude auth login`, Anthropic's own sign-in).");
  return { installed, auth, status: a };
};

export const runDoctor = async ({ quick = false } = {}) => {
  const rows = [];
  const major = Number(process.versions.node.split(".")[0]);
  rows.push(major >= 20 ? row("node", "Node.js 20+", "pass", process.version) : row("node", "Node.js 20+", "fail", process.version, "Install Node.js 20 or newer from nodejs.org."));
  const deps = existsSync(path.join(ROOT, "node_modules", "remotion")) && existsSync(path.join(ROOT, "node_modules", "@remotion", "cli"));
  rows.push(deps ? row("deps", "Project packages", "pass", "node_modules present") : row("deps", "Project packages", "fail", "node_modules missing", "npm ci --ignore-scripts"));
  const el = existsSync(path.join(ROOT, "node_modules", "@elevenlabs", "elevenlabs-js"));
  rows.push(el ? row("eleven-sdk", "ElevenLabs SDK", "pass", "@elevenlabs/elevenlabs-js") : row("eleven-sdk", "ElevenLabs SDK", "fail", "package missing", "npm ci --ignore-scripts"));
  rows.push(chromeInstalled() ? row("browser", "Remotion headless browser", "pass", "installed") : row("browser", "Remotion headless browser", "fail", "not downloaded yet", "npx remotion browser ensure"));

  const c = await checkClaude();
  rows.push(c.installed);
  if (c.auth) rows.push(c.auth);
  const blocked = presentBlockedEnv();
  rows.push(
    blocked.length
      ? row("env", "No API-key variables", "warn", `${blocked.join(", ")} set in your shell. Studio removes them from every Claude run so your subscription login is used.`, `Unset them to be sure: ${isWin ? blocked.map((k) => `Remove-Item Env:${k}`).join("; ") : `unset ${blocked.join(" ")}`}`)
      : row("env", "No API-key variables", "pass", `${BLOCKED_ENV.join(", ")} not set`),
  );

  const ks = elevenKeySource();
  rows.push(ks ? row("eleven-key", "ElevenLabs key", "pass", ks === "env" ? "ELEVENLABS_API_KEY is set" : "entered in Studio (memory only)") : row("eleven-key", "ElevenLabs key", "warn", "Not set: Studio will use a clearly labelled placeholder voice.", "Paste your key on the Voice screen (kept in memory only), or set ELEVENLABS_API_KEY before npm start."));

  if (!quick) {
    const ff = await remotion(["ffmpeg", "-version"], { timeoutMs: 30000 }).done;
    rows.push(ff.code === 0 ? row("ffmpeg", "ffmpeg (bundled with Remotion)", "pass", (ff.out.match(/ffmpeg version (\S+)/)?.[1] ?? "ok")) : row("ffmpeg", "ffmpeg (bundled with Remotion)", "fail", ff.tail.slice(-1)[0] ?? "not runnable", "npm ci --ignore-scripts"));
    const tts = process.platform === "darwin" ? ["say", ["-v", "?"]] : isWin ? ["powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices().Count"]] : ["espeak-ng", ["--version"]];
    const t = await run(tts[0], tts[1], { timeoutMs: 30000 }).done;
    rows.push(t.code === 0 ? row("tts", "Placeholder voice engine", "pass", process.platform === "darwin" ? "macOS say" : isWin ? "Windows speech (SAPI)" : "espeak-ng") : row("tts", "Placeholder voice engine", "warn", "not available", process.platform === "linux" ? "sudo apt install espeak-ng" : "Only needed without an ElevenLabs key"));
  }
  try {
    const s = statfsSync(ROOT);
    const gb = (s.bavail * s.bsize) / 1e9;
    rows.push(gb >= 2 ? row("disk", "Free disk space", "pass", `${gb.toFixed(1)} GB`) : row("disk", "Free disk space", "warn", `${gb.toFixed(1)} GB`, "Free at least 2 GB for renders."));
  } catch { /* statfs unsupported */ }
  rows.push(existsSync(path.join(APP, "pack-catalog.json")) ? row("pack", "Pack: Winter Lake", "pass", "app/pack-catalog.json") : row("pack", "Pack: Winter Lake", "fail", "catalog missing", "Restore app/pack-catalog.json"));
  const replayOk = existsSync(path.join(EXAMPLE_DIR, "script.md")) && (existsSync(path.join(EXAMPLE_BUILD, "episode-phone.mp4")) || existsSync(path.join(ROOT, "out", "episode-phone.mp4")));
  rows.push(replayOk ? row("replay", "Replay assets", "pass", "Ten Minutes Under cached") : row("replay", "Replay assets", "fail", "cached example missing", "Re-unzip the studio kit"));
  return rows;
};

// ---- CLI -------------------------------------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rows = await runDoctor();
  const color = process.stdout.isTTY && !process.env.NO_COLOR;
  const paint = (s, c) => (color ? `\x1b[${c}m${s}\x1b[0m` : s);
  const mark = { pass: paint("PASS", 32), warn: paint("WARN", 33), fail: paint("FAIL", 31) };
  const w = Math.max(...rows.map((r) => r.name.length));
  console.log(`\nStudio doctor — ${ROOT}\n`);
  console.log(`  ${"CHECK".padEnd(w)}  STATUS  DETAIL`);
  console.log(`  ${"-".repeat(w)}  ------  ${"-".repeat(40)}`);
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(w)}  ${mark[r.status]}    ${r.detail}`);
    if (r.status !== "pass" && r.fix) console.log(`  ${" ".repeat(w)}          ${paint("fix:", 36)} ${r.fix}`);
  }
  const fails = rows.filter((r) => r.status === "fail").length;
  const warns = rows.filter((r) => r.status === "warn").length;
  console.log(`\n  ${fails ? paint(`${fails} failed`, 31) : paint("All required checks passed", 32)}${warns ? `, ${warns} warning(s)` : ""}.\n`);
  process.exit(fails ? 1 : 0);
}
