// The companion call (docs/spec/calls/companion.md): what she says next, for the huddle or a private channel (D137).
import { ask } from "../ask.js";
import { companionSchema } from "../../schemas/calls/companion.js";
import { companionInput } from "../context.js";

export const companionCall = (io, env, c, self, others, thread) =>
  ask(io, { call: "companion", schema: companionSchema, input: companionInput(env, c, self, others, thread, companionSchema) });
