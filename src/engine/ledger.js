// The ledger (D75): the DM rules and the engine keeps the books. The engine checks that a ruling names real
// things, records it, rolls the dice the DM asked for, runs the clock (routines, events) and checks the
// objective. It doesn't judge whether anything is possible. Semantics: docs/spec/engine.md §2.
import { person, thing, isParty, isNpc, zoneOf, sheet } from "./world.js";
import { nextTick, objectives, log, press, waitsCount } from "./clock.js";
import { d100, ODDS } from "./rng.js";
import { toughness, CONDITIONS, THREATS } from "../../content/rules.js";

// The ledger's size limits (D76). Facts are what's true now and matters later; history goes to the log. A
// ruling that would leave more than `facts` active, or add more than `newFacts` at once, goes back for the retry.
export const LEDGER = { facts: 20, newFacts: 6 };

// What a `reveal` can name: a hidden thing, a routine or a coming event (D44).
export const revealable = (s) =>
  new Set([
    ...["zones", "connections", "things", "facts"].flatMap((k) => s.packet.map[k].filter((x) => x.hidden).map((x) => x.id)),
    ...s.packet.people.filter((p) => p.schedule).map((p) => p.schedule.id),
    ...s.packet.clock.events.map((e) => e.id),
  ]);

// A room's things with those its telling made real (D184).
export const withMade = (packet, made = []) => (made.length ? { ...packet, map: { ...packet.map, things: [...packet.map.things, ...made.filter((m) => !packet.map.things.some((t) => t.id === m.id)).map((m) => ({ ...m, location: { holder: "party" }, made: true }))] } } : packet);

const ids = (s, ...kinds) =>
  new Set(
    kinds.flatMap((k) =>
      k === "people" ? s.packet.people.map((p) => p.id) : k === "party" ? s.party.map((p) => p.id) : s.packet.map[k].map((x) => x.id),
    ),
  );

// ---- Ability uses (D128) ----

export const abilitiesOf = (s, who) => {
  const a = sheet(s, who)?.abilities ?? {};
  return [a.combat, a.noncombat].filter(Boolean);
};

// What's left of a limited ability: this encounter and until the next rest, each as {left, of}. null is at will.
export function usesLeft(s, who, id) {
  const lim = abilitiesOf(s, who).find((a) => a.id === id)?.declared?.uses;
  if (!lim) return null;
  const here = s.used?.[who]?.[id] ?? 0;
  const before = s.spent?.[who]?.[id] ?? 0;
  return {
    ...(lim.encounter ? { encounter: { left: Math.max(0, lim.encounter - here), of: lim.encounter } } : {}),
    ...(lim.rest ? { rest: { left: Math.max(0, lim.rest - before - here), of: lim.rest } } : {}),
  };
}

// "1 of 1 this encounter, 3 of 3 until a rest", as every DM call and the sheet show it. null is at will.
export function usesText(s, who, id) {
  const u = usesLeft(s, who, id);
  if (!u) return null;
  return [u.encounter && `${u.encounter.left} of ${u.encounter.of} this encounter`, u.rest && `${u.rest.left} of ${u.rest.of} until a rest`].filter(Boolean).join(", ");
}

const usesNow = (u) => (u ? Math.min(u.encounter?.left ?? Infinity, u.rest?.left ?? Infinity) : Infinity);

// Every use in one output, counted against what's left: one past the limit goes back for the retry. `sets` are
// changes that all happen; for a check, pass whichever outcome uses more.
export function checkUses(s, sets) {
  const count = new Map();
  for (const ch of sets) for (const u of ch?.used ?? []) count.set(`${u.who}|${u.ability}`, (count.get(`${u.who}|${u.ability}`) ?? 0) + 1);
  const errors = [];
  for (const [key, n] of count) {
    const [who, id] = key.split("|");
    const a = abilitiesOf(s, who).find((x) => x.id === id);
    if (!a) continue;
    const left = usesNow(usesLeft(s, who, id));
    if (n > left)
      errors.push(`${sheet(s, who).name} has ${left === 0 ? "no" : `only ${left}`} ${a.name} left (${usesText(s, who, id)}), so this can't use it ${n} time${n > 1 ? "s" : ""}: rule it as not happening, or as done some other way`);
  }
  return errors;
}

