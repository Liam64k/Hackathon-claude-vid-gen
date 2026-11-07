// Claude sign-in and sign-out, against a fake `claude` (STUDIO_CLAUDE_BIN) that only knows `auth status`,
// `auth logout` and `--version`. No real login, no Terminal window (STUDIO_NO_OPEN).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(os.tmpdir(), "studio-auth-"));
const bin = path.join(dir, "claude");
const signedIn = path.join(dir, "signed-in");
writeFileSync(bin, `#!/bin/bash
case "$1 $2" in
  "auth status") if [ -f "${signedIn}" ]; then echo '{"loggedIn": true, "authMethod": "claude.ai", "subscriptionType": "pro"}'; else echo '{"loggedIn": false, "authMethod": "none"}'; fi ;;
  "auth logout") rm -f "${signedIn}" ;;
  *) echo "9.9.9 (Claude Code)" ;;
esac
`);
chmodSync(bin, 0o755);
writeFileSync(signedIn, "");
process.env.STUDIO_CLAUDE_BIN = bin;
process.env.STUDIO_MODE = "replay";
process.env.STUDIO_NO_OPEN = "1";
process.env.STUDIO_PORT = String(45000 + Math.floor(Math.random() * 900));

let srv;
const call = async (p, method = "GET") => {
  const r = await fetch(`http://127.0.0.1:${srv.port}${p}`, { method, headers: { "x-studio-token": srv.token } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const waitFor = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };

before(async () => { srv = await (await import("../server.mjs")).start(); });
after(() => { srv?.server.close(); rmSync(dir, { recursive: true, force: true }); });

test("signed in: status shows the plan; Connect says already connected", async () => {
  const st = (await call("/api/status?fresh=1")).body;
  assert.equal(st.claude.loggedIn, true);
  assert.equal(st.claude.plan, "pro");
  assert.equal((await call("/api/connect", "POST")).body.connected, true);
});

test("sign out runs claude auth logout and the status turns signed out", async () => {
  const r = await call("/api/logout", "POST");
  assert.equal(r.status, 200);
  assert.equal(r.body.signedOut, true);
  assert.equal(existsSync(signedIn), false);
  assert.equal((await call("/api/status")).body.claude.loggedIn, false);
});

test("Connect starts a fresh sign-in each time; Cancel resets it", async () => {
  const a = await call("/api/connect", "POST");
  assert.equal(a.status, 202);
  assert.equal(a.body.opened, false);
  assert.match(a.body.command, /auth login/);
  assert.equal((await call("/api/status")).body.connect.pending, true);
  const t1 = (await call("/api/status")).body.connect.startedAt;
  await new Promise((r) => setTimeout(r, 20));
  await call("/api/connect", "POST");
  assert.ok((await call("/api/status")).body.connect.startedAt > t1, "a second Connect starts over");
  await call("/api/connect/cancel", "POST");
  assert.equal((await call("/api/status")).body.connect.pending, false);
});

test("finishing the sign-in in the terminal turns Studio green by itself", async () => {
  await call("/api/connect", "POST");
  writeFileSync(signedIn, ""); // what `claude auth login` does when the user completes it
  assert.ok(await waitFor(async () => { const s = (await call("/api/status")).body; return s.claude.loggedIn && !s.connect.pending; }));
});
