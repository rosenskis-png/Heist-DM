// The adjudicate call (docs/spec/calls/adjudicate.md), in ruled mode (D75).
import { ask } from "../ask.js";
import { adjudicateSchema } from "../../schemas/calls/adjudicate.js";
import { adjudicateInput } from "../context.js";
import { checkCard } from "../engine/index.js";

export const adjudicateCall = (io, env, s, c) =>
  ask(io, { call: "adjudicate", schema: adjudicateSchema, input: adjudicateInput(env, c, adjudicateSchema), check: (out) => checkCard(s, out) });