// Of a check's two outcomes, the one that uses more abilities, for the count.
export const moreUses = (a, b) => ((b?.used?.length ?? 0) > (a?.used?.length ?? 0) ? b : a);

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
  for (const it of ch.items ?? []) {
    if (known.has(it.id) || ids(s, "things").has(it.id)) errors.push(`${at}: ${it.id} is already something here; give the new thing an id of its own`);
    if (!ids(s, "people", "party").has(it.by)) bad("holder", it.by);
    if ((s.made ?? []).length + (ch.items ?? []).length > MADE) errors.push(`${at}: at most ${MADE} things can be made real in one room`);
  }
  const made = new Set((ch.items ?? []).map((it) => it.id));
  for (const h of ch.holds ?? []) {
    if (!ids(s, "things").has(h.item) && !made.has(h.item)) bad("item", h.item);
    if (h.by !== null && !holders.has(h.by)) bad("holder", h.by);
    if (h.by === h.item) errors.push(`${at}: ${h.item} can't hold itself`);
  }
  for (const f of ch.flags ?? []) if (!anything.has(f.on)) bad("thing", f.on);
  for (const f of ch.facts ?? []) for (const id of f.about ?? []) if (!known.has(id)) bad("subject", id);
  const facts = new Set([...s.facts.map((f) => f.id), ...(ch.facts ?? []).map((f) => f.id)]);
  for (const id of ch.retire ?? []) if (!facts.has(id)) errors.push(`${at}: there's no fact ${id} to retire`);
  for (const w of ch.wounds ?? []) if (!isNpc(s, w.who)) errors.push(`${at}: wounds are for people in the encounter, not ${w.who}; harm to the party is a condition or \`down\``);
  for (const c of ch.conditions ?? []) if (!isParty(s, c.who)) errors.push(`${at}: conditions are for the party, not ${c.who}`);
  const conditions = new Set([...s.conditions.map((c) => c.id), ...(ch.conditions ?? []).map((c) => c.id)]);
  for (const id of ch.recover ?? []) if (!conditions.has(id)) errors.push(`${at}: there's no condition ${id} to recover from`);
  for (const r of ch.routine ?? []) if (!person(s, r.npc)?.schedule) errors.push(`${at}: ${r.npc} has no routine`);
  for (const m of ch.moods ?? []) if (!isNpc(s, m.npc)) bad("person", m.npc);
  const can = revealable(s);
  for (const id of ch.reveal ?? []) if (!can.has(id)) errors.push(`${at}: ${id} isn't hidden, a routine or an event`);
  // A priced thing the party takes is bought, and the party can't spend gold it doesn't have (D147).
  const cost = (ch.holds ?? []).filter((h) => isParty(s, h.by) && !isParty(s, s.holder[h.item])).reduce((t, h) => t + (thing(s, h.item)?.price ?? 0), 0);
  if (cost > s.gold) errors.push(`${at}: that costs ${cost} gold, and the party has ${s.gold}`);
  for (const u of ch.used ?? []) {
    if (!isParty(s, u.who)) errors.push(`${at}: abilities used are the party's, not ${u.who}'s`);
    else if (!abilitiesOf(s, u.who).some((a) => a.id === u.ability)) errors.push(`${at}: ${u.ability} isn't one of ${sheet(s, u.who).name}'s abilities (${abilitiesOf(s, u.who).map((a) => a.id).join(", ")})`);
  }
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

// How many conditions the party would carry after these changes (CONDITIONS.max).
export function checkConditionBudget(s, all) {
  const ids = new Set(s.conditions.map((c) => c.id));
  for (const ch of all) {
    for (const c of ch?.conditions ?? []) ids.add(c.id);
    for (const id of ch?.recover ?? []) ids.delete(id);
  }
  return ids.size > CONDITIONS.max ? [`the party would carry ${ids.size} conditions; at most ${CONDITIONS.max}. Replace one by reusing its id, or recover from one`] : [];
}

// Telling blows a person can take before they're down, from their tier (D130).
export const toughnessOf = (p) => toughness[p.tier] ?? 1;

// What each person fighting the party is about to do (D130): real people, one line each.
export function checkThreats(s, threats = [], at = "threats") {
  const errors = [];
  if (threats.length > THREATS.max) errors.push(`${at}: at most ${THREATS.max}, one for each person still fighting`);
  const seen = new Set();
  for (const t of threats) {
    if (!isNpc(s, t.who)) errors.push(`${at}: ${t.who} isn't a person in this encounter`);
    if (seen.has(t.who)) errors.push(`${at}: one line for ${t.who}, not two`);
    seen.add(t.who);
  }
  return errors;
}

