// State-change operations (docs/spec/engine.md §9). Each mutates the working copy of state that `apply` owns.
// Validation happens before an operation gets here; these only do what they say.
import { bind, sheet, carried, conn } from "./world.js";
import { test } from "./cond.js";
import { crossings, route, unlocksInPassing } from "./map.js";

export function run(s, ops, ctx = {}) {
  for (const op of ops ?? []) one(s, op, ctx);
  settle(s);
}

// Rules ({if, then, else}) wrap operations in events and beats' on_start.
export function runRules(s, rules, ctx = {}) {
  for (const r of rules ?? []) run(s, !r.if || test(s, r.if, ctx) ? r.then : r.else ?? [], ctx);
}

// Moving through a connection whose key a mover carries unlocks it in passing (D56).
function travel(s, id, from, to, path) {
  if (!from || from === to) return;
  const movers = [id, ...carried(s, id)];
  const conns = path ? crossings(s, from, path).conns : route(s, from, to, movers) ?? [];
  let here = from;
  for (const cid of conns) {
    const c = conn(s, cid);
    if (unlocksInPassing(s, c, movers, here)) s.flags[cid].locked = false;
    if (c.ticks) s.pending += c.ticks;
    here = c.between.find((z) => z !== here);
  }
}

function one(s, op, ctx) {
  const [k, raw] = Object.entries(op)[0];
  const v = Object.fromEntries(Object.entries(raw).map(([key, x]) => [key, typeof x === "string" ? bind(x, ctx) : x]));
  switch (k) {
    case "move":
      travel(s, v.entity, s.at[v.entity], v.to, v.path);
      s.at[v.entity] = v.to;
      return;
    case "give": {
      const from = zoneAt(s, v.item);
      const to = zoneAt(s, v.to);
      if (from && to && from !== to) travel(s, v.item, from, to, v.path);
      delete s.at[v.item];
      s.holder[v.item] = v.to;
      return;
    }
    case "place":
      delete s.holder[v.item];
      s.at[v.item] = v.zone;
      return;
    case "consume":
      delete s.holder[v.item];
      delete s.at[v.item];
      s.consumed.push(v.item);
      return;
    case "set_flag": {
      const before = s.flags[v.entity]?.[v.key];
      (s.flags[v.entity] ??= {})[v.key] = v.value;
      if (raw.until) s.untils.push({ until: raw.until, undo: { flag: [v.entity, v.key, before ?? null] } });
      return;
    }
    case "set_disposition":
      s.disposition[v.npc] = v.value;
      return;
    case "edit_schedule": {
      const sc = (s.sched[v.npc] ??= { dropped: [], override: null });
      if (v.drop_beat && !sc.dropped.includes(v.drop_beat)) {
        sc.dropped.push(v.drop_beat);
        if (raw.until) s.untils.push({ until: raw.until, undo: { undrop: [v.npc, v.drop_beat] } });
      }
      // An override starts on the next tick.
      if (v.override) sc.override = { position: bind(v.override.position, ctx), from: s.tick + 1, to: s.tick + v.override.ticks };
      return;
    }
    case "reveal":
      if (!s.known.revealed.includes(v.id)) s.known.revealed.push(v.id);
      return;
    case "add_canon":
      s.canon.push({ kind: v.kind, text: v.text });
      return;
    case "use_ability": {
      const a = abilityOf(s, v.actor, v.ability);
      ((s.uses[v.actor] ??= {})[v.ability] ??= 0);
      s.uses[v.actor][v.ability] += 1;
      run(s, a?.declared?.effects ?? [], { ...ctx, self: v.actor });
      return;
    }
    case "add_ticks":
      s.pending += v.ticks;
      return;
    case "end_encounter":
      s.ended ??= { outcome: v.outcome, tick: s.tick };
      return;
  }
  throw new Error(`unknown operation ${k}`);
}

// A zone for a holder or an item, or the id itself if it's a zone.
const zoneAt = (s, id) => s.at[id] ?? (s.holder[id] ? zoneAt(s, s.holder[id]) : s.packet.map.zones.some((z) => z.id === id) ? id : null);

export const abilityOf = (s, actor, id) => {
  const a = sheet(s, actor)?.abilities;
  return [a?.combat, a?.noncombat].find((x) => x?.id === id);
};

// Undo every change whose `until` now holds. Repeats, since one undo can satisfy another.
export function settle(s) {
  for (let guard = 0; guard < 20; guard++) {
    const i = s.untils.findIndex((u) => test(s, u.until));
    if (i < 0) return;
    const [{ undo }] = s.untils.splice(i, 1);
    if (undo.flag) {
      const [e, k, v] = undo.flag;
      if (v === null) delete s.flags[e]?.[k];
      else s.flags[e][k] = v;
    } else if (undo.undrop) {
      const sc = s.sched[undo.undrop[0]];
      sc.dropped = sc.dropped.filter((b) => b !== undo.undrop[1]);
    }
  }
}
