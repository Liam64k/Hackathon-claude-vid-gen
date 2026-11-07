// ElevenLabs key: from the environment, or typed in the UI and kept in this process's memory only.
// Never written to disk, never logged, never put in state.json or a child-process environment.
let memKey = null;

export const setElevenKey = (k) => {
  const s = String(k ?? "").trim();
  memKey = s ? s : null;
};
export const elevenKey = () => memKey ?? (process.env.ELEVENLABS_API_KEY?.trim() || null);
export const elevenKeySource = () => (memKey ? "session" : process.env.ELEVENLABS_API_KEY?.trim() ? "env" : null);

// Remove anything key-shaped from text before it goes to the UI or a log.
export const redact = (text) => {
  let s = String(text ?? "");
  const k = elevenKey();
  if (k) s = s.split(k).join("[key]");
  return s.replace(/sk_[A-Za-z0-9]{16,}/g, "[key]").replace(/sk-ant-[A-Za-z0-9_-]{10,}/g, "[key]");
};
