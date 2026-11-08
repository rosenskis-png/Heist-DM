// The act call (docs/spec/calls/act.md): what an act holds, decided when it begins from what the party has done (D164).
import { ask } from "../ask.js";
import { actSchema } from "../../schemas/calls/act.js";
import { actInput } from "../context.js";
import { BUSY } from "../campaign/seed.js";

// Words that name each kind of busy-ness, so a kind worded a little differently ("hard labor", "a funeral") still matches.
const WORDS = [
  ["labour", "labor", "work", "toil"], ["feast", "celebrat", "festival", "revel"], ["rite", "worship", "prayer", "ritual", "ceremony"],
  ["punish", "execut", "torture", "trial"], ["trade", "market", "bazaar", "barter"], ["raid", "war", "muster"],
  ["sleep", "night", "watch", "rest"], ["sick", "plague", "disease", "fever"], ["ruin", "decay", "collapse"],
  ["beast", "monster", "animal", "creature"], ["burial", "mourn", "funeral", "grave"], ["contest", "game", "duel", "race", "sport"],
  ["build", "repair", "construct"], ["train", "drill", "exercise"],
];
export function kindOf(text) {
  const t = String(text).toLowerCase();
  const exact = BUSY.find((k) => k === t);
  if (exact) return exact;
  const i = WORDS.findIndex((ws) => ws.some((w) => t.includes(w)));
  return i >= 0 ? BUSY[i] : null;
}

// The act as code keeps it (D164, D167): each busy line matched to a kind in the seed's list, once each, unmatched ones
// dropped; holders kept to the world's factions (the region's holders if none are); live mysteries kept to the world's;
// returning people kept to those the party has met.
export function tidyAct(out, world, act, memory = []) {
  const seen = new Set();
  const busy = out.busy.map((b) => ({ kind: kindOf(b.kind), line: b.line })).filter((b) => b.kind && !seen.has(b.kind) && seen.add(b.kind));
  const holders = out.holders.filter((f) => world.factions[f]);
  const ids = (world.mysteries ?? []).map((m) => m.id);
  const mysteries = out.mysteries.filter((m) => ids.includes(m));
  const met = memory.map((p) => p.name);
  return {
    ...out,
    busy,
    holders: holders.length ? holders : world.regions?.[act - 1]?.holders ?? Object.keys(world.factions),
    mysteries: mysteries.length ? mysteries : ids,
    returning: (out.returning ?? []).filter((n) => met.some((m) => m === n || m.startsWith(n) || n.startsWith(m))),
  };
}

// What's wrong with an act beyond its schema: only what code can't tidy, which is nothing usable to draw from.
export function actProblems(out, world, act, memory = []) {
  const t = tidyAct(out, world, act, memory);
  return t.busy.length >= 2 ? [] : [`name each busy line's kind from the list given: ${BUSY.join("; ")}`];
}

export const actCall = (io, env, c) =>
  ask(io, { call: "act", schema: actSchema, input: actInput(env, c, actSchema), check: (out) => actProblems(out, c.world, c.act, c.memory ?? []) }).then((out) => tidyAct(out, c.world, c.act, c.memory ?? []));
