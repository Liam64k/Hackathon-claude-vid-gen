import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { EXAMPLE_BUILD } from "../lib/workspace.mjs";
import { applyEditsTs, loadShots } from "../lib/validate.mjs";
import { checkEdits, validateEdits, summarizeRaw } from "../lib/edits.mjs";
import { readJson } from "../lib/store.mjs";
import { APP } from "../lib/paths.mjs";

const raw = [
  { line: 0, id: "a", scene: "lakeSide", from: { x: 0, y: 0, zoom: 1 }, to: { x: 0, y: 0, zoom: 1.2 }, events: [{ at: 0.5, kind: "stamp", text: "OLD", color: "#fff" }, { at: 0.2, kind: "tag", text: "T" }] },
  { line: 0, id: "b", scene: "lakeCut", from: { x: 0, y: 0, zoom: 1 } },
  { line: 1, id: "c", scene: "lakeTop", from: { x: 0, y: 0, zoom: 2 } },
];
const ids = (a) => a.map((s) => s.id).join("");

test("applyEdits: null / no shots leaves raw untouched", async () => {
  assert.equal(await applyEditsTs(raw, null), raw);
  assert.equal(await applyEditsTs(raw, { lines: { 0: { sec: 3 } } }), raw);
});
test("applyEdits: duplicate, delete, order by line", async () => {
  const out = await applyEditsTs(raw, { shots: [{ base: 2 }, { base: 0 }, { base: 0, line: 1 }] });
  assert.equal(ids(out), "aca"); // line order, stable inside a line; base 1 deleted
});
test("applyEdits: overrides", async () => {
  const [a] = await applyEditsTs(raw, { shots: [{ base: 0, scene: "lakeTop", zoom: 2, text: "HELLO", sec: 4 }] });
  assert.equal(a.scene, "lakeTop");
  assert.equal(a.from.zoom, 2);
  assert.equal(a.to.zoom, 2.4);
  assert.equal(a.sec, 4);
  assert.deepEqual(a.events.filter((e) => e.kind === "stamp").map((e) => e.text), ["HELLO"]);
  assert.ok(a.events.some((e) => e.kind === "tag"));
  assert.equal(raw[0].from.zoom, 1, "raw not mutated");
});
test("checkEdits: ranges and safety", () => {
  const c = (e) => checkEdits(e, { rawCount: 3, lineCount: 2 }).errors.join("|");
  assert.match(c({ shots: [{ base: 9 }] }), /base 9/);
  assert.match(c({ shots: [{ base: 0, zoom: 5 }] }), /zoom/);
  assert.match(c({ shots: [{ base: 0, sec: 0.1 }] }), /sec/);
  assert.match(c({ shots: [{ base: 0, line: 2 }] }), /line 2/);
  assert.match(c({ shots: [{ base: 0, text: "x".repeat(61) }] }), /60/);
  assert.equal(c({ shots: [{ base: 0, scene: "lakeCut", zoom: 1.5, text: "OK", sec: 3 }], lines: { 1: { sec: 5 } } }), "");
  assert.equal(c(null), "");
});
test("validateEdits on the example episode: deleting every shot of a line fails, duplicate passes", async () => {
  const { SHOTS } = await loadShots(path.join(EXAMPLE_BUILD, "shots.ts"));
  const lines = readJson(path.join(APP, "replays", "artifacts", "lines.json"));
  const all = SHOTS.map((_, base) => ({ base }));
  assert.deepEqual((await validateEdits({ shots: all }, { raw: SHOTS, lines })).errors, []);
  assert.deepEqual((await validateEdits({ shots: [...all, { base: 3 }] }, { raw: SHOTS, lines })).errors, []);
  const noLine0 = all.filter((e) => SHOTS[e.base].line !== 0);
  assert.ok((await validateEdits({ shots: noLine0 }, { raw: SHOTS, lines })).errors.some((e) => /line 0 has no shot/.test(e)));
  assert.equal(summarizeRaw(SHOTS).length, SHOTS.length);
});
