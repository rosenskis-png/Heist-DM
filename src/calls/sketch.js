// The sketch call (docs/spec/calls/sketch.md): the whole room as a DM's prep note (D117, D160). A sketch that builds on
// a worn-out prop goes back once (D169).
import { ask } from "../ask.js";
import { sketchSchema } from "../../schemas/calls/sketch.js";
import { sketchInput } from "../context.js";
import { staleProblems } from "../../content/stale.js";

export const sketchProblems = staleProblems;

export const sketchCall = (io, env, c) => ask(io, { call: "sketch", schema: sketchSchema, input: sketchInput(env, c, sketchSchema), check: sketchProblems });
