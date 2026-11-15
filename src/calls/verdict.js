// The verdict call (docs/spec/calls/verdict.md): when a room ends, how it went and what it moved in each companion (D146).
import { ask } from "../ask.js";
import { verdictSchema } from "../../schemas/calls/verdict.js";
import { verdictInput } from "../context.js";
import { speakerProblems } from "./party.js";

export const verdictCall = (io, env, c) =>
  ask(io, {
    call: "verdict",
    schema: verdictSchema,
    input: verdictInput(env, c, verdictSchema),
    // A reaction with no strength is a small one (D185).
    fix: (out) => ({ ...out, reactions: (out.reactions ?? []).map((r) => ({ intensity: 1, ...r })), memories: out.memories ?? [] }),
    check: (out) => [...speakerProblems({ reactions: out.reactions }, env.party.slice(1).map((p) => p.id)), ...memoryProblems(out, env.party.slice(1).map((p) => p.id))],
  });

// At most two memories a companion, each from one of the party's companions (D193).
export function memoryProblems(out, ids) {
  const problems = [];
  for (const m of out.memories ?? []) if (!ids.includes(m.from)) problems.push(`memory from ${m.from}: not one of the companions (${ids.join(", ")})`);
  for (const id of ids) if ((out.memories ?? []).filter((m) => m.from === id).length > 2) problems.push(`${id} has more than two memories of the room`);
  return problems;
}
