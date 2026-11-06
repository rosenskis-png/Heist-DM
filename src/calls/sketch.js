// The sketch call (docs/spec/calls/sketch.md): the whole room in plain English, design statement first (D117, D153).
import { ask } from "../ask.js";
import { sketchSchema } from "../../schemas/calls/sketch.js";
import { sketchInput } from "../context.js";

export const sketchCall = (io, env, c) => ask(io, { call: "sketch", schema: sketchSchema, input: sketchInput(env, c, sketchSchema) });
