// Per-video cast and place look: options, random casts, validation, storage, Claude casting (replay).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { episodeDir } from "../lib/paths.mjs";
import { readJson } from "../lib/store.mjs";

process.env.STUDIO_MODE = "replay";
process.env.STUDIO_NO_OPEN = "1";
process.env.STUDIO_REPLAY_SPEED = "40";
process.env.STUDIO_PORT = String(46000 + Math.floor(Math.random() * 900));

let srv;
const made = [];
const call = async (p, method = "GET", body) => {
  const r = await fetch(`http://127.0.0.1:${srv.port}${p}`, { method, headers: { "x-studio-token": srv.token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const idle = async () => { for (let i = 0; i < 600 && (await call("/api/status")).body.job; i++) await new Promise((r) => setTimeout(r, 50)); };
const look = (o = {}) => ({ skin: "olive", hair: "black", coat: "red", coatKind: "puffy", hat: "beanie", facial: "none", build: "average", ...o });

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

test("options carry the cast lists and 8 place looks; random casts are deterministic", async () => {
  const o = (await call("/api/options")).body;
  assert.equal(o.castData.themes.length, 8);
  assert.ok(o.castData.coats.length > 5 && o.castData.hats.includes("cap"));
  const a = (await call("/api/cast/random?seed=abc")).body.cast;
  const b = (await call("/api/cast/random?seed=abc")).body.cast;
  assert.deepEqual(a, b);
  assert.notEqual(a.lead.name, a.second.name);
});

test("a new project stores the chosen cast, resolves the auto place from the topic, and writes build/cast.json", async () => {
  const bad = await call("/api/projects", "POST", { topic: "what to do in a flood", cast: { lead: { name: "", look: look() }, second: { name: "Omar", look: look() } } });
  assert.equal(bad.status, 400);
  const r = await call("/api/projects", "POST", { topic: "what to do in a flood", castMode: "manual", cast: { lead: { name: "Rosa", look: look() }, second: { name: "Omar", look: look({ coat: "navy", hat: "cap" }) }, theme: "auto" } });
  assert.equal(r.status, 201);
  const slug = r.body.state.slug;
  made.push(slug);
  assert.equal(r.body.state.cast.lead.name, "Rosa");
  assert.equal(r.body.state.castMode, "manual");
  assert.equal(r.body.castResolved.theme, "storm");
  assert.equal(r.body.castResolved.particles, "rain");
  const file = readJson(path.join(episodeDir(slug), "build", "cast.json"));
  assert.equal(file.theme, "storm");
  assert.equal(file.second.name, "Omar");
  await idle();
});

test("a project without a cast gets a random one", async () => {
  const r = await call("/api/projects", "POST", { topic: "zombie outbreak day one" });
  made.push(r.body.state.slug);
  assert.ok(r.body.state.cast.lead.name);
  assert.equal(r.body.state.castMode, "random");
  assert.equal(r.body.castResolved.theme, "nightCity");
  await idle();
});

test("PUT cast saves by hand; Claude casting (replay) picks a cast", async () => {
  const slug = made[0];
  const put = await call(`/api/projects/${slug}/cast`, "PUT", { cast: { lead: { name: "Ines", look: look({ hat: "hood" }) }, second: { name: "Gus", look: look({ coat: "forest" }) }, theme: "desert" } });
  assert.equal(put.status, 200);
  assert.equal(put.body.state.cast.lead.name, "Ines");
  assert.equal(put.body.castResolved.theme, "desert");
  assert.equal((await call(`/api/projects/${slug}/cast`, "PUT", { cast: { lead: { name: "Ines", look: look({ hat: "crown" }) }, second: { name: "Gus", look: look() } } })).status, 400);
  const c = await call(`/api/projects/${slug}/cast/claude`, "POST");
  assert.equal(c.status, 200);
  assert.equal(c.body.replay, true);
  assert.equal(c.body.cast.lead.name, "Maya");
  assert.equal(c.body.detail.state.castMode, "claude");
});

test("prompts name the cast and the place, auto place follows the topic", async () => {
  const { castText, placeText } = await import("../stages/prompts.mjs");
  const p = { topic: "nuclear war shelter", cast: { lead: { name: "Rosa", look: { coat: "#D63B34", coatKind: "puffy", hat: "beanie", hatColor: "#2B2F3A", hair: "#1E1A1A", facial: "none", build: "average" } }, second: { name: "Omar", look: { coat: "#27407A", coatKind: "parka", hat: "none", hair: "#3B2619", facial: "beard", build: "tall" } }, theme: "auto", particles: "auto" } };
  assert.match(castText(p), /Rosa/);
  assert.match(castText(p), /Omar/);
  assert.match(placeText(p), /Fallout grey/);
  assert.match(placeText(p), /particles: ash/);
  assert.equal(castText({ cast: null }), "");
  assert.equal(placeText({ cast: null }), "");
});

test("castMode claude: approving an idea casts with Claude, then the script still starts", async () => {
  const slug = made[1];
  const cur = (await call(`/api/projects/${slug}`)).body.state.cast;
  await call(`/api/projects/${slug}/cast`, "PUT", { cast: cur, castMode: "claude" });
  const a = await call(`/api/projects/${slug}/stages/ideas/approve`, "POST", { pick: 0 });
  assert.equal(a.status, 200);
  for (let i = 0; i < 100 && (await call(`/api/projects/${slug}`)).body.state.stages.script.status === "idle"; i++) await new Promise((r) => setTimeout(r, 50));
  const d = (await call(`/api/projects/${slug}`)).body;
  assert.equal(d.state.cast.lead.name, "Maya", "Claude's (recorded) cast was applied");
  assert.notEqual(d.state.stages.script.status, "idle", "the script stage started anyway");
  await idle();
});

test("Generate with Claude before a project exists (replay): roles, and the place follows the topic", async () => {
  const r = await call("/api/cast/claude", "POST", { topic: "what to do in a flood at night", format: "story" });
  assert.equal(r.status, 200);
  assert.equal(r.body.replay, true);
  assert.equal(r.body.cast.theme, "storm");
  assert.equal(r.body.cast.particles, "rain");
  assert.ok(r.body.cast.lead.role);
  const kept = await call("/api/cast/claude", "POST", { topic: "what to do in a flood", theme: "desert" });
  assert.equal(kept.body.cast.theme, "desert", "a place look chosen by hand is kept");
  assert.equal((await call("/api/cast/claude", "POST", { topic: "" })).status, 400);
  assert.equal((await call("/api/cast/claude", "POST", { topic: "how to build a bomb" })).status, 400);
});

test("roles are kept, checked for length and safety, and reach the script prompt", async () => {
  const { normalizeCast } = await import("../lib/cast-data.mjs");
  const { safetyIssues } = await import("../lib/validate.mjs");
  const ok = normalizeCast({ lead: { name: "Ray", role: "the building's janitor, 58", look: look() }, second: { name: "Ivy", look: look({ coat: "navy" }) } }, safetyIssues);
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.cast.lead.role, "the building's janitor, 58");
  assert.equal("role" in ok.cast.second, false);
  assert.ok(normalizeCast({ lead: { name: "Ray", role: "x".repeat(61), look: look() }, second: { name: "Ivy", look: look() } }).errors.some((e) => /role/.test(e)));
  const { castText } = await import("../stages/prompts.mjs");
  assert.match(castText({ cast: ok.cast }), /Ray, the building's janitor, 58/);
});

test("the casting prompt makes Claude read the skills' casting rules", async () => {
  const { castPrompt, CAST_SKILL_FILES, CAST_SCHEMA } = await import("../stages/cast.mjs");
  const p = castPrompt({ topic: "blackout in the city", theme: "auto" });
  for (const f of CAST_SKILL_FILES) assert.ok(p.includes(f.split(" ")[0]));
  assert.match(p, /signature coat colour/);
  assert.ok(CAST_SCHEMA.properties.lead.required.includes("role"));
});
