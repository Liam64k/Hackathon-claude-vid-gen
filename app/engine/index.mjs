// Providers: { name, run(stage, prompt, opts) -> { events: AsyncIterable<appEvent>, cancel() } }
//
// - "claude-cli" (default): the user's own signed-in `claude` program, run locally (engine/claude.mjs).
// - "replay": recorded runs + cached artifacts, zero Claude calls (engine/replay.mjs).
// - "anthropic-api-key": DOCUMENTED STUB, NOT BUILT. A future provider could call the Messages API with
//   a user-supplied key, emitting the same app events (init, activity, text, structured_partial,
//   rate, result). It is deliberately absent: Studio's guardrails say the AI is the user's own Claude
//   Code login, and keys are never stored.
export { claudeCli } from "./claude.mjs";
export { replay } from "./replay.mjs";

export const anthropicApiKey = {
  name: "anthropic-api-key",
  run() {
    throw new Error("The anthropic-api-key provider is a documented stub and is not built.");
  },
};
