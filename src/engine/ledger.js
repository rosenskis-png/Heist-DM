// Ruled mode (D75): the DM rules and the engine keeps the books. The engine checks that a ruling names real
// things, records it, rolls the dice the DM asked for, runs the clock (routines, events) and checks the
// objective. It doesn't judge whether anything is possible. Semantics: docs/spec/ruled.md.
import { person, isParty, isNpc, zoneOf, sheet } from "./world.js";
import { nextTick, objectives, log } from "./clock.js";
import { revealable } from "./moment.js";
import { d100, ODDS } from "./rng.js";
import { enemyTiers } from "../../content/rules.js";

// The ledger's size limits (D76). Facts are what's true now and matters later; history goes to the log. A
// ruling that would leave more than `facts` active, or add more than `newFacts` at once, goes back for the retry.
export const LEDGER = { facts: 20, newFacts: 6 };

const ids = (s, ...kinds) =>
  new Set(
    kinds.flatMap((k) =>
      k === "people" ? s.packet.people.map((p) => p.id) : k === "party" ? s.party.map((p) => p.id) : s.packet.map[k].map((x) => x.id),
    ),
  );

// What a ruling may name: real zones, people and things. Anything else goes back for the one retry.
export function checkChanges(s, ch = {}, at = "changes") {
  const errors = [];
  const zones = ids(s, "zones");
  const movable = ids(s, "people", "party", "things");
  const holders = movable;
  const anything = ids(s, "people", "party", "things", "zones", "connections");
  const known = new Set([...anything, ...ids(s, "facts")]);
  const bad = (what, id) => errors.push(`${at}: ${what} ${id} isn't in this encounter`);
  for (const m of ch.moves ?? []) {
    if (!movable.has(m.who)) bad("who", m.who);
    if (!zones.has(m.to)) bad("zone", m.to);
  }
  for (const h of ch.holds ?? []) {
    if (!ids(s, "things").has(h.item)) bad("item", h.item);
    if (h.by !== null && !holders.has(h.by)) bad("holder", h.by);
    if (h.by === h.item) errors.push(`${at}: ${h.item} can't hold itself`);
  }
  for (const f of ch.flags ?? []) if (!anything.has(f.on)) bad("thing", f.on);
  for (const f of ch.facts ?? []) for (const id of f.about ?? []) if (!known.has(id)) bad("subject", id);
  const facts = new Set([...s.facts.map((f) => f.id), ...(ch.facts ?? []).map((f) => f.id)]);
  for (const id of ch.retire ?? []) if (!facts.has(id)) errors.push(`${at}: there's no fact ${id} to retire`);
  for (const h of ch.hp ?? []) if (!isParty(s, h.who) && !isNpc(s, h.who)) bad("person", h.who);
  for (const r of ch.routine ?? []) if (!person(s, r.npc)?.schedule) errors.push(`${at}: ${r.npc} has no routine`);
  for (const m of ch.moods ?? []) if (!isNpc(s, m.npc)) bad("person", m.npc);
  const can = revealable(s);
  for (const id of ch.reveal ?? []) if (!can.has(id)) errors.push(`${at}: ${id} isn't hidden, a routine or an event`);
  return errors;
}

// The fact budget for one call's output: every change it could make, the card's rulings included.
export function checkFactBudget(s, all) {
  const active = new Set(s.facts.map((f) => f.id));
  const added = new Set();
  for (const ch of all) {
    for (const f of ch?.facts ?? []) if (!active.has(f.id)) added.add(f.id);
  }
  const retired = new Set(all.flatMap((ch) => ch?.retire ?? []));
  const total = [...active].filter((id) => !retired.has(id)).length + [...added].filter((id) => !retired.has(id)).length;
  const errors = [];
  if (added.size > LEDGER.newFacts) errors.push(`${added.size} new facts at once; record at most ${LEDGER.newFacts}, only what's true now and will matter later (what happened goes in "what")`);
  if (total > LEDGER.facts)
    errors.push(`the ledger would hold ${total} facts; it holds at most ${LEDGER.facts}. Retire facts that are no longer true or no longer matter, or replace one by reusing its id. Active: ${[...active].join(", ")}`);
  return errors;
}

