// The critique call (docs/spec/calls/critique.md): the sketch played four ways, and what's wrong with it (D120, D153).
import { ask } from "../ask.js";
import { critiqueSchema } from "../../schemas/calls/critique.js";
import { critiqueInput } from "../context.js";

export const critiqueCall = (io, env, c) => ask(io, { call: "critique", schema: critiqueSchema, input: critiqueInput(env, c, critiqueSchema) });
