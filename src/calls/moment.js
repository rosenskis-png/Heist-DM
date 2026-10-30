// The moment call (docs/spec/calls/moment.md): one exchange of questions, checks, conversation or a combat round.
import { ask } from "../ask.js";
import { momentSchema } from "../../schemas/calls/moment.js";
import { momentInput } from "../context.js";
import { checkMoment } from "../engine/index.js";

export const momentCall = (io, env, s, c) =>
  ask(io, { call: "moment", schema: momentSchema, input: momentInput(env, c, momentSchema), check: (out) => checkMoment(s, out) });