const maxHp = (s, id) => sheet(s, id)?.abilities?.hp ?? person(s, id)?.hp ?? enemyTiers[person(s, id)?.tier]?.hp ?? 1;

// Records a ruling. Moving an NPC who has a routine takes them off it until a ruling puts them back.
export function applyChanges(s, ch = {}) {
  for (const m of ch.moves ?? []) {
    delete s.holder[m.who];
    s.at[m.who] = m.to;
    if (person(s, m.who)?.schedule && !s.offRoutine.includes(m.who)) s.offRoutine.push(m.who);
  }
  for (const h of ch.holds ?? []) {
    if (h.by === null) {
      s.at[h.item] = zoneOf(s, h.item);
      delete s.holder[h.item];
    } else {
      delete s.at[h.item];
      s.holder[h.item] = h.by;
    }
  }
  for (const f of ch.flags ?? []) (s.flags[f.on] ??= {})[f.key] = f.value;
  for (const f of ch.facts ?? []) {
    const fact = { id: f.id, text: f.text, about: f.about ?? [], known: f.known ?? true, since: s.tick };
    const i = s.facts.findIndex((x) => x.id === f.id);
    if (i >= 0) s.facts[i] = fact;
    else s.facts.push(fact);
  }
  s.facts = s.facts.filter((f) => !(ch.retire ?? []).includes(f.id));
  for (const h of ch.hp ?? []) s.hp[h.who] = Math.max(0, Math.min(maxHp(s, h.who), (s.hp[h.who] ?? maxHp(s, h.who)) + h.by));
  for (const r of ch.routine ?? []) {
    s.offRoutine = s.offRoutine.filter((id) => id !== r.npc);
    if (!r.follows) s.offRoutine.push(r.npc);
  }
  for (const m of ch.moods ?? []) s.disposition[m.npc] = m.value;
  for (const id of ch.reveal ?? []) if (!s.known.revealed.includes(id)) s.known.revealed.push(id);
  objectives(s);
}

// Time passes to a tick: routines move the people still following them, and events fire (Uzga's arrival).
export function advanceTo(s, tick) {
  while (s.tick < tick && !s.ended) nextTick(s);
}

// ---- The card ----

