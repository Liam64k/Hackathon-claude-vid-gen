// Replay mode end to end through the real HTTP API: all five stages, zero Claude calls, cached MP4 served.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";
import { EPISODES } from "../lib/paths.mjs";

process.env.STUDIO_MODE = "replay";
process.env.STUDIO_NO_OPEN = "1";
process.env.STUDIO_REPLAY_SPEED = "40";
process.env.STUDIO_PORT = String(48000 + Math.floor(Math.random() * 1000));

let srv;
let claudeCalls = 0;
let slug;
const base = () => `http://127.0.0.1:${srv.port}`;
const call = async (p, method = "GET", body) => {
  const r = await fetch(base() + p, { method, headers: { "x-studio-token": srv.token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${j?.error}`);
  return j;
};
const waitFor = async (stage, status, ms = 30000) => {
  const t0 = Date.now();
  for (;;) {
    const d = await call(`/api/projects/${slug}`);
    const st = d.state.stages[stage];
    if (st.status === status) return d;
    if (st.status === "error") throw new Error(`${stage} failed: ${st.error?.message}`);
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${stage}=${status} (is ${st.status})`);
    await new Promise((r) => setTimeout(r, 60));
  }
};

before(async () => {
  const eng = await import("../engine/claude.mjs");
  eng.claudeCli.run = () => { claudeCalls++; throw new Error("Claude must not be called in replay mode"); };
  const { start } = await import("../server.mjs");
  srv = await start();
});
// every project this file creates; all are deleted at the end (a test may reuse `slug` for its own)
const made = [];
after(async () => {
  await fetch(`${base()}/api/cancel`, { method: "POST", headers: { "x-studio-token": srv.token } }).catch(() => {});
  for (let i = 0; i < 100; i++) {
    const st = await fetch(`${base()}/api/status`, { headers: { "x-studio-token": srv.token } }).then((r) => r.json()).catch(() => ({}));
    if (!st.job) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  srv?.server.close();
  for (const s of made) rmSync(path.join(EPISODES, s), { recursive: true, force: true });
});

test("replay completes all stages with zero Claude calls", { timeout: 120000 }, async () => {
  const st = await call("/api/status");
  assert.equal(st.mode, "replay");
  const created = await call("/api/projects", "POST", { surprise: true, format: "story", length: 90 });
  slug = created.state.slug;
  made.push(slug);
  assert.equal(created.state.mode, "replay");

  let d = await waitFor("ideas", "review");
  assert.equal(d.ideas.length, 5);
  assert.equal(d.ideas[0].title, "Ten Minutes Under");

  await call(`/api/projects/${slug}/stages/ideas/approve`, "POST", { pick: 0 });
  d = await waitFor("script", "review");
  assert.equal(d.lines.length, 16);
  assert.match(d.scriptMd, /Ten Minutes Under/);

  await call(`/api/projects/${slug}/stages/script/approve`, "POST", {});
  d = await waitFor("shots", "review");
  assert.equal(d.stills.length, 39);
  assert.ok(d.storyboard);

  await call(`/api/projects/${slug}/stages/shots/approve`, "POST", { next: false });
  await call(`/api/projects/${slug}/stages/voice/run`, "POST", {});
  d = await waitFor("voice", "review");
  assert.equal(d.clips.length, 16);

  await call(`/api/projects/${slug}/stages/voice/approve`, "POST", {});
  d = await waitFor("render", "review", 60000);
  assert.ok(d.outputs.phone && d.outputs.cover);
  assert.equal(d.titles.titles.length, 3);
  for (const t of d.titles.titles) assert.ok(t.length <= 60);

  // the cached MP4 is served (with byte ranges, so the player can seek)
  const r = await fetch(`${base()}/files/${d.outputs.phone}?t=${srv.token}`, { headers: { range: "bytes=0-99" } });
  assert.equal(r.status, 206);
  assert.equal((await r.arrayBuffer()).byteLength, 100);
  assert.equal(claudeCalls, 0, "no Claude calls in replay");
  assert.ok(existsSync(path.join(EPISODES, slug, "episode-phone.mp4")));
});

test("voice provider none: captions only, empty audio.json, render not blocked", { timeout: 60000 }, async () => {
  const created = await call("/api/projects", "POST", { surprise: true, format: "story", length: 90, voice: { provider: "none" } });
  const s2 = created.state.slug;
  made.push(s2);
  try {
    assert.equal(created.state.voice.provider, "none");
    slug = s2;
    await waitFor("ideas", "review");
    await call(`/api/projects/${s2}/stages/ideas/approve`, "POST", { pick: 0 });
    await waitFor("script", "review");
    await call(`/api/projects/${s2}/stages/script/approve`, "POST", {});
    await waitFor("shots", "review");
    await call(`/api/projects/${s2}/stages/shots/approve`, "POST", { next: false });
    await call(`/api/projects/${s2}/stages/voice/run`, "POST", { provider: "none" });
    const d = await waitFor("voice", "review");
    assert.equal(d.clips.length, 0);
    assert.deepEqual(d.audio, { voice: {}, sfx: {} });
    assert.equal(d.state.voice.provider, "none");
    await call(`/api/projects/${s2}/stages/voice/approve`, "POST", {});
    const r = await waitFor("render", "review", 60000);
    assert.ok(r.outputs.phone);
  } finally {
    slug = undefined;
  }
});
