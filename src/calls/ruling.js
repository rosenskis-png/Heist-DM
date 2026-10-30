// The ruling call (docs/spec/calls/ruling.md): can this thing pass through that connection, in this case (D55, D57)?
import { ask } from "../ask.js";
import { rulingSchema } from "../../schemas/calls/ruling.js";
import { rulingInput } from "../context.js";

export const rulingCall = (io, env, question) => ask(io, { call: "ruling", schema: rulingSchema, input: rulingInput(env, question) });
