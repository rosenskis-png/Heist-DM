// The step call (docs/spec/calls/step.md): the player's plan, turned into steps. The engine's check of ids,
// moves, flags and known routines goes back for the one retry; named routes that fail only on size don't,
// they go to the ruling call (D55).
import { ask } from "../ask.js";
import { stepSchema } from "../../schemas/calls/step.js";
import { stepInput } from "../context.js";
import { checkSteps } from "../engine/index.js";

export const stepCall = (io, env, s, c) =>
  ask(io, { call: "step", schema: stepSchema, input: stepInput(env, c, stepSchema), check: (out) => checkSteps(s, out).errors });
