// The stock call (docs/spec/calls/stock.md): when a room ends, the DM and the player take stock out of character (D190).
// The DM grants things the record or the narration supports, names who could come along, and keeps the loose ends.
import { ask } from "../ask.js";
import { stockSchema } from "../../schemas/calls/stock.js";
import { stockInput } from "../context.js";

// Holders are the party; nobody is listed twice.
export function stockProblems(out, partyIds) {
  const problems = [];
  for (const f of out.found ?? []) if (!partyIds.includes(f.holder)) problems.push(`found "${f.name}": holder ${f.holder} isn't in the party (${partyIds.join(", ")})`);
  const names = (out.followers ?? []).map((f) => f.name.trim().toLowerCase());
  for (const n of new Set(names.filter((n, i) => names.indexOf(n) !== i))) problems.push(`followers: ${n} is listed twice`);
  return problems;
}

export const stockCall = (io, env, c) =>
  ask(io, {
    call: "stock",
    schema: stockSchema,
    input: stockInput(env, c, stockSchema),
    check: (out) => stockProblems(out, env.party.map((p) => p.id)),
  });
