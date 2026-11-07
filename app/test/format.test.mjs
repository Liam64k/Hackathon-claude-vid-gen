import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DEFAULT_FORMAT, normalizeFormat, phoneSize, readFormat, restoreFormat, writeFormat } from "../lib/remotion-tasks.mjs";

const tmp = () => path.join(mkdtempSync(path.join(tmpdir(), "fmt-")), "format.json");

test("normalizeFormat defaults for old projects and bad input", () => {
  assert.deepEqual(normalizeFormat(undefined), DEFAULT_FORMAT);
  assert.deepEqual(normalizeFormat({ width: "x", height: 5 }), DEFAULT_FORMAT);
  assert.deepEqual(normalizeFormat({ width: 1920, height: 1080 }), { width: 1920, height: 1080 });
  assert.deepEqual(normalizeFormat({ width: 1081, height: 1919 }), { width: 1080, height: 1918 });
});

test("write and restore format.json", () => {
  const f = tmp();
  writeFormat({ preset: "yt", ratio: "16:9", width: 1920, height: 1080 }, f);
  assert.deepEqual(JSON.parse(readFileSync(f, "utf8")), { width: 1920, height: 1080 });
  assert.deepEqual(readFormat(f), { width: 1920, height: 1080 });
  restoreFormat(f);
  assert.deepEqual(JSON.parse(readFileSync(f, "utf8")), { width: 1080, height: 1920 });
});

test("phoneSize caps the long side at 1920 and keeps even dimensions", () => {
  assert.deepEqual(phoneSize({ width: 1080, height: 1920 }), { width: 1080, height: 1920 });
  assert.deepEqual(phoneSize({ width: 3840, height: 2160 }), { width: 1920, height: 1080 });
  assert.deepEqual(phoneSize({ width: 1080, height: 1080 }), { width: 1080, height: 1080 });
  const p = phoneSize({ width: 2160, height: 3840 });
  assert.deepEqual(p, { width: 1080, height: 1920 });
});
