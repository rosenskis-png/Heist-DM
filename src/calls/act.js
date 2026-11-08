// The act call (docs/spec/calls/act.md): what an act holds, decided when it begins from what the party has done (D164).
import { ask } from "../ask.js";
import { actSchema } from "../../schemas/calls/act.js";
import { actInput } from "../context.js";

// The act as code keeps it (D164, D167, D169): holders kept to the world's factions (the region's holders if none are);
// live mysteries kept to the world's; returning people kept to those the party has met.
export function tidyAct(out, world, act, memory = []) {
  const holders = out.holders.filter((f) => world.factions[f]);
  const ids = (world.mysteries ?? []).map((m) => m.id);
  const mysteries = out.mysteries.filter((m) => ids.includes(m));
  const met = memory.map((p) => p.name);
  return {
    ...out,
    holders: holders.length ? holders : world.regions?.[act - 1]?.holders ?? Object.keys(world.factions),
    mysteries: mysteries.length ? mysteries : ids,
    returning: (out.returning ?? []).filter((n) => met.some((m) => m === n || m.startsWith(n) || n.startsWith(m))),
  };
}

// Nothing to send back beyond the schema: code tidies the rest.
export const actProblems = () => [];

export const actCall = (io, env, c) =>
  ask(io, { call: "act", schema: actSchema, input: actInput(env, c, actSchema), check: actProblems }).then((out) => tidyAct(out, c.world, c.act, c.memory ?? []));
