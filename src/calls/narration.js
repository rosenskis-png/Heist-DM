// The narration call (docs/spec/calls/narration.md): prose from settled results, plus the texture it added.
import { ask } from "../ask.js";
import { narrationSchema } from "../../schemas/calls/narration.js";
import { narrationInput } from "../context.js";

export const narrationCall = (io, env, c) => ask(io, { call: "narration", schema: narrationSchema, input: narrationInput(env, c, narrationSchema) });
