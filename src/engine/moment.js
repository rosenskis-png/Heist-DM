// Moments (docs/spec/calls/moment.md): checks, what the party learns, conversations, and combat rounds.
// The Moment AI judges; the engine validates its output, rolls, deals damage and decides when a fight ends.
import { isParty, isNpc, partyIds } from "./world.js";
import { run } from "./ops.js";
import { triggers, objectives, log } from "./clock.js";
import { flagKeys } from "./plan.js";
import { d100, ODDS } from "./rng.js";

const ID_KEYS = ["entity", "to", "item", "npc", "holder", "actor", "zone"];
function idsIn(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => idsIn(n, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) {
      if (ID_KEYS.includes(k) && typeof v === "string") out.push(v);
      else idsIn(v, out);
    }
  return out;
}

const allIds = (s) =>
  new Set([
    ...["zones", "connections", "things", "facts"].flatMap((k) => s.packet.map[k].map((x) => x.id)),
    ...s.packet.people.map((p) => p.id),
    ...s.packet.clock.meters.map((m) => m.id),
    ...s.party.map((p) => p.id),
  ]);

// What a `reveal` can name: a hidden thing, a routine or a coming event (D44).
export const revealable = (s) =>
  new Set([
    ...["zones", "connections", "things", "facts"].flatMap((k) => s.packet.map[k].filter((x) => x.hidden).map((x) => x.id)),
    ...s.packet.people.filter((p) => p.schedule).map((p) => p.schedule.id),
    ...s.packet.clock.events.map((e) => e.id),
  ]);

// Any AI-written operations: real ids, and only flag keys the packet already uses (D52).
export function checkOps(s, ops, at) {
  const ids = allIds(s);
  const keys = flagKeys(s);
  const errors = [];
  for (const id of idsIn(ops)) if (!ids.has(id) && !id.startsWith("@")) errors.push(`${at}: unknown id ${id}`);
  for (const op of ops) {
    if (op.set_flag && !keys.has(op.set_flag.key)) errors.push(`${at}: flag "${op.set_flag.key}" isn't one the packet uses; write new facts as canon`);
    if (op.reveal && !revealable(s).has(op.reveal.id)) errors.push(`${at}: ${op.reveal.id} isn't hidden, a routine or an event`);
  }
  return errors;
}

// The world call's output, checked against state before it's applied (docs/spec/calls/world.md).
export function checkWorld(s, out) {
  return out.actions.flatMap((a, i) => [...(isNpc(s, a.npc) ? [] : [`action ${i + 1}: ${a.npc} isn't a person in this encounter`]), ...checkOps(s, a.ops, `action ${i + 1}`)]);
}

// The Moment call's output, checked against state (docs/spec/engine.md §1).
export function checkMoment(s, out) {
  const errors = [];
  const ids = allIds(s);
  const can = revealable(s);
  for (const id of out.reveals ?? []) if (!can.has(id)) errors.push(`reveals: ${id} isn't hidden, a routine or an event`);
  for (const d of out.dispositions ?? []) if (!isNpc(s, d.npc)) errors.push(`dispositions: ${d.npc} isn't a person in this encounter`);
  for (const p of out.promises ?? []) for (const id of [p.by, p.to]) if (!ids.has(id)) errors.push(`promises: unknown id ${id}`);
  if (out.check) {
    if (!isParty(s, out.check.actor)) errors.push(`check: ${out.check.actor} isn't in the party`);
    errors.push(...checkOps(s, [...out.check.on_success.ops, ...out.check.on_failure.ops], "check"));
  }
  if (out.combat) {
    if (!s.combat) errors.push("combat: there's no fight going on; leave combat out");
    else {
      const enemies = fighting(s);
      for (const i of out.combat.intents) if (!enemies.includes(i.enemy)) errors.push(`combat: ${i.enemy} isn't in the fight`);
      for (const e of enemies) if (!out.combat.intents.some((i) => i.enemy === e)) errors.push(`combat: no intent for ${e}`);
      out.combat.actions.forEach((a, n) => {
        const at = `combat action ${n + 1}`;
        if (!isParty(s, a.actor)) errors.push(`${at}: ${a.actor} isn't in the party`);
        else if (down(s, a.actor)) errors.push(`${at}: ${a.actor} is down and can't act`);
        if (a.kind !== "other" && !enemies.includes(a.target)) errors.push(`${at}: a ${a.kind} needs a target in the fight`);
        if (a.kind === "ability" && !a.ability) errors.push(`${at}: name the ability`);
        errors.push(...checkOps(s, [...a.on_success.ops, ...a.on_failure.ops], at));
      });
    }
  }
  return errors;
}