// Threats stand until the next account or scene replaces them; nobody who's down threatens anyone.
const setThreats = (s, threats) => {
  s.threats = (threats ?? []).filter((t) => !s.flags[t.who]?.down);
};

// Records a ruling. Moving an NPC who has a routine takes them off it until a ruling puts them back.
// How many things one room's telling can make real (D184).
const MADE = 8;

export function applyChanges(s, ch = {}) {
  // A thing made real joins the room's things; the state remembers it, so a save or a replay makes it again.
  for (const { by, ...it } of ch.items ?? []) {
    if (s.packet.map.things.some((t) => t.id === it.id)) continue;
    s.made = [...(s.made ?? []), it];
    s.packet = withMade(s.packet, [it]);
    s.holder[it.id] = by;
  }
  for (const m of ch.moves ?? []) {
    delete s.holder[m.who];
    s.at[m.who] = m.to;
    if (person(s, m.who)?.schedule && !s.offRoutine.includes(m.who)) s.offRoutine.push(m.who);
  }
  for (const h of ch.holds ?? []) {
    if (isParty(s, h.by) && !isParty(s, s.holder[h.item])) s.gold -= thing(s, h.item)?.price ?? 0;
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
  for (const w of ch.wounds ?? []) {
    s.toughness[w.who] = Math.max(0, (s.toughness[w.who] ?? 1) - (w.n ?? 1));
    if (!s.toughness[w.who]) (s.flags[w.who] ??= {}).down = true;
  }
  for (const c of ch.conditions ?? []) {
    const cond = { id: c.id, who: c.who, text: c.text };
    const i = s.conditions.findIndex((x) => x.id === c.id);
    if (i >= 0) s.conditions[i] = cond;
    else s.conditions.push(cond);
  }
  s.conditions = s.conditions.filter((c) => !(ch.recover ?? []).includes(c.id));
  for (const r of ch.routine ?? []) {
    s.offRoutine = s.offRoutine.filter((id) => id !== r.npc);
    if (!r.follows) s.offRoutine.push(r.npc);
  }
  for (const m of ch.moods ?? []) s.disposition[m.npc] = m.value;
  for (const id of ch.reveal ?? []) if (!s.known.revealed.includes(id)) s.known.revealed.push(id);
  for (const u of ch.used ?? []) {
    const mine = ((s.used ??= {})[u.who] ??= {});
    mine[u.ability] = (mine[u.ability] ?? 0) + 1;
    log(s, { used: `${u.who} ${u.ability}` });
  }
  setThreats(s, s.threats);
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
  // Steps after the stop may be listed as not having happened (D138); the engine drops them when it applies the account.
  for (const st of out.steps)
    if (stop !== undefined && st.n > stop && (st.happened !== "no" || hasChanges(st.changes)))
      errors.push(`the plan stopped at step ${stop}, so step ${st.n} didn't happen: leave it out, or list it as "no" with no changes`);
  for (const st of out.steps) {
    if (!card.steps.some((c) => c.n === st.n)) errors.push(`step ${st.n} isn't on the card`);
    const r = rolls.find((x) => x.n === st.n);
    if (r && !r.success && st.happened === "yes") errors.push(`step ${st.n}'s roll failed, so it can't have happened in full; the card said: ${card.steps.find((c) => c.n === st.n).roll.fails}`);
    errors.push(...checkChanges(s, st.changes, `step ${st.n}`));
  }
  errors.push(...checkChanges(s, out.after, "after"));
  errors.push(...checkFactBudget(s, [{ facts: card.rulings }, ...out.steps.map((st) => st.changes), out.after]));
  errors.push(...checkConditionBudget(s, [...out.steps.map((st) => st.changes), out.after]));
  errors.push(...checkUses(s, [...out.steps.map((st) => st.changes), out.after]));
  errors.push(...checkThreats(s, out.threats));
  const happened = card.steps.filter((c) => out.steps.some((st) => st.n === c.n && st.happened !== "no"));
  const floor = Math.max(s.tick, ...happened.map((c) => c.at));
  if (out.ends_at < floor) errors.push(`ends_at must be tick ${floor} or later`);
  return errors;
}

// Whether a step's changes change anything.
const hasChanges = (ch) => !!ch && Object.values(ch).some((v) => (Array.isArray(v) ? v.length : v != null));

// The card's rulings as facts, as they will be once the card runs: what the resolve call reads as the ledger, so it
// doesn't record them again (D138).
export function withRulings(s, card) {
  const ruled = card.rulings.map((f) => ({ id: f.id, text: f.text, about: f.about ?? [], known: f.known ?? true, since: s.tick }));
  return { ...s, facts: [...s.facts.filter((f) => !ruled.some((r) => r.id === f.id)), ...ruled] };
}

// Runs a played-out card: the card's rulings become facts, each step's changes land on its tick, then the
// people respond, and the clock stops where the plan ended. Steps listed after a stop are dropped.
export function resolve(s, card, rolls, out) {
  applyChanges(s, { facts: card.rulings });
  const stop = out.stopped?.at;
  for (const st of out.steps.filter((x) => stop === undefined || x.n <= stop)) {
    const c = card.steps.find((x) => x.n === st.n);
    if (st.happened !== "no") advanceTo(s, c.at);
    if (s.ended) break;
    applyChanges(s, st.changes);
    // What happened is history: it goes in the log, which every call sees the end of, not in the facts.
    log(s, { step: st.n, [st.happened === "yes" ? "did" : st.happened === "partly" ? "partly" : "didnt"]: st.what });
  }
  if (!s.ended) advanceTo(s, out.ends_at);
  if (!s.ended) applyChanges(s, out.after);
  // The account leaves the fight where it stands: what each person still fighting is about to do, or nothing.
  setThreats(s, out.threats);
  log(s, { plan: out.steps.map((st) => `${st.n}:${st.happened}`).join(" "), ...(out.stopped ? { stopped: out.stopped.at } : {}) });
  return { rolls, steps: out.steps, stopped: out.stopped ?? null };
}

// ---- A question to the DM (D133) ----

// The answer's rulings are facts the party knows, and name only what's in the encounter. Nothing the party
// hasn't found may be named, in the answer or its rulings, since the party hears both.
export function checkAnswer(s, out) {
  const ch = { facts: (out.rulings ?? []).map((f) => ({ ...f, known: true })), retire: out.retire ?? [] };
  const errors = [...checkChanges(s, ch, "rulings"), ...checkFactBudget(s, [ch])];
  const said = [out.reply, ...(out.rulings ?? []).map((f) => f.text)].join(" \n ").toLowerCase();
  for (const t of hiddenTerms(s)) if (said.includes(t)) errors.push(`the party hasn't found "${t}", so the answer can't name it`);
  return errors;
}

// Records an answer: its rulings join the ledger as facts the party knows, so the card and every later call treat
// them as true. Nothing moves and no time passes.
export function answer(s, out) {
  applyChanges(s, { facts: (out.rulings ?? []).map((f) => ({ ...f, known: true })), retire: out.retire ?? [] });
  for (const l of out.learned ?? []) log(s, { learned: l });
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
  errors.push(...checkConditionBudget(s, [out.changes, ...(out.checks ?? []).flatMap((c) => [c.success.changes, c.failure.changes])]));
  errors.push(...checkUses(s, [out.changes, ...(out.checks ?? []).map((c) => moreUses(c.success.changes, c.failure.changes))]));
  errors.push(...checkThreats(s, out.threats));
  if (out.ticks > 12) errors.push("an exchange takes at most 12 ticks; longer is a plan");
  // A fight is a plan (D130): once anyone is fighting the party, what the party does goes on the card.
  if (s.threats.length && ((out.checks ?? []).length || out.ticks > 0))
    errors.push(`someone is fighting the party (${s.threats.map((x) => x.who).join(", ")}), so what the party does goes on the card: answer and talk here, with no checks and no time, and put what they want to do in "plan"`);
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
    return { odds, roll, success };
  });
  applyChanges(s, out.changes);
  for (const l of out.learned ?? []) log(s, { learned: l });
  if (out.threats) setThreats(s, out.threats);
  advanceTo(s, s.tick + out.ticks);
  // A failed check, or a deliberate wait, moves the room's trouble on a step (D176).
  press(s, checks.filter((c) => !c.success).length + (out.waited && waitsCount(s) ? 1 : 0));
  return { checks };
}
