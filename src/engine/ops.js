// The operations a packet runs in its events, beats and start (docs/spec/engine.md §9). Each mutates the working
// copy of state that `apply` owns. The DM's own writes are ledger changes (ledger.js), not operations.
import { bind } from "./world.js";
import { test } from "./cond.js";

export function run(s, ops, ctx = {}) {
  for (const op of ops ?? []) one(s, op, ctx);
}

// Rules ({if, then, else}) wrap operations in events and beats' on_start.
export function runRules(s, rules, ctx = {}) {
  for (const r of rules ?? []) run(s, !r.if || test(s, r.if, ctx) ? r.then : r.else ?? [], ctx);
}

function one(s, op, ctx) {
  const [k, raw] = Object.entries(op)[0];
  const v = Object.fromEntries(Object.entries(raw).map(([key, x]) => [key, typeof x === "string" ? bind(x, ctx) : x]));
  switch (k) {
    case "move":
      s.at[v.entity] = v.to;
      return;
    case "give":
      delete s.at[v.item];
      s.holder[v.item] = v.to;
      return;
    case "place":
      delete s.holder[v.item];
      s.at[v.item] = v.zone;
      return;
    case "set_flag":
      (s.flags[v.entity] ??= {})[v.key] = v.value;
      return;
    case "reveal":
      if (!s.known.revealed.includes(v.id)) s.known.revealed.push(v.id);
      return;
    case "add_canon":
      s.canon.push({ kind: v.kind, text: v.text });
      return;
    case "end_encounter":
      s.ended ??= { outcome: v.outcome, tick: s.tick };
      return;
  }
  throw new Error(`unknown operation ${k}`);
}
