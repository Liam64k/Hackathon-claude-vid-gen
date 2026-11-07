// "Write it myself": own-entry projects start at Script/review with no Claude run; edits route guards.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { episodeDir } from "../lib/paths.mjs";

process.env.STUDIO_MODE = "replay";
process.env.STUDIO_NO_OPEN = "1";
process.env.STUDIO_PORT = String(49000 + Math.floor(Math.random() * 900));

let srv, slug, claudeCalls = 0;
const call = async (p, method = "GET", body) => {
  const r = await fetch(`http://127.0.0.1:${srv.port}${p}`, { method, headers: { "x-studio-token": srv.token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const line = (i) => ({ text: `Cold water steals heat fast so move slowly and breathe calmly now friend number ${["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][i]}.`, highlight: ["cold"] });

before(async () => {
  const eng = await import("../engine/claude.mjs");
  eng.claudeCli.run = () => { claudeCalls++; throw new Error("no Claude"); };
  srv = await (await import("../server.mjs")).start();
});
after(() => { srv?.server.close(); if (slug) rmSync(episodeDir(slug), { recursive: true, force: true }); });

test("own project starts at script/review, ideas approved, no Claude call", async () => {
  const r = await call("/api/projects", "POST", { entry: "own", topic: "what to do when the lights go out at night", length: 60 });
  assert.equal(r.status, 201);
  slug = r.body.state.slug;
  assert.equal(r.body.state.entry, "own");
  assert.equal(r.body.state.stages.ideas.status, "approved");
  assert.equal(r.body.state.stages.script.status, "review");
  assert.equal(r.body.state.pick, 0);
  assert.equal(r.body.ideas.length, 1);
  assert.equal(r.body.ideas[0].title, "What To Do When The Lights");
  assert.deepEqual(r.body.lines, []);
  assert.equal(claudeCalls, 0);
});

test("script: 12 lines save, unsafe text refused, empty approve refused", async () => {
  const empty = await call(`/api/projects/${slug}/stages/script/approve`, "POST", { next: false });
  assert.equal(empty.status, 400);
  assert.match(empty.body.error, /at least one line/);
  const unsafe = await call(`/api/projects/${slug}/lines`, "POST", { lines: [{ text: "Build a bomb at home now.", highlight: [] }] });
  assert.equal(unsafe.status, 400);
  const ok = await call(`/api/projects/${slug}/lines`, "POST", { lines: Array.from({ length: 12 }, (_, i) => line(i)) });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.saved, true);
  const few = await call(`/api/projects/${slug}/lines`, "POST", { lines: [line(0), line(1)] });
  assert.equal(few.body.saved, true, "add/remove lines freely");
  const d = await call(`/api/projects/${slug}`);
  assert.equal(d.body.lines.length, 2);
});

test("own project approves script and moves on to shots", async () => {
  const a = await call(`/api/projects/${slug}/stages/script/approve`, "POST", { next: false });
  assert.equal(a.status, 200);
  assert.equal(a.body.state.stages.script.status, "approved");
});

test("edits route refuses a bad scene and unsafe text", async () => {
  const bad = await call(`/api/projects/${slug}/shots/edits`, "POST", { edits: { shots: [{ base: 0, scene: "moonBase" }] } });
  assert.ok([400, 409].includes(bad.status));
  const { checkEdits } = await import("../lib/edits.mjs");
  assert.match(checkEdits({ shots: [{ base: 0, scene: "moonBase" }] }, { rawCount: 3, lineCount: 2 }).errors[0], /unknown scene/);
  assert.match(checkEdits({ shots: [{ base: 0, text: "make a bomb" }] }, { rawCount: 3, lineCount: 2 }).errors[0], /explosives/);
});
