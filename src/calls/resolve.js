// The resolve call (docs/spec/calls/resolve.md), in ruled mode (D75).
import { ask } from "../ask.js";
import { resolveSchema } from "../../schemas/calls/resolve.js";
import { resolveInput } from "../context.js";
import { checkResolve } from "../engine/index.js";

// `c.card` and `c.dice` are what the prompt reads; `card` and `dice` are what the engine checks against.
export const resolveCall = (io, env, s, c, card, dice) =>
  ask(io, { call: "resolve", schema: resolveSchema, input: resolveInput(env, c, resolveSchema), check: (out) => checkResolve(s, card, dice, out) });