// Hidden things the party hasn't found: their ids and names must not appear on the card (D36).
export function hiddenTerms(s) {
  const { map } = s.packet;
  return [...map.zones, ...map.connections, ...map.things, ...map.facts]
    .filter((x) => x.hidden && !s.known.revealed.includes(x.id))
    .flatMap((x) => [x.id, x.name])
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

export function checkCard(s, out) {
  const errors = [];
  const who = ids(s, "people", "party");
  let last = s.tick;
  out.steps.forEach((st, i) => {
    if (st.n !== i + 1) errors.push(`steps must be numbered 1, 2, 3… in order (found ${st.n} at position ${i + 1})`);
    if (st.at < last) errors.push(`step ${st.n} starts at tick ${st.at}, before ${i ? `step ${st.n - 1}` : `now (tick ${s.tick})`}`);
    last = Math.max(last, st.at);
    for (const id of st.who) if (!who.has(id)) errors.push(`step ${st.n}: ${id} isn't a person in this encounter`);
  });
  if (out.ends_at < last) errors.push(`ends_at (${out.ends_at}) is before the last step's tick (${last})`);
  const terms = hiddenTerms(s);
  const shown = [...out.steps.flatMap((st) => [st.summary, st.roll?.reason, st.roll?.fails]), ...out.rulings.map((r) => r.text), ...(out.notes ?? [])].filter(Boolean).join(" \n ").toLowerCase();
  for (const t of terms) if (shown.includes(t)) errors.push(`the card names "${t}", which the party doesn't know about`);
  for (const r of out.rulings) errors.push(...checkChanges(s, { facts: [r] }, `ruling ${r.id}`));
  return errors;
}

// The engine rolls every roll on the card before the DM plays it out, so the dice are settled first.
export function rollCard(s, card) {
  return card.steps.filter((st) => st.roll).map((st) => {
    const odds = ODDS[st.roll.band];
    const roll = d100(s);
    return { n: st.n, odds, roll, success: roll <= odds };
  });
}

// What the DM says happened must fit the card and the dice: steps in order, nothing past the stop, and no
// step whose roll failed happening in full.
export function checkResolve(s, card, rolls, out) {
  const errors = [];
  const listed = out.steps.map((st) => st.n);
  listed.forEach((n, i) => {
    if (n !== i + 1) errors.push(`list the steps in order from 1 without gaps (found ${n} at position ${i + 1})`);
  });
  const stop = out.stopped?.at;
  if (stop === undefined && listed.length < card.steps.length) errors.push(`the plan didn't stop, so all ${card.steps.length} steps need an entry`);
  if (stop !== undefined && listed.some((n) => n > stop)) errors.push(`the plan stopped at step ${stop}, so nothing after it happened`);
  for (const st of out.steps) {
    if (!card.steps.some((c) => c.n === st.n)) errors.push(`step ${st.n} isn't on the card`);
    const r = rolls.find((x) => x.n === st.n);
    if (r && !r.success && st.happened === "yes") errors.push(`step ${st.n}'s roll failed, so it can't have happened in full; the card said: ${card.steps.find((c) => c.n === st.n).roll.fails}`);
    errors.push(...checkChanges(s, st.changes, `step ${st.n}`));
  }
  errors.push(...checkChanges(s, out.after, "after"));
  errors.push(...checkFactBudget(s, [{ facts: card.rulings }, ...out.steps.map((st) => st.changes), out.after]));
  const happened = card.steps.filter((c) => out.steps.some((st) => st.n === c.n && st.happened !== "no"));
  const floor = Math.max(s.tick, ...happened.map((c) => c.at));
  if (out.ends_at < floor) errors.push(`ends_at must be tick ${floor} or later`);
  return errors;
}

// Runs a played-out card: the card's rulings become facts, each step's changes land on its tick, then the
// people respond, and the clock stops where the plan ended.
export function resolve(s, card, rolls, out) {
  applyChanges(s, { facts: card.rulings });
  for (const st of out.steps) {
    const c = card.steps.find((x) => x.n === st.n);
    if (st.happened !== "no") advanceTo(s, c.at);
    if (s.ended) break;
    applyChanges(s, st.changes);
    // What happened is history: it goes in the log, which every call sees the end of, not in the facts.
    log(s, { step: st.n, [st.happened === "yes" ? "did" : st.happened === "partly" ? "partly" : "didnt"]: st.what });
  }
  if (!s.ended) advanceTo(s, out.ends_at);
  if (!s.ended) applyChanges(s, out.after);
  s.history.plans += 1;
  for (const r of rolls.filter((x) => out.steps.some((st) => st.n === x.n))) s.history.rolls.push(r.success);
  if (out.stopped) s.history.interrupts += 1;
  log(s, { plan: out.steps.map((st) => `${st.n}:${st.happened}`).join(" "), ...(out.stopped ? { stopped: out.stopped.at } : {}) });
  return { rolls, steps: out.steps, stopped: out.stopped ?? null };
}

// ---- A scene (the Moment tab) ----

export function checkScene(s, out) {
  const who = ids(s, "people", "party");
  const errors = [];
  (out.checks ?? []).forEach((c, i) => {
    if (!who.has(c.who)) errors.push(`check ${i + 1}: ${c.who} isn't a person in this encounter`);
    errors.push(...checkChanges(s, c.success.changes, `check ${i + 1} success`), ...checkChanges(s, c.failure.changes, `check ${i + 1} failure`));
  });
  errors.push(...checkChanges(s, out.changes));
  errors.push(...checkFactBudget(s, [out.changes, ...(out.checks ?? []).flatMap((c) => [c.success.changes, c.failure.changes])]));
  if (out.ticks > 12) errors.push("an exchange takes at most 12 ticks; longer is a plan");
  return errors;
}

// Rolls each check and records the outcome, then lets the exchange's time pass.
export function scene(s, out) {
  const checks = (out.checks ?? []).map((c) => {
    const odds = ODDS[c.band];
    const roll = d100(s);
    const success = roll <= odds;
    applyChanges(s, (success ? c.success : c.failure).changes);
    log(s, { check: c.who, success });
    s.history.rolls.push(success);
    return { odds, roll, success };
  });
  applyChanges(s, out.changes);
  for (const l of out.learned ?? []) log(s, { learned: l });
  advanceTo(s, s.tick + out.ticks);
  return { checks };
}
