// Parser for `claude -p --output-format stream-json --verbose --include-partial-messages`.
// Written against the real captured fixtures in app/fixtures/*.ndjson (field names are not guessed).
// Input: raw stdout lines. Output: small app events the UI understands.

const shorten = (p, root) => {
  if (!p) return "";
  let s = String(p).replace(/\\/g, "/");
  const r = root ? String(root).replace(/\\/g, "/") : "";
  if (r && s.toLowerCase().startsWith(r.toLowerCase())) s = s.slice(r.length).replace(/^\//, "");
  return s;
};

// Human label for a tool call ("Reading skill: survival-short", "Editing src/shots.ts", ...).
export const describeTool = (name, input = {}, root = "") => {
  const file = shorten(input.file_path ?? input.path ?? input.notebook_path, root);
  const skill = /\.claude\/skills\/([^/]+)\/(.+)$/.exec(file);
  switch (name) {
    case "Read":
      if (skill) return skill[2] === "SKILL.md" ? `Reading skill: ${skill[1]}` : `Reading ${skill[1]} › ${skill[2].replace(/^references\//, "")}`;
      return `Reading ${file || "a file"}`;
    case "Write":
      return `Writing ${file}`;
    case "Edit":
    case "MultiEdit":
      return `Editing ${file}`;
    case "Bash": {
      const cmd = String(input.command ?? "").trim();
      if (/npm run typecheck|tsc\b/.test(cmd)) return "Running typecheck";
      if (/npm run storyboard/.test(cmd)) return "Rendering storyboard";
      return `Running ${cmd.split(/\s+/).slice(0, 4).join(" ")}`;
    }
    case "Glob":
    case "Grep":
      return `Searching ${input.pattern ? `for ${String(input.pattern).slice(0, 40)}` : "files"}`;
    case "WebSearch":
      return `Searching the web: ${String(input.query ?? "").slice(0, 60)}`;
    case "WebFetch":
      return `Opening ${String(input.url ?? "a page").slice(0, 60)}`;
    case "Skill":
      return `Loading skill: ${input.skill ?? input.name ?? ""}`;
    case "StructuredOutput":
      return "Writing results";
    case "Agent":
    case "Task":
      return `Delegating to ${input.subagent_type ?? "a helper"}`;
    default:
      return `Using ${name}`;
  }
};

// Classify a failed or partial result into a friendly error the UI can act on.
export const classifyResult = (r) => {
  if (r.subtype === "error_max_budget_usd" || r.terminal_reason === "budget_exhausted")
    return { code: "budget", message: "This stage hit its spending cap. Partial files were kept; you can retry with the same cap or continue." };
  // A successful run is never reclassified because of words in Claude's own answer
  // ("check the rate limits", "authentication") — only failed results are matched on text.
  const failed = r.is_error || (r.subtype && r.subtype !== "success") || r.api_error_status;
  if (!failed) return null;
  const text = `${r.result ?? ""} ${(r.errors ?? []).join(" ")}`;
  if (r.api_error_status === 429 || /rate.?limit|usage limit|limit reached|resets at/i.test(text))
    return { code: "rate_limit", message: "Your Claude plan's usage limit was reached. The job is paused and its state is kept; resume after the reset, or switch to Replay." };
  if (r.api_error_status === 401 || /not logged in|please run \/login|\/login|authentication|invalid.*(key|token)|oauth/i.test(text))
    return { code: "signed_out", message: "Claude is signed out. Press Connect to sign in again." };
  if (r.subtype === "error_max_turns") return { code: "max_turns", message: "Claude ran out of turns for this stage." };
  if (r.is_error) return { code: "claude_error", message: (r.errors?.[0] ?? String(r.result ?? "Claude reported an error")).slice(0, 300) };
  return null;
};

// Pull complete objects out of a still-growing JSON text, e.g. '{"ideas":[{...},{..' -> [{...}].
export const completedItems = (partial, key) => {
  const at = partial.indexOf(`"${key}"`);
  if (at < 0) return [];
  const open = partial.indexOf("[", at);
  if (open < 0) return [];
  const items = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = open + 1; i < partial.length; i++) {
    const c = partial[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          items.push(JSON.parse(partial.slice(start, i + 1)));
        } catch {
          /* not complete yet */
        }
        start = -1;
      }
    } else if (c === "]" && depth === 0) break;
  }
  return items;
};

