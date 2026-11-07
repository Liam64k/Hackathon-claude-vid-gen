// Legal and safety guardrails (BUILD-PROMPT §3), enforced in code and checked here.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import http from "node:http";
import { APP, ROOT, resolveServed } from "../lib/paths.mjs";
import { childEnv, BLOCKED_ENV } from "../lib/env.mjs";
import { buildArgs } from "../engine/claude.mjs";
import { safetyIssues } from "../lib/validate.mjs";
import { setElevenKey, redact } from "../lib/secrets.mjs";

const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (["node_modules", ".runtime", "fixtures", "test"].includes(f)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(mjs|js|json|html|css)$/.test(f)) out.push(p);
  }
  return out;
};
const SOURCES = walk(APP);

test("claude args: never --bare, never skip-permissions; always -p + stream-json + no prompts", () => {
  const a = buildArgs({ model: "opus", effort: "high", allowedTools: ["Read", "Write"], budget: 1, systemPrompt: "x" });
  assert.ok(!a.includes("--bare"));
  assert.ok(!a.some((x) => /dangerously|skip-permissions/.test(x)));
  for (const need of ["-p", "stream-json", "--verbose", "--include-partial-messages", "acceptEdits", "--permission-prompts", "none", "--max-budget-usd", "--allowedTools"]) assert.ok(a.includes(need), need);
  assert.equal(a[a.indexOf("--allowedTools") + 1], "Read,Write");
});

test("child env has no API-key or token variables (any case), but keeps PATH", () => {
  const env = childEnv({ PATH: "/usr/bin", ANTHROPIC_API_KEY: "sk-ant-x", anthropic_auth_token: "t", CLAUDE_CODE_OAUTH_TOKEN: "o", ELEVENLABS_API_KEY: "sk_e", HOME: "/h" });
  for (const k of [...BLOCKED_ENV, "ELEVENLABS_API_KEY"]) assert.ok(!Object.keys(env).some((x) => x.toUpperCase() === k), k);
  assert.ok(env.PATH.includes("/usr/bin"));
  assert.equal(env.HOME, "/h");
});

test("no source file touches Claude credentials, setup-token or the OAuth env var", () => {
  for (const f of SOURCES) {
    const s = readFileSync(f, "utf8");
    assert.ok(!s.includes(".credentials.json"), `${f} mentions .credentials.json`);
    assert.ok(!/["'`]setup-token["'`]\s*[\],)]/.test(s) || f.endsWith("claude.mjs"), `${f} runs setup-token`);
    assert.ok(!/security\s+find-generic-password|keychain/i.test(s), `${f} touches the keychain`);
    assert.ok(!/process\.env\.CLAUDE_CODE_OAUTH_TOKEN/.test(s), `${f} reads CLAUDE_CODE_OAUTH_TOKEN`);
    assert.ok(!/"--bare"\s*[,)\]]/.test(s) || f.endsWith("claude.mjs"), `${f} passes --bare`);
  }
  // the only "setup-token"/"--bare" mentions live in the forbidden list
  const c = readFileSync(path.join(APP, "engine", "claude.mjs"), "utf8");
  assert.match(c, /FORBIDDEN_ARGS = \[.*"--bare".*"setup-token"\]/);
});

test("no secrets in files: no key-shaped strings anywhere in app/ or episode state", () => {
  const files = [...SOURCES, ...(existsSync(path.join(ROOT, "episodes")) ? walk(path.join(ROOT, "episodes")) : [])];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/sk-ant-[A-Za-z0-9_-]{20,}/.test(s), `${f} contains an Anthropic key`);
    assert.ok(!/\bsk_[a-f0-9]{40,}\b/.test(s), `${f} contains an ElevenLabs key`);
    assert.ok(!/ELEVENLABS_API_KEY\s*=\s*\S+/.test(s), `${f} assigns ELEVENLABS_API_KEY`);
  }
  const gi = readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.match(gi, /^\.env\*$/m);
});

test("ElevenLabs key typed in the UI stays in memory and is redacted from messages", () => {
  setElevenKey("sk_abcdef0123456789abcdef");
  assert.equal(redact("failed with sk_abcdef0123456789abcdef"), "failed with [key]");
  setElevenKey("");
});

test("/files is restricted to episodes/, out/ and public/", () => {
  assert.ok(resolveServed("episodes/x/cover.png"));
  assert.ok(resolveServed("out/storyboard.png"));
  assert.equal(resolveServed("../../etc/passwd"), null);
  assert.equal(resolveServed("src/shots.ts"), null);
  assert.equal(resolveServed("episodes/../package.json"), null);
  assert.equal(resolveServed("%2e%2e/package.json"), null);
  assert.equal(resolveServed("app/server.mjs"), null);
});

