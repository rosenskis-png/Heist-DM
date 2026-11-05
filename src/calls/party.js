// The party call (docs/spec/calls/party.md): both companions at the table, in one call, as one exchange (D137).
import { ask } from "../ask.js";
import { partySchema } from "../../schemas/calls/party.js";
import { partyInput } from "../context.js";

// Every line and reaction is from one of the two companions.
export function speakerProblems(out, ids) {
  const bad = [];
  (out.lines ?? []).forEach((l, j) => ids.includes(l.from) || bad.push(`lines[${j}].from: "${l.from}" isn't one of ${ids.join(", ")}`));
  (out.reactions ?? []).forEach((x, i) => ids.includes(x.from) || bad.push(`reactions[${i}].from: "${x.from}" isn't one of ${ids.join(", ")}`));
  return bad;
}

export const partyCall = (io, env, c, companions, thread) =>
  ask(io, {
    call: "party",
    schema: partySchema,
    input: partyInput(env, c, companions, thread, partySchema),
    check: (out) => speakerProblems(out, companions.map((x) => x.id)),
  });
