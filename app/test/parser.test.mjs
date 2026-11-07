// The parser is tested against REAL captured `claude -p --output-format stream-json` runs (app/fixtures).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { APP } from "../lib/paths.mjs";
import { createParser, completedItems, describeTool, classifyResult } from "../engine/parse.mjs";

const parse = (name, root = "C:\\Users\\liams\\Downloads\\studio-kit\\studio") => {
  const p = createParser({ root });
  // feed in odd-sized chunks to prove lines that straddle chunks are handled
  const raw = readFileSync(path.join(APP, "fixtures", name), "utf8");
  const evs = [];
  for (let i = 0; i < raw.length; i += 777) evs.push(...p.push(raw.slice(i, i + 777)));
  evs.push(...p.end());
  return evs;
};

test("sample.ndjson (say hi): init, streamed text, success result with cost and session", () => {
  const evs = parse("sample.ndjson");
  const init = evs.find((e) => e.type === "init");
  assert.ok(init, "init event");
  assert.match(init.sessionId, /^[0-9a-f-]{36}$/);
  assert.equal(init.apiKeySource, "none", "subscription login, not an API key");
  const text = evs.filter((e) => e.type === "text").map((e) => e.delta).join("");
  assert.ok(text.length > 5);
  const r = evs.find((e) => e.type === "result");
  assert.equal(r.ok, true);
  assert.equal(r.sessionId, init.sessionId);
  assert.ok(r.cost > 0 && r.cost < 1);
  assert.ok(r.durationMs > 0);
  assert.deepEqual(r.denials, []);
  assert.equal(r.error, null);
  assert.ok(evs.some((e) => e.type === "rate" && e.windows?.five_hour), "rate-limit window for the usage meter");
  assert.ok(!evs.some((e) => e.type === "log"), "every line is valid JSON (BOM handled)");
});

test("tools.ndjson: a Read tool call becomes a readable activity", () => {
  const evs = parse("tools.ndjson");
  const a = evs.find((e) => e.type === "activity");
  assert.equal(a.tool, "Read");
  assert.equal(a.text, "Reading CLAUDE.md");
  assert.equal(evs.at(-1).type, "result");
  assert.equal(evs.at(-1).ok, true);
});

test("denied.ndjson: permission denial is surfaced live and in the result", () => {
  const evs = parse("denied.ndjson");
  assert.ok(evs.some((e) => e.type === "denied" && e.tool === "Bash"));
  const r = evs.find((e) => e.type === "result");
  assert.equal(r.denials.length, 1);
  assert.equal(r.denials[0].tool, "Bash");
  assert.match(r.denials[0].input.command, /npm run typecheck/);
});

test("budget.ndjson: budget cap becomes a friendly 'budget' error", () => {
  const r = parse("budget.ndjson").find((e) => e.type === "result");
  assert.equal(r.ok, false);
  assert.equal(r.subtype, "error_max_budget_usd");
  assert.equal(r.error.code, "budget");
});

test("schema.ndjson: --json-schema output streams as StructuredOutput and lands in the result", () => {
  const evs = parse("schema.ndjson");
  const partials = evs.filter((e) => e.type === "structured_partial");
  assert.ok(partials.length > 0, "partial JSON streamed");
  const r = evs.find((e) => e.type === "result");
  assert.ok(Array.isArray(r.structured.tips));
  assert.deepEqual(JSON.parse(partials.at(-1).json), r.structured);
});

test("a long Write reports its size while it streams (UI never looks stuck)", () => {
  const p = createParser({ root: "/x/studio" });
  const se = (event) => JSON.stringify({ type: "stream_event", event, parent_tool_use_id: null });
  const evs = [
    ...p.line(se({ type: "content_block_start", index: 1, content_block: { type: "tool_use", name: "Write", input: {} } })),
    ...p.line(se({ type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"file_path":"/x/studio/src/shots.ts","content":"' } })),
    ...p.line(se({ type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "a".repeat(3200) } })),
    ...p.line(se({ type: "content_block_start", index: 2, content_block: { type: "thinking" } })),
  ];
  const s = evs.find((e) => e.type === "tool_stream");
  assert.equal(s.file, "src/shots.ts");
  assert.ok(s.bytes > 3000);
  assert.ok(evs.some((e) => e.type === "thinking"));
});

test("completedItems pulls finished objects out of growing JSON", () => {
  const full = JSON.stringify({ ideas: [{ title: "A", hook: "x{y}" }, { title: "B \"q\"", d: [1, 2] }, { title: "C" }] });
  assert.equal(completedItems(full.slice(0, 20), "ideas").length, 0);
  const cut = full.indexOf('{"title":"C"');
  assert.deepEqual(completedItems(full.slice(0, cut), "ideas").map((i) => i.title), ["A", 'B "q"']);
  assert.equal(completedItems(full, "ideas").length, 3);
});

test("describeTool labels skills, edits and commands", () => {
  const root = "/x/studio";
  assert.equal(describeTool("Read", { file_path: "/x/studio/.claude/skills/survival-short/SKILL.md" }, root), "Reading skill: survival-short");
  assert.equal(describeTool("Read", { file_path: "/x/studio/.claude/skills/survival-short/references/story.md" }, root), "Reading survival-short › story.md");
  assert.equal(describeTool("Edit", { file_path: "/x/studio/src/shots.ts" }, root), "Editing src/shots.ts");
  assert.equal(describeTool("Bash", { command: "npm run typecheck" }, root), "Running typecheck");
});

test("classifyResult maps rate limits, sign-out and generic errors", () => {
  assert.equal(classifyResult({ is_error: true, api_error_status: 429, result: "" }).code, "rate_limit");
  assert.equal(classifyResult({ is_error: true, result: "Not logged in · Please run /login" }).code, "signed_out");
  assert.equal(classifyResult({ is_error: true, errors: ["boom"] }).code, "claude_error");
  assert.equal(classifyResult({ is_error: false, subtype: "success", result: "fine" }), null);
});

test("classifyResult never fails a successful run because of words in the answer", () => {
  assert.equal(classifyResult({ is_error: false, subtype: "success", result: "Check the rate limits, then the authentication of ice thickness; limit reached." }), null);
});
