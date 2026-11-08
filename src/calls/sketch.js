// The sketch call (docs/spec/calls/sketch.md): the whole room as a DM's prep note (D117, D160). A sketch that builds on
// a worn-out prop goes back once (D169).
import { ask } from "../ask.js";
import { sketchSchema } from "../../schemas/calls/sketch.js";
import { sketchInput } from "../context.js";
import { STALE, STALE_WORDS } from "../../content/stale.js";

export function sketchProblems(out) {
  const m = JSON.stringify(out).match(STALE_WORDS);
  return m ? [`"${m[0]}" is worn out (${STALE.join("; ")}): replace it with something this room's own place and people would have`] : [];
}

export const sketchCall = (io, env, c) => ask(io, { call: "sketch", schema: sketchSchema, input: sketchInput(env, c, sketchSchema), check: sketchProblems });
