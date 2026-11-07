// Spawning helpers: no shells, cross-platform tree kill, line streaming, last-lines capture.
import { spawn, execFile } from "node:child_process";
import path from "node:path";
import { ROOT } from "./paths.mjs";
import { childEnv } from "./env.mjs";

export const isWin = process.platform === "win32";

export const killTree = (child, signal = "SIGINT") => {
  if (!child || child.exitCode !== null || child.killed) return;
  try {
    if (isWin) execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
    else process.kill(-child.pid, signal);
  } catch {
    try { child.kill(signal); } catch { /* already gone */ }
  }
};

// Spawn and stream lines. Returns { child, done: Promise<{code, tail, out}>, kill() }.
export const run = (cmd, args, { cwd = ROOT, env = childEnv(), onLine, input, keep = 40, timeoutMs } = {}) => {
  const child = spawn(cmd, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"], detached: !isWin, windowsHide: true });
  const tail = [];
  let out = "";
  let timer;
  const emitLine = (line) => {
    const t = line.trimEnd();
    if (!t) return;
    tail.push(t.length > 400 ? `${t.slice(0, 400)}…` : t);
    if (tail.length > keep) tail.shift();
    onLine?.(t);
  };
  // Lines can straddle chunks: keep a per-stream remainder. "\r" (progress redraws) also ends a line.
  const feeder = () => {
    let rest = "";
    const fn = (buf) => {
      const s = buf.toString();
      out += s;
      if (out.length > 2_000_000) out = out.slice(-1_000_000);
      const parts = (rest + s).split(/\r?\n|\r/);
      rest = parts.pop() ?? "";
      parts.forEach(emitLine);
    };
    fn.flush = () => { if (rest) emitLine(rest); rest = ""; };
    return fn;
  };
  const fo = feeder();
  const fe = feeder();
  child.stdout.on("data", fo);
  child.stderr.on("data", fe);
  child.stdin.on("error", () => {}); // a child that exits early must not crash the server with EPIPE/EOF
  if (input !== undefined) child.stdin.end(input);
  else child.stdin.end();
  const done = new Promise((resolve) => {
    if (timeoutMs) timer = setTimeout(() => { tail.push(`Timed out after ${Math.round(timeoutMs / 1000)} s`); killTree(child); }, timeoutMs);
    child.on("error", (err) => { clearTimeout(timer); resolve({ code: -1, error: err, tail, out }); });
    child.on("close", (code) => { clearTimeout(timer); fo.flush(); fe.flush(); resolve({ code, tail, out }); });
  });
  return { child, done, kill: () => killTree(child) };
};

// The project's own tools, invoked through node directly (same commands as package.json scripts,
// without depending on a shell; works on macOS, Linux and Windows).
const bin = {
  remotion: path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js"),
  tsc: path.join(ROOT, "node_modules", "typescript", "bin", "tsc"),
};
export const remotion = (args, opts) => run(process.execPath, [bin.remotion, ...args], opts);
export const tsc = (args, opts) => run(process.execPath, [bin.tsc, ...args], opts);
