// Ideas must follow the topic, not the Winter Lake art: no ice stories for non-winter topics,
// at most two for Surprise me, and the prompt's angles match the topic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { icyIdeas, isWinterTopic, validateIdeas } from "../lib/validate.mjs";
import { SCENARIO_ANGLES, STORY_ANGLES, WINTER_ANGLES, pickAngles } from "../stages/prompts.mjs";
import { iceRules, prompt } from "../stages/ideas.mjs";

const idea = (title, premise) => ({ title, premise, hook: "Would you know what to do?", twist: "t", world: "w", diagrams: ["d"], fact: "f", verify: "v", risk: "r", score: 5 });
const lake = (n) => idea(`Thin Ice ${n}`, "Eli walks across the frozen lake at dusk.");
const city = (n) => idea(`Lights Out ${n}`, "Maya and her dad lose power in a city blackout.");

test("winter topics are recognised", () => {
  for (const t of ["what to do if you fall through the ice", "blizzard in the car", "hypothermia after a swim", "frostbite myths"]) assert.ok(isWinterTopic(t), t);
  for (const t of ["alien signal causes mass panic", "zombie outbreak day one", "what to do in a flood", ""]) assert.ok(!isWinterTopic(t), t);
});

test("icyIdeas spots ice and lake stories", () => {
  assert.deepEqual(icyIdeas([lake(1), city(2), lake(3)]), [0, 2]);
});

test("validateIdeas: no ice for other topics, at most two for Surprise me, any for winter", () => {
  const mixed = { ideas: [lake(1), city(2), city(3), city(4), city(5)] };
  assert.equal(validateIdeas(mixed).length, 0, "default (winter topic) allows ice");
  assert.match(validateIdeas(mixed, { winterOk: false }).join(" "), /not about winter/);
  assert.equal(validateIdeas(mixed, { winterOk: false, surprise: true }).length, 0);
  const icy = { ideas: [lake(1), lake(2), lake(3), city(4), city(5)] };
  assert.match(validateIdeas(icy, { winterOk: false, surprise: true }).join(" "), /at most two/);
});

test("pickAngles matches the topic", () => {
  for (let k = 0; k < 50; k++) {
    const typed = pickAngles(5, { surprise: false, winterTopic: false });
    assert.equal(typed.length, 5);
    assert.ok(typed.every((a) => STORY_ANGLES.includes(a)), "a typed non-winter topic gets story angles only");
    assert.ok(pickAngles(5).filter((a) => WINTER_ANGLES.includes(a)).length <= 2, "Surprise me: at most two winter angles");
    assert.ok(pickAngles(5, { surprise: false, winterTopic: true }).filter((a) => SCENARIO_ANGLES.includes(a)).length === 0);
  }
});

test("ideas prompt for a non-winter topic forbids the ice and drops the lake framing", () => {
  const p = { slug: "x", topic: "alien signal causes mass panic", surprise: false, format: "story", length: 60, style: "flat" };
  assert.deepEqual(iceRules(p), { surprise: false, winterOk: false });
  const text = prompt(p, pickAngles(5, { surprise: false }), []);
  assert.match(text, /NOT about winter/);
  assert.doesNotMatch(text, /falls through thin ice/);
  assert.doesNotMatch(text, /lake views/);
  assert.ok(WINTER_ANGLES.every((a) => !text.includes(a)));
  const series = { ...p, topic: "Ten Minutes Under, episode 2", series: { episode: 2, title: "Ten Minutes Under", previously: "Eli falls through the ice." } };
  assert.equal(iceRules(series).winterOk, true, "a winter series may stay on the ice");
});
