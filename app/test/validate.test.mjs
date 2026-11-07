import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP } from "../lib/paths.mjs";
import { validateIdeas, validateLines, wordCount, loadShots, validateShots } from "../lib/validate.mjs";
import { fitTitles, CREDIT } from "../stages/extras.mjs";
import { encode, decode, contactSheet } from "../lib/png.mjs";
import { parseProgress } from "../lib/remotion-tasks.mjs";
import { EXAMPLE_BUILD } from "../lib/workspace.mjs";

const art = (f) => JSON.parse(readFileSync(path.join(APP, "replays", "artifacts", f), "utf8"));

test("replay ideas.json passes the ideas checks", () => {
  assert.deepEqual(validateIdeas(art("ideas.json")), []);
  assert.ok(validateIdeas({ ideas: [{ title: "x" }] }).length > 0);
});

test("the example narration is valid lines.json structure", () => {
  const lines = art("lines.json");
  const n = wordCount(lines);
  const v = validateLines(lines, 110);
  assert.deepEqual(v.errors.filter((e) => !/words; target/.test(e)), []);
  assert.equal(v.words, n);
});

test("lines.json checks: digits, missing highlight words, length", () => {
  const base = Array.from({ length: 12 }, (_, i) => ({ text: `Line number ${["one", "two", "three"][i % 3]} of the cold lake story told slowly and calmly here today.`, highlight: ["cold"] }));
  assert.deepEqual(validateLines(base, 75).errors.filter((e) => !/words; target/.test(e)), []);
  const bad = structuredClone(base);
  bad[0].text = "It was 6 cm thick.";
  bad[1].highlight = ["penguin"];
  const errs = validateLines(bad, 90).errors;
  assert.ok(errs.some((e) => /line 0: spell numbers out/.test(e)));
  assert.ok(errs.some((e) => /line 1: highlight "penguin"/.test(e)));
  assert.ok(errs.some((e) => /words; target 230-280/.test(e)));
  assert.ok(validateLines("nope").errors.length);
});

test("titles stay within 60 characters, with the ElevenLabs credit when needed", () => {
  const long = { titles: ["A".repeat(80), "Short one", "Another title that is fairly long but okay"], description: "Desc" };
  const t = fitTitles(long, true);
  for (const x of t.titles) { assert.ok(x.length <= 60, x); assert.ok(x.endsWith(CREDIT)); }
  assert.match(t.description, /elevenlabs\.io/);
  for (const x of fitTitles(long, false).titles) assert.ok(x.length <= 60);
});

test("example shots.ts loads through the TypeScript transpiler and validates", async () => {
  const s = await loadShots(path.join(EXAMPLE_BUILD, "shots.ts"));
  assert.equal(s.TITLE, "ten-minutes-under");
  assert.deepEqual(validateShots(s, s.LINES), []);
  const broken = { LINES: s.LINES, SHOTS: [...s.SHOTS.slice(0, 20), { ...s.SHOTS[0], scene: "moon" }] };
  const errs = validateShots(broken, s.LINES);
  assert.ok(errs.some((e) => /unknown scene "moon"/.test(e)));
  assert.ok(errs.some((e) => /has no shot/.test(e)));
});

test("PNG encode/decode round trip and contact sheet", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "png-"));
  try {
    const rgb = Buffer.alloc(4 * 6 * 3);
    for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37) & 255;
    const f = path.join(dir, "a.png");
    writeFileSync(f, encode({ width: 4, height: 6, rgb }));
    const back = decode(readFileSync(f));
    assert.equal(back.width, 4);
    assert.deepEqual(back.rgb, rgb);
    const info = contactSheet([f, f, f], path.join(dir, "sheet.png"), 2, 1);
    assert.deepEqual([info.width, info.height, info.tiles], [11, 15, 3]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Remotion progress lines are parsed", () => {
  assert.deepEqual(parseProgress("Rendered 120/3225, time remaining: 2m"), { phase: "rendered", done: 120, total: 3225 });
  assert.equal(parseProgress("Bundling 50%"), null);
});

test("video length is free: any seconds, clamped, word and line targets scale", async () => {
  const { clampSeconds, wordRange, lineRange, createProject } = await import("../lib/store.mjs");
  assert.equal(clampSeconds(45), 45);
  assert.equal(clampSeconds(5), 20);
  assert.equal(clampSeconds(999), 180);
  assert.equal(clampSeconds("abc"), 90);
  assert.deepEqual(wordRange(90), [230, 280]);
  assert.ok(wordRange(30)[1] < 100 && wordRange(150)[0] > 350);
  assert.deepEqual(lineRange(90), [12, 18]);
  const short = Array.from({ length: 5 }, () => ({ text: "Cold water steals heat fast so get out now and stay calm and still and breathe.", highlight: ["cold"] }));
  assert.deepEqual(validateLines(short, 30).errors, []);
  assert.ok(validateLines(short, 120).errors.some((e) => /lines for ~120 s/.test(e)));
  assert.equal(typeof createProject, "function");
});

test("idea prompts vary: random angles and past ideas are named", async () => {
  const { prompt } = await import("../stages/ideas.mjs");
  const { pickAngles, ANGLES } = await import("../stages/prompts.mjs");
  const a = pickAngles(5);
  assert.equal(new Set(a).size, 5);
  assert.ok(a.every((x) => ANGLES.includes(x)));
  const p = prompt({ slug: "x", surprise: true, format: "story", length: 45 }, ["angle A", "angle B", "c", "d", "e"], ["Don't Run to Him — premise"]);
  assert.match(p, /1\. angle A/);
  assert.match(p, /Don't Run to Him/);
  assert.match(p, /At most TWO ideas may be set on ice/);
  assert.match(p, /~45 s/);
});
