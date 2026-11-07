// "Make the next episode": a sequel project carries the series brief, keeps the look and starts Ideas.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { episodeDir } from "../lib/paths.mjs";

process.env.STUDIO_MODE = "replay";
process.env.STUDIO_NO_OPEN = "1";
process.env.STUDIO_REPLAY_SPEED = "40";
process.env.STUDIO_PORT = String(47000 + Math.floor(Math.random() * 900));

let srv;
const made = [];
const call = async (p, method = "GET", body) => {
  const r = await fetch(`http://127.0.0.1:${srv.port}${p}`, { method, headers: { "x-studio-token": srv.token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const idle = async () => { for (let i = 0; i < 600 && (await call("/api/status")).body.job; i++) await new Promise((r) => setTimeout(r, 50)); };

before(async () => {
  const eng = await import("../engine/claude.mjs");
  eng.claudeCli.run = () => { throw new Error("no Claude"); };
  srv = await (await import("../server.mjs")).start();
});
after(async () => {
  await call("/api/cancel", "POST");
  await idle();
  srv?.server.close();
  for (const s of made) rmSync(episodeDir(s), { recursive: true, force: true });
});

test("seriesText and previouslyText keep the brief short and name the episode", async () => {
  const { previouslyText, seriesText } = await import("../stages/sequel.mjs");
  const lines = Array.from({ length: 20 }, (_, i) => `Line ${i} ${"word ".repeat(40)}`);
  const brief = previouslyText({ title: "Thin Ice", episode: 1, premise: "Eli and the creek.", lines });
  assert.ok(brief.length <= 1400);
  assert.match(brief, /Line 0/);
  assert.doesNotMatch(brief, /Line 10 /, "the middle of the story is skipped");
  assert.match(seriesText({ episode: 2, title: "Thin Ice", previously: brief }), /episode 2 of "Thin Ice"/);
  assert.equal(seriesText(undefined), "");
});

test("POST /sequel on the example makes episode 2 and starts Ideas", async () => {
  const r = await call("/api/projects/ten-minutes-under/sequel", "POST", {});
  assert.equal(r.status, 201);
  const s = r.body.state;
  made.push(s.slug);
  assert.equal(s.series.episode, 2);
  assert.equal(s.series.parent, "ten-minutes-under");
  assert.equal(s.series.title, "Ten Minutes Under");
  assert.match(s.series.previously, /Ten Minutes Under/);
  assert.equal(s.style, "flat");
  await idle();
  const d = await call(`/api/projects/${s.slug}`);
  assert.equal(d.body.state.stages.ideas.status, "review");
});

test("sequel needs an approved script, a real project and an idle studio", async () => {
  assert.equal((await call("/api/projects/no-such-project/sequel", "POST", {})).status, 404);
  const p = await call("/api/projects", "POST", { topic: "what to do in a blizzard", length: 60 });
  made.push(p.body.state.slug);
  assert.equal((await call(`/api/projects/${p.body.state.slug}/sequel`, "POST", {})).status, 409, "busy while Ideas runs");
  await idle();
  const r = await call(`/api/projects/${p.body.state.slug}/sequel`, "POST", {});
  assert.equal(r.status, 409);
  assert.match(r.body.error, /script/);
});
