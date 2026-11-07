// The plan guard: Studio never starts or continues a Claude run past the user's plan (lib/usage.mjs).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(os.tmpdir(), "studio-usage-"));
process.env.STUDIO_USAGE_FILE = path.join(dir, "usage.json");
delete process.env.STUDIO_PLAN_CAP;
let usage;
before(async () => { usage = await import("../lib/usage.mjs"); });
after(() => rmSync(dir, { recursive: true, force: true }));

const soon = () => Math.round(Date.now() / 1000) + 3600;
const rate = (five, week, extra = {}) => ({ type: "rate", status: "allowed", windows: { five_hour: { utilization: five, resetsAt: soon() }, seven_day: { utilization: week, resetsAt: soon() + 86400 } }, ...extra });

test("unknown usage: runs may start, tracker says so", () => {
  assert.equal(usage.plan().known, false);
  assert.equal(usage.blockReason("ideas"), null);
});

test("records windows and reports what is left", () => {
  assert.equal(usage.record(rate(0.3, 0.1)), null);
  const p = usage.plan();
  assert.equal(p.known, true);
  assert.equal(p.fiveHour.used, 0.3);
  assert.ok(Math.abs(p.fiveHour.left - 0.7) < 1e-9);
  assert.equal(p.cap, 0.9);
});

test("refuses to start a run that could pass the cap", () => {
  usage.record(rate(0.85, 0.1));
  const b = usage.blockReason("shots");
  assert.equal(b?.code, "plan_limit");
  assert.match(b.message, /5-hour/);
  usage.record(rate(0.2, 0.89));
  assert.match(usage.blockReason("ideas")?.message ?? "", /weekly/);
});

test("stops a running run at the cap, at the limit and on paid extra usage", () => {
  assert.equal(usage.record(rate(0.91, 0.1))?.code, "plan_limit");
  assert.equal(usage.record(rate(0.2, 0.1, { status: "rejected" }))?.code, "plan_limit");
  assert.match(usage.record(rate(0.2, 0.1, { isUsingOverage: true }))?.message ?? "", /extra usage/);
  assert.equal(usage.record(rate(0.2, 0.1)), null);
});

test("a window whose reset time has passed counts as empty", () => {
  usage.record({ type: "rate", status: "allowed", windows: { five_hour: { utilization: 0.95, resetsAt: Math.round(Date.now() / 1000) - 10 }, seven_day: { utilization: 0.1, resetsAt: soon() } } });
  assert.equal(usage.plan().fiveHour.used, 0);
  assert.equal(usage.blockReason("ideas"), null);
});

test("learns what a kind of run takes, and only raises estimates", () => {
  usage.record(rate(0.1, 0.05));
  const before = usage.snapshot();
  usage.record(rate(0.4, 0.1));
  usage.learn("script", before);
  assert.ok(Math.abs(usage.estimate("script").fiveHour - 0.3) < 1e-9, "a run that took 30 % is remembered");
  const b2 = usage.snapshot();
  usage.record(rate(0.41, 0.1));
  usage.learn("script", b2);
  assert.ok(usage.estimate("script").fiveHour >= 0.3, "a cheap run never lowers the estimate below the worst recent one");
});

test("STUDIO_PLAN_CAP changes the cap", () => {
  process.env.STUDIO_PLAN_CAP = "0.5";
  usage.record(rate(0.45, 0.1));
  assert.equal(usage.blockReason("ideas")?.code, "plan_limit");
  delete process.env.STUDIO_PLAN_CAP;
});

test("the Claude engine refuses to spawn when the guard blocks", async () => {
  usage.record(rate(0.95, 0.1, { status: "rejected" }));
  const { claudeCli } = await import("../engine/claude.mjs");
  const h = claudeCli.run("ideas", "hello", {});
  const evs = [];
  for await (const e of h.events) evs.push(e);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].ok, false);
  assert.equal(evs[0].error.code, "plan_limit");
});
