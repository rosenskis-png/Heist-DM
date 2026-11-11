// The adjudicate call (docs/spec/calls/adjudicate.md).
import { ask } from "../ask.js";
import { adjudicateSchema } from "../../schemas/calls/adjudicate.js";
import { adjudicateInput } from "../context.js";
import { checkCard } from "../engine/index.js";

export const adjudicateCall = (io, env, s, c) =>
  ask(io, { call: "adjudicate", schema: adjudicateSchema, input: adjudicateInput(env, c, adjudicateSchema), fix: (out) => inOrder(s, out), check: (out) => checkCard(s, out) });

// A card's steps numbered in order, none before now or before the step ahead of it, and the plan done no earlier than
// its last step (D185): the DM's sense of the clock is a little loose, and a step a tick early changes nothing.
export function inOrder(s, out) {
  if (!Array.isArray(out.steps)) return out;
  let last = s.tick;
  const steps = out.steps.map((st, i) => {
    const at = Math.max(last, Number.isInteger(st.at) ? st.at : last);
    last = at;
    return { ...st, n: i + 1, at };
  });
  return { ...out, steps, ends_at: Math.max(last, Number.isInteger(out.ends_at) ? out.ends_at : last) };
}
