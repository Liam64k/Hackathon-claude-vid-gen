// Provider "claude-cli": runs the user's own, signed-in `claude` program locally, one stage at a time.
//
//   claude -p --output-format stream-json --verbose --include-partial-messages
//          --model <opus|sonnet> --effort <level> --permission-mode acceptEdits --permission-prompts none
//          --allowedTools "<per stage>" --max-budget-usd <per stage> --append-system-prompt "<stage rules>"
//
// Prompt goes on stdin; cwd = studio root so CLAUDE.md, skills and agents load automatically.
// Never --bare (it ignores the subscription login). API-key variables are removed from the child env.
import { ROOT } from "../lib/paths.mjs";
import { childEnv, findClaude, INSTALL_HINT } from "../lib/env.mjs";
import { run } from "../lib/proc.mjs";
import { createParser } from "./parse.mjs";

export const FORBIDDEN_ARGS = ["--bare", "--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "setup-token"];

export const buildArgs = ({ model, effort, allowedTools, tools, budget, systemPrompt, jsonSchema, resume }) => {
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
  if (model) args.push("--model", model);
  if (effort) args.push("--effort", effort);
  args.push("--permission-mode", "acceptEdits", "--permission-prompts", "none");
  if (tools !== undefined) args.push("--tools", tools); // "" disables every tool
  if (allowedTools?.length) args.push("--allowedTools", allowedTools.join(","));
  if (budget) args.push("--max-budget-usd", String(budget));
  if (systemPrompt) args.push("--append-system-prompt", systemPrompt);
  if (jsonSchema) args.push("--json-schema", JSON.stringify(jsonSchema));
  if (resume) args.push("--resume", resume);
  for (const a of args) if (FORBIDDEN_ARGS.includes(a)) throw new Error(`Refusing forbidden claude argument ${a}`);
  return args;
};

// A tiny async queue so run() can hand back an async iterator of events.
const queue = () => {
  const items = [];
  let wake = null;
  let closed = false;
  return {
    push(x) { items.push(x); wake?.(); wake = null; },
    close() { closed = true; wake?.(); wake = null; },
    async *[Symbol.asyncIterator]() {
      for (;;) {
        if (items.length) { yield items.shift(); continue; }
        if (closed) return;
        await new Promise((r) => (wake = r));
      }
    },
  };
};

export const claudeCli = {
  name: "claude-cli",
  // run(stage, prompt, opts) -> { events: AsyncIterable<appEvent>, cancel() }
  run(stage, prompt, opts = {}) {
    const q = queue();
    const found = findClaude();
    if (!found) {
      q.push({ type: "result", ok: false, error: { code: "not_installed", message: `Claude Code is not installed. Install it with: ${INSTALL_HINT}` } });
      q.close();
      return { events: q, cancel() {} };
    }
    const args = buildArgs(opts);
    const parser = createParser({ root: ROOT });
    let sawResult = false;
    let cancelled = false;
    let timedOut = false;
    const emit = (evs) => { for (const e of evs) { if (e.type === "result") sawResult = true; q.push(e); } };
    const proc = run(found.path, [...(found.prefix ?? []), ...args], {
      cwd: ROOT,
      env: childEnv(),
      input: prompt,
      keep: 20,
      onLine: (l) => emit(parser.line(l)),
      timeoutMs: undefined,
    });
    const timer = opts.timeoutMs ? setTimeout(() => { timedOut = true; proc.kill(); }, opts.timeoutMs) : null;
    proc.done.then(({ code, error, tail }) => {
      clearTimeout(timer);
      emit(parser.end());
      if (!sawResult) {
        let err;
        if (cancelled) err = { code: "cancelled", message: "Stopped." };
        else if (timedOut) err = { code: "timeout", message: `Claude took longer than ${Math.round(opts.timeoutMs / 60000)} min for this stage and was stopped. Partial files were kept.` };
        else if (error?.code === "ENOENT") err = { code: "not_installed", message: `Could not start Claude Code (${found.path}). Install it with: ${INSTALL_HINT}` };
        else err = { code: "crashed", message: `Claude exited (code ${code}) without a result. ${tail.slice(-3).join(" ").slice(0, 300)}` };
        q.push({ type: "result", ok: false, sessionId: parser.state.sessionId, cost: 0, denials: [], error: err });
      }
      q.close();
    });
    return {
      events: q,
      cancel() { cancelled = true; proc.kill(); },
      pid: proc.child.pid,
    };
  },
};

// `claude auth status` (JSON). Only booleans/labels are kept; nothing credential-like is stored.
export const authStatus = async () => {
  const found = findClaude();
  if (!found) return { installed: false, loggedIn: false };
  const r = await run(found.path, [...(found.prefix ?? []), "auth", "status"], { env: childEnv(), timeoutMs: 20000 }).done;
  try {
    const j = JSON.parse(r.out.slice(r.out.indexOf("{")));
    return { installed: true, bin: found.path, binSource: found.source, loggedIn: !!j.loggedIn, authMethod: j.authMethod ?? null, plan: j.subscriptionType ?? j.planTier ?? null, expiresAt: j.loginExpiresAt ?? null };
  } catch {
    return { installed: true, bin: found.path, binSource: found.source, loggedIn: false, raw: r.tail.slice(-2).join(" ") };
  }
};

export const version = async () => {
  const found = findClaude();
  if (!found) return null;
  const r = await run(found.path, [...(found.prefix ?? []), "--version"], { env: childEnv(), timeoutMs: 15000 }).done;
  return r.out.trim().split(/\s+/)[0] || null;
};

// Anthropic's own sign-in flow: `claude auth login` opens the browser; the user finishes there.
let loginProc = null;
export const startLogin = (onLine) => {
  const found = findClaude();
  if (!found) throw Object.assign(new Error("Claude Code is not installed"), { code: "not_installed" });
  if (loginProc && loginProc.child.exitCode === null) return loginProc;
  loginProc = run(found.path, [...(found.prefix ?? []), "auth", "login"], { env: childEnv(), onLine, timeoutMs: 10 * 60 * 1000 });
  return loginProc;
};