// ---- Applying a moment ----

// Applies a validated Moment output (moment action). Returns what the UI needs to show: which narration of a
// check or combat action matches the roll, and the engine's own results.
export function applyMoment(s, out) {
  const r = {};
  for (const id of out.reveals ?? []) run(s, [{ reveal: { id } }]);
  for (const d of out.dispositions ?? []) run(s, [{ set_disposition: d }]);
  for (const t of out.texture ?? []) run(s, [{ add_canon: { kind: "texture", text: t } }]);
  for (const p of out.promises ?? []) s.promises.push(p);
  for (const l of out.learned ?? []) log(s, { learned: l });
  if (out.check) {
    // A check costs a tick, added to pending (docs/spec/architecture.md, Time).
    const c = out.check;
    const odds = ODDS[c.difficulty];
    const roll = d100(s);
    const success = roll <= odds;
    run(s, (success ? c.on_success : c.on_failure).ops, { self: c.actor });
    s.pending += 1;
    log(s, { check: c.skill, actor: c.actor, success });
    r.check = { odds, roll, success };
  }
  if (out.combat && s.combat) r.round = round(s, out.combat);
  triggers(s);
  objectives(s);
  return r;
}

// A conversation costs a tick when it ends (D69).
export function endConversation(s, npc) {
  s.pending += 1;
  log(s, { talked: npc });
}

// ---- Combat (docs/spec/engine.md §7; content/rules.js) ----

const down = (s, id) => (s.combat?.hp?.[id] ?? s.hp[id]) <= 0;
export const fighting = (s) => (s.combat?.enemies ?? []).filter((e) => !down(s, e) && !s.combat.out.includes(e));

function hurt(s, id, n) {
  if (s.combat.hp[id] !== undefined) s.combat.hp[id] = Math.max(0, s.combat.hp[id] - n);
  else s.hp[id] = Math.max(0, (s.hp[id] ?? 0) - n);
  if (down(s, id)) (s.flags[id] ??= {}).down = true;
}

// One exchange: roll each declared action, deal the damage, then every enemy nobody engaged hits its target
// for 1. Ticks accrue on rounds 2, 4, 6. The fight ends when no enemy is left in it, or the whole party is down.
function round(s, combat) {
  const c = s.combat;
  c.round += 1;
  const res = { n: c.round, actions: [], hits: [] };
  for (const i of combat.intents) if (i.yields && !c.out.includes(i.enemy)) c.out.push(i.enemy);
  const engaged = new Set();
  for (const a of combat.actions) {
    if (down(s, a.actor)) continue;
    if (a.target && !fighting(s).includes(a.target)) {
      res.actions.push({ actor: a.actor, moot: true });
      continue;
    }
    if (a.ability) run(s, [{ use_ability: { actor: a.actor, ability: a.ability } }], { self: a.actor });
    const odds = ODDS[a.difficulty];
    const roll = a.difficulty === "automatic" ? null : d100(s);
    const success = roll === null || roll <= odds;
    if (a.target) engaged.add(a.target);
    run(s, (success ? a.on_success : a.on_failure).ops, { self: a.actor });
    if (a.kind === "strike") {
      if (success) hurt(s, a.target, a.weapon ? 2 : 1);
      else hurt(s, a.actor, 1), res.hits.push({ by: a.target, to: a.actor, n: 1 });
    }
    if (a.kind === "ability" && success && !c.out.includes(a.target)) c.out.push(a.target);
    res.actions.push({ actor: a.actor, odds, roll, success });
  }
  const standing = partyIds(s).filter((id) => !down(s, id));
  for (const e of fighting(s)) {
    if (engaged.has(e) || !standing.length) continue;
    const want = combat.intents.find((i) => i.enemy === e)?.target;
    const to = standing.includes(want) ? want : standing[0];
    hurt(s, to, 1);
    res.hits.push({ by: e, to, n: 1 });
  }
  if (c.round % 2 === 0) s.pending += 1;
  const lost = partyIds(s).every((id) => down(s, id));
  if (!fighting(s).length || lost) {
    res.over = lost ? "lost" : "won";
    log(s, { fight: res.over, enemies: c.enemies });
    s.fights.push({ enemies: c.enemies, outcome: res.over, hp: c.hp, out: c.out });
    s.combat = null;
  } else log(s, { round: c.round });
  return res;
}
