// Inspiration boards: episodes/_boards/<id>.json. A board is a pile of short fragments (a person, a place,
// a moment...) that Claude can weave into one story outline. Folders starting with "_" are not projects.
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { EPISODES } from "./paths.mjs";
import { readJson, writeJson } from "./store.mjs";

export const KINDS = ["Person", "Place", "Moment", "Danger", "Lesson", "Twist"];
export const MAX_FRAGMENTS = 40;
export const MAX_TEXT = 200;
export const MAX_TITLE = 80;

const dir = () => process.env.STUDIO_BOARDS_DIR || path.join(EPISODES, "_boards");
const file = (id) => path.join(dir(), `${id}.json`);
const bad = (message, status = 400, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const newId = () => randomBytes(5).toString("hex");

const cleanTitle = (t) => {
  const s = String(t ?? "").trim().replace(/\s+/g, " ");
  if (s.length > MAX_TITLE) throw bad(`Title can be at most ${MAX_TITLE} characters.`);
  return s || "Untitled board";
};

export const get = (id) => {
  if (!/^[a-f0-9]{10}$/.test(String(id))) return null;
  return readJson(file(id));
};
const need = (id) => get(id) ?? (() => { throw bad("No such board", 404); })();
const save = (b) => { b.updatedAt = new Date().toISOString(); writeJson(file(b.id), b); return b; };

export const list = () => {
  if (!existsSync(dir())) return [];
  return readdirSync(dir())
    .filter((f) => /^[a-f0-9]{10}\.json$/.test(f))
    .map((f) => readJson(path.join(dir(), f)))
    .filter(Boolean)
    .map((b) => ({ id: b.id, title: b.title, count: b.fragments.length, updatedAt: b.updatedAt }))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
};

export const create = ({ title } = {}) => {
  mkdirSync(dir(), { recursive: true });
  const now = new Date().toISOString();
  return save({ id: newId(), title: cleanTitle(title), createdAt: now, updatedAt: now, fragments: [], story: null });
};
export const rename = (id, title) => { const b = need(id); b.title = cleanTitle(title); return save(b); };
export const remove = (id) => { need(id); rmSync(file(id), { force: true }); };

export const addFragment = (id, { kind, text }) => {
  const b = need(id);
  if (!KINDS.includes(kind)) throw bad(`kind must be one of ${KINDS.join(", ")}`);
  const t = String(text ?? "").trim();
  if (t.length < 1 || t.length > MAX_TEXT) throw bad(`Text must be 1-${MAX_TEXT} characters.`);
  if (b.fragments.length >= MAX_FRAGMENTS) throw bad(`A board holds at most ${MAX_FRAGMENTS} fragments.`);
  b.fragments.push({ id: newId(), kind, text: t });
  b.story = null; // the old weave no longer matches the pile
  return save(b);
};
export const removeFragment = (id, fid) => {
  const b = need(id);
  const n = b.fragments.length;
  b.fragments = b.fragments.filter((f) => f.id !== fid);
  if (b.fragments.length === n) throw bad("No such fragment", 404);
  b.story = null;
  return save(b);
};
export const setStory = (id, story) => { const b = need(id); b.story = story; return save(b); };