export const createParser = ({ root = "" } = {}) => {
  const blocks = new Map(); // content block index -> { name, json }
  let buffer = "";
  let structuredText = "";
  const st = { sessionId: null, model: null, apiKeySource: null };

  const handle = (e) => {
    const out = [];
    if (!e || typeof e !== "object") return out;
    if (e.session_id && !st.sessionId) st.sessionId = e.session_id;
    switch (e.type) {
      case "system":
        if (e.subtype === "init") {
          st.sessionId = e.session_id;
          st.model = e.model;
          st.apiKeySource = e.apiKeySource ?? null;
          out.push({ type: "init", sessionId: e.session_id, model: e.model, apiKeySource: e.apiKeySource ?? null, permissionMode: e.permissionMode });
        } else if (e.subtype === "permission_denied") {
          out.push({ type: "denied", tool: e.tool_name, toolUseId: e.tool_use_id });
        }
        break;
      case "stream_event": {
        const ev = e.event ?? {};
        if (ev.type === "content_block_start") {
          const b = ev.content_block ?? {};
          blocks.set(ev.index, { type: b.type, name: b.name, json: "" });
          if ((b.type === "thinking" || b.type === "redacted_thinking") && !e.parent_tool_use_id) out.push({ type: "thinking" });
        } else if (ev.type === "content_block_delta") {
          const d = ev.delta ?? {};
          const b = blocks.get(ev.index);
          if (d.type === "text_delta" && !e.parent_tool_use_id) out.push({ type: "text", delta: d.text });
          if (d.type === "input_json_delta" && b) {
            b.json += d.partial_json ?? "";
            if (b.name === "StructuredOutput") {
              structuredText = b.json;
              out.push({ type: "structured_partial", json: structuredText });
            } else if (!e.parent_tool_use_id && Math.floor(b.json.length / 1500) > (b.mark ?? 0)) {
              // a long Write/Edit is still being generated: report its size so the UI never looks stuck
              b.mark = Math.floor(b.json.length / 1500);
              const file = /"file_path"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(b.json)?.[1]?.replace(/\\\\/g, "\\");
              out.push({ type: "tool_stream", tool: b.name, file: file ? shorten(file, root) : null, bytes: b.json.length });
            }
          }
        }
        break;
      }
      case "assistant": {
        for (const c of e.message?.content ?? []) {
          if (c.type === "tool_use") out.push({ type: "activity", tool: c.name, toolUseId: c.id, input: c.input ?? {}, text: describeTool(c.name, c.input ?? {}, root), sub: !!e.parent_tool_use_id });
        }
        break;
      }
      case "user": {
        for (const c of Array.isArray(e.message?.content) ? e.message.content : []) {
          if (c.type === "tool_result" && c.is_error) out.push({ type: "tool_error", toolUseId: c.tool_use_id, text: String(typeof c.content === "string" ? c.content : JSON.stringify(c.content)).slice(0, 300) });
        }
        break;
      }
      case "rate_limit_event": {
        const i = e.rate_limit_info ?? {};
        out.push({ type: "rate", status: i.status, resetsAt: i.resetsAt, kind: i.rateLimitType, windows: i.unifiedWindows ?? null, isUsingOverage: !!i.isUsingOverage });
        break;
      }
      case "result": {
        const error = classifyResult(e);
        out.push({
          type: "result",
          ok: !e.is_error && !error,
          subtype: e.subtype,
          sessionId: e.session_id ?? st.sessionId,
          cost: Number(e.total_cost_usd ?? 0),
          durationMs: e.duration_ms ?? null,
          turns: e.num_turns ?? null,
          text: typeof e.result === "string" ? e.result : "",
          structured: e.structured_output ?? null,
          denials: (e.permission_denials ?? []).map((d) => ({ tool: d.tool_name, input: d.tool_input })),
          error,
        });
        break;
      }
      default:
        break;
    }
    return out;
  };

  return {
    state: st,
    // Feed raw stdout chunks; returns app events for every complete line.
    push(chunk) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      return lines.flatMap((l) => this.line(l));
    },
    line(l) {
      const s = l.replace(/^﻿/, "").trim();
      if (!s) return [];
      try {
        return handle(JSON.parse(s));
      } catch {
        return [{ type: "log", text: s.slice(0, 300) }];
      }
    },
    end() {
      const rest = buffer;
      buffer = "";
      return rest ? this.line(rest) : [];
    },
  };
};
