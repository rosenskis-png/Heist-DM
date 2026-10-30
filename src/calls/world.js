// The world call (docs/spec/calls/world.md): how the people in the encounter respond, as state changes.
import { ask } from "../ask.js";
import { worldSchema } from "../../schemas/calls/world.js";
import { worldInput } from "../context.js";
import { checkWorld } from "../engine/index.js";

export const worldCall = (io, env, s, c) =>
  ask(io, { call: "world", schema: worldSchema, input: worldInput(env, c, worldSchema), check: (out) => checkWorld(s, out) });
