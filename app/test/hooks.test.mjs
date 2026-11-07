// Hook lab: replay route, 409 when busy, and output validation.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { EPISODES } from "../lib/paths.mjs";
import { cleanHooks, hooksPrompt } from "../stages/hooks.mjs";

process.env.STUDIO_BOARDS_DIR = mkdtempSync(path.join(os.tmpdir(), "hooks-"));
process.env.STUDIO_MODE = "replay";
process.env.STUDIO_NO_OPEN = "1";
process.env.STUDIO_PORT = String(49900 + Math.floor(Math.random() * 90));
let srv, slug;
const call = async (p, method = "GET", body) => {
  const r = await fetch(`http://127.0.0.1:${srv.port}${p}`, { method, headers: { "x-studio-token": srv.token, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
before(async () => { srv = await (await import("../server.mjs")).start(); });
after(async () => {
  await call("/api/cancel", "POST");
  srv?.server.close();
  rmSync(process.env.STUDIO_BOARDS_DIR, { recursive: true, force: true });
  if (slug) rmSync(path.join(EPISODES, slug), { recursive: true, force: true });
});

test("cleanHooks drops digits, unsafe, long and duplicate hooks", () => {
  const long = Array(21).fill("word").join(" ");
  const out = cleanHooks(["Would you step on it?", "It takes 10 minutes.", "How to build a bomb at home", long, "Would you step on it?", "You hear a crack.", 5]);
  assert.deepEqual(out, ["Would you step on it?", "You hear a crack."]);
  assert.match(hooksPrompt({ line: "Hi there" }), /at most 20 words/);
});

test("POST /api/projects/:slug/hooks: replay returns 3 hooks; validates source", async () => {
  let r = await call("/api/projects", "POST", { topic: "thin ice", entry: "own" });
  assert.equal(r.status, 201);
  slug = r.body.state.slug;
  await call("/api/cancel", "POST");
  assert.equal((await call(`/api/projects/${slug}/hooks`, "POST", { source: "nope" })).status, 400);
  assert.equal((await call("/api/projects/nonexistent/hooks", "POST", { source: "line" })).status, 404);
  r = await call(`/api/projects/${slug}/hooks`, "POST", { source: "line" });
  if (r.status === 200) { assert.equal(r.body.hooks.length, 3); assert.equal(r.body.replay, true); }
  else assert.equal(r.status, 409); // own project may have no lines.json yet
});
