// Child-process environment and Claude binary discovery.
// Guardrails (BUILD-PROMPT §3): the AI is the user's own `claude` program. We never read, copy, log,
// store or forward credentials; we only strip API-key variables so the subscription login is used.
import { existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

export const BLOCKED_ENV = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN"];

// Environment for every child we spawn. ELEVENLABS_API_KEY is also removed: only the server's own
// voice stage uses it (in memory), never a Claude run or a render.
export const childEnv = (base = process.env) => {
  const env = { ...base };
  for (const k of Object.keys(env)) {
    if (BLOCKED_ENV.includes(k.toUpperCase()) || k.toUpperCase() === "ELEVENLABS_API_KEY") delete env[k];
  }
  // Make sure node/npm are reachable by children (Claude's Bash tool runs `npm run typecheck`).
  const nodeDir = path.dirname(process.execPath);
  const sep = process.platform === "win32" ? ";" : ":";
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  if (!String(env[pathKey] ?? "").toLowerCase().includes(nodeDir.toLowerCase())) env[pathKey] = `${nodeDir}${sep}${env[pathKey] ?? ""}`;
  return env;
};

export const presentBlockedEnv = (base = process.env) => Object.keys(base).filter((k) => BLOCKED_ENV.includes(k.toUpperCase()));

const exe = process.platform === "win32" ? "claude.exe" : "claude";

const onPath = () => {
  try {
    const cmd = process.platform === "win32" ? "where.exe" : "which";
    const out = execFileSync(cmd, ["claude"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 });
    const first = out.split(/\r?\n/).map((s) => s.trim()).find((s) => s && (process.platform !== "win32" || /\.(exe|cmd)$/i.test(s)));
    return first || null;
  } catch {
    return null;
  }
};

// The VS Code / Cursor extensions ship the same official native binary.
const fromEditorExtensions = () => {
  const home = os.homedir();
  for (const dir of [".vscode/extensions", ".cursor/extensions", ".vscode-insiders/extensions"]) {
    const base = path.join(home, dir);
    if (!existsSync(base)) continue;
    const exts = readdirSync(base).filter((d) => d.startsWith("anthropic.claude-code-")).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const e of exts) {
      const p = path.join(base, e, "resources", "native-binary", exe);
      if (existsSync(p)) return p;
    }
  }
  return null;
};

// `npm install -g` creates claude.cmd on Windows. Node refuses to spawn .cmd files without a shell, and a
// shell would expose the prompt arguments to cmd.exe parsing, so resolve the shim to what it runs:
// the package's native binary, or node + its JS entry point. Returns { path, prefix } or null.
export const resolveShim = (file) => {
  if (!/\.(cmd|bat)$/i.test(file)) return { path: file, prefix: [] };
  const pkg = path.join(path.dirname(file), "node_modules", "@anthropic-ai", "claude-code");
  for (const exe of [path.join(pkg, "bin", "claude.exe"), path.join(pkg, "claude.exe")]) if (existsSync(exe)) return { path: exe, prefix: [] };
  for (const js of ["cli.js", "cli.mjs"]) if (existsSync(path.join(pkg, js))) return { path: process.execPath, prefix: [path.join(pkg, js)] };
  return null;
};

let cached;
export const findClaude = ({ fresh = false } = {}) => {
  if (cached !== undefined && !fresh) return cached;
  const override = process.env.STUDIO_CLAUDE_BIN;
  const home = os.homedir();
  const candidates = [
    override && existsSync(override) ? { path: override, source: "STUDIO_CLAUDE_BIN" } : null,
    (() => { const p = onPath(); return p ? { path: p, source: "PATH" } : null; })(),
    ...[path.join(home, ".local", "bin", exe), path.join(home, ".claude", "local", exe)].map((p) => (existsSync(p) ? { path: p, source: "native install" } : null)),
    (() => { const p = fromEditorExtensions(); return p ? { path: p, source: "editor extension" } : null; })(),
  ]
    .filter(Boolean)
    .map((c) => { const r = resolveShim(c.path); return r ? { ...c, path: r.path, prefix: r.prefix, shim: r.path !== c.path ? c.path : undefined } : null; })
    .filter(Boolean);
  cached = candidates[0] ?? null;
  return cached;
};

export const INSTALL_HINT =
  process.platform === "win32"
    ? 'irm https://claude.ai/install.ps1 | iex   (PowerShell)  — or: npm install -g @anthropic-ai/claude-code'
    : "curl -fsSL https://claude.ai/install.sh | bash   — or: npm install -g @anthropic-ai/claude-code";
