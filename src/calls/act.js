// The act call (docs/spec/calls/act.md): what an act holds, decided when it begins from what the party has done (D164).
import { ask } from "../ask.js";
import { actSchema } from "../../schemas/calls/act.js";
import { actInput } from "../context.js";

// What's wrong with an act beyond its schema: holders must be the world's factions, and each kind of busy-ness once.
export function actProblems(out, world) {
  const problems = out.holders.filter((f) => !world.factions[f]).map((f) => `${f} isn't one of this world's factions (${Object.keys(world.factions).join(", ")})`);
  const kinds = out.busy.map((b) => b.kind);
  if (new Set(kinds).size !== kinds.length) problems.push("each kind of busy-ness appears once");
  return problems;
}

export const actCall = (io, env, c) => ask(io, { call: "act", schema: actSchema, input: actInput(env, c, actSchema), check: (out) => actProblems(out, c.world) });
