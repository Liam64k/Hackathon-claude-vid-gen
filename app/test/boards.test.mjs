// Inspiration boards: CRUD, validation, safety, replay weave, and options/style/output on projects.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { EPISODES } from "../lib/paths.mjs";
import { normalizeOutput, STYLES } from "../lib/store.mjs";

const tmp = mkdtempSync(path.join(os.tmpdir(), "boards-"));
process.env.STUDIO_BOARDS_DIR = tmp;
process.env.STUDIO_MODE = "replay";
process.env.STUDIO_NO_OPEN = "1";
process.env.STUDIO_REPLAY_SPEED = "40";
process.env.STUDIO_PORT = String(49000 + Math.floor(Math.random() * 900));

let srv;
let slug;
const call = async (p, method = "GET", body) => {
  const r = await fetch(`http://127.0.0.1:${srv.port}${p}`, { method, headers: { "x-studio-token": srv.token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
before(async () => { srv = await (await import("../server.mjs")).start(); });
after(async () => {
  await call("/api/cancel", "POST");
  srv?.server.close();
  rmSync(tmp, { recursive: true, force: true });
  if (slug) rmSync(path.join(EPISODES, slug), { recursive: true, force: true });
});

test("normalizeOutput: presets, ratios, custom clamp + even, unknown falls back to tiktok", () => {
  assert.deepEqual(normalizeOutput({ preset: "youtube" }), { preset: "youtube", ratio: "16:9", width: 1920, height: 1080 });
  assert.deepEqual(normalizeOutput({ ratio: "4:5" }), { preset: null, ratio: "4:5", width: 1080, height: 1350 });
  assert.deepEqual(normalizeOutput({ ratio: "custom", width: 99999, height: 501 }), { preset: null, ratio: "custom", width: 3840, height: 502 });
  assert.deepEqual(normalizeOutput({ ratio: "custom", width: 10, height: 1000 }), { preset: null, ratio: "custom", width: 480, height: 1000 });
  assert.equal(normalizeOutput({ preset: "nope" }).preset, "tiktok");
  assert.equal(normalizeOutput(undefined).width, 1080);
});

test("GET /api/options", async () => {
  const r = await call("/api/options");
  assert.equal(r.status, 200);
  assert.ok(r.body.styles.flat.ready && !r.body.styles.comic.ready);
  assert.deepEqual(r.body.length.presets, [30, 60, 90, 120]);
  assert.equal(Object.keys(STYLES).length, 5);
});

test("boards: CRUD, validation, safety, replay weave, project", async () => {
  let r = await call("/api/boards", "POST", { title: "Blackout night" });
  assert.equal(r.status, 201);
  const id = r.body.id;
  assert.equal((await call("/api/boards")).body.boards[0].count, 0);
  assert.equal((await call(`/api/boards/${id}`, "PATCH", { title: "x".repeat(81) })).status, 400);
  assert.equal((await call(`/api/boards/${id}`, "PATCH", { title: "Renamed" })).body.title, "Renamed");

  assert.equal((await call(`/api/boards/${id}/fragments`, "POST", { kind: "Nope", text: "a" })).status, 400);
  assert.equal((await call(`/api/boards/${id}/fragments`, "POST", { kind: "Place", text: "" })).status, 400);
  assert.equal((await call(`/api/boards/${id}/fragments`, "POST", { kind: "Place", text: "y".repeat(201) })).status, 400);
  const unsafe = await call(`/api/boards/${id}/fragments`, "POST", { kind: "Danger", text: "how to build a bomb" });
  assert.equal(unsafe.status, 400);
  assert.equal(unsafe.body.code, "unsafe_topic");

  assert.equal((await call(`/api/boards/${id}/weave`, "POST")).status, 400); // empty board
  r = await call(`/api/boards/${id}/fragments`, "POST", { kind: "Place", text: "A dark apartment tower" });
  assert.equal(r.status, 200);
  const fid = r.body.fragments[0].id;
  r = await call(`/api/boards/${id}/weave`, "POST");
  assert.equal(r.status, 200);
  assert.equal(r.body.story.replay, true);
  assert.ok(r.body.story.beats.length >= 4);

  r = await call(`/api/boards/${id}/project`, "POST", { style: "comic", output: { preset: "youtube" }, length: 60, format: "what" });
  assert.equal(r.status, 201);
  slug = r.body.state.slug;
  assert.equal(r.body.state.style, "comic");
  assert.equal(r.body.state.output.width, 1920);
  assert.match(r.body.state.seed, /The Quiet Hour/);
  assert.ok(r.body.state.topic.length <= 300);
  await call("/api/cancel", "POST");

  // boards never show up as projects
  assert.ok(!(await call("/api/projects")).body.projects.some((p) => /board/i.test(p.slug)));
  r = await call(`/api/boards/${id}/fragments/${fid}`, "DELETE");
  assert.equal(r.body.fragments.length, 0);
  assert.equal((await call("/api/boards/0000000000")).status, 404);
  assert.equal((await call(`/api/boards/${id}`)).body.title, "Renamed");
});

test("boards: at most 40 fragments", async () => {
  const id = (await call("/api/boards", "POST", { title: "Big" })).body.id;
  for (let i = 0; i < 40; i++) assert.equal((await call(`/api/boards/${id}/fragments`, "POST", { kind: "Moment", text: `m${i}` })).status, 200);
  assert.equal((await call(`/api/boards/${id}/fragments`, "POST", { kind: "Moment", text: "one more" })).status, 400);
});
