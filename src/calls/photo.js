// The photo call (docs/spec/calls/photo.md, D170): fills the slots of the fixed photo prompt for one moment; code
// assembles the prompt from them and her picture identity (`photoPrompt` in src/campaign/photo.js).
import { ask } from "../ask.js";
import { photoSchema } from "../../schemas/calls/photo.js";
import { photoInput } from "../context.js";

// Slots never name anyone: an image model would draw the name, or a stranger.
export function photoProblems(out, names) {
  const re = names.length ? new RegExp(`\\b(${names.join("|")})\\b`, "i") : null;
  return re ? Object.entries(out).filter(([, v]) => typeof v === "string" && re.test(v)).map(([k, v]) => `${k} names ${v.match(re)[0]}; describe, never name`) : [];
}

export const photoCall = (io, env, c, self, others) =>
  ask(io, { call: "photo", schema: photoSchema, input: photoInput(env, c, self, others, photoSchema), check: (out) => photoProblems(out, [self, ...others].flatMap((m) => [m.name, m.secondVoice?.name].filter(Boolean))) });