test("survival safety filter blocks weapons, chemistry, doses, electricity, gore", () => {
  assert.deepEqual(safetyIssues("How to help a friend who fell through the ice"), []);
  assert.deepEqual(safetyIssues("carbon monoxide poisoning in an ice shack"), []);
  assert.deepEqual(safetyIssues("A bomb cyclone hits the lake; the first dose of cold shock hits hard"), []);
  for (const t of ["build a bomb in the cabin", "how many mg of ibuprofen", "grab the downed power line", "mix household chemicals", "gory frostbite"]) assert.ok(safetyIssues(t).length, t);
});

// ---- the server: 127.0.0.1 only, token required, host and origin checked ----
let srv;
const req = (opts, body) =>
  new Promise((resolve, reject) => {
    const r = http.request({ host: "127.0.0.1", port: srv.port, ...opts }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });

before(async () => {
  process.env.STUDIO_NO_OPEN = "1";
  process.env.STUDIO_PORT = String(47000 + Math.floor(Math.random() * 1000));
  process.env.STUDIO_MODE = "replay";
  const { start } = await import("../server.mjs");
  srv = await start();
});
after(() => srv?.server.close());

test("server listens on 127.0.0.1 only", () => {
  assert.equal(srv.server.address().address, "127.0.0.1");
});

test("server rejects requests without the token (and with a wrong one)", async () => {
  const host = `127.0.0.1:${srv.port}`;
  assert.equal((await req({ path: "/api/status", headers: { host } })).status, 401);
  assert.equal((await req({ path: "/api/status", headers: { host, "x-studio-token": "nope" } })).status, 401);
  assert.equal((await req({ path: "/files/out/storyboard.png", headers: { host } })).status, 401);
  assert.equal((await req({ path: "/api/events", headers: { host } })).status, 401);
  const ok = await req({ path: "/api/status", headers: { host, "x-studio-token": srv.token } });
  assert.equal(ok.status, 200);
  assert.equal(JSON.parse(ok.body).mode, "replay");
});

test("server refuses foreign Host headers (DNS rebinding) and cross-origin writes", async () => {
  assert.equal((await req({ path: "/api/status", headers: { host: `evil.example:${srv.port}`, "x-studio-token": srv.token } })).status, 421);
  const r = await req({ path: "/api/cancel", method: "POST", headers: { host: `127.0.0.1:${srv.port}`, origin: "http://evil.example", "x-studio-token": srv.token } });
  assert.equal(r.status, 403);
});

test("files: malformed URLs are refused, Range suffixes clamp, HEAD sends no body", async () => {
  const host = `127.0.0.1:${srv.port}`;
  const t = { host, "x-studio-token": srv.token };
  assert.equal(resolveServed("%E0%A4%A"), null);
  assert.equal((await req({ path: "/files/out/%E0%A4%A", headers: t })).status, 403);
  const whole = await req({ path: "/files/out/style/cast-sheet.png", headers: { ...t, range: "bytes=-999999999" } });
  assert.equal(whole.status, 206, "suffix longer than the file returns the whole file");
  const head = await req({ path: "/files/out/style/cast-sheet.png", method: "HEAD", headers: { ...t, range: "bytes=0-9" } });
  assert.equal(head.status, 206);
  assert.equal(head.body.length, 0);
  assert.equal((await req({ path: "/files/out/nope.png", headers: t })).status, 404);
});

test("an npm-installed claude.cmd shim is resolved to its real target, never run through a shell", async () => {
  const { resolveShim } = await import("../lib/env.mjs");
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const os = await import("node:os");
  const dir = mkdtempSync(path.join(os.tmpdir(), "shim-"));
  try {
    assert.deepEqual(resolveShim(path.join(dir, "claude.exe")), { path: path.join(dir, "claude.exe"), prefix: [] });
    assert.equal(resolveShim(path.join(dir, "claude.cmd")), null, "unknown shim layout is skipped, not spawned");
    const pkg = path.join(dir, "node_modules", "@anthropic-ai", "claude-code");
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, "cli.js"), "");
    const r = resolveShim(path.join(dir, "claude.cmd"));
    assert.equal(r.path, process.execPath);
    assert.deepEqual(r.prefix, [path.join(pkg, "cli.js")]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the UI shell loads without the token but holds no data", async () => {
  const r = await req({ path: "/", headers: { host: `127.0.0.1:${srv.port}` } });
  assert.equal(r.status, 200);
  assert.match(r.body, /<main/);
  assert.ok(!r.body.includes(srv.token));
});

test("safety: disaster scenario words are allowed, how-to harm is still blocked", () => {
  for (const ok of ["what to do if a nuclear bomb goes off", "nuclear war survival", "zombie apocalypse day one", "fallout shelter first 48 hours", "atomic bomb drill", "bomb cyclone blizzard"]) assert.deepEqual(safetyIssues(ok), [], ok);
  for (const bad of ["how to build a bomb", "make a nuclear bomb", "zombie gore", "best gun for zombies", "build an atomic bomb at home", "a pipe bomb", "napalm"]) assert.ok(safetyIssues(bad).length > 0, bad);
});
