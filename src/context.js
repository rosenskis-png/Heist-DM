// Context assembly: what each call sees (docs/spec/context.md §1–3). Pure functions; the caller does the
// fetching and the calling. Used by the bench page and, from Phase 4, the game.
import { layoutFacts } from "./engine/map.js";
import { beatOf } from "./engine/clock.js";
import { partyPerceives, memberPerceives } from "./engine/perceive.js";
import { invariants } from "../content/setting.js";
import { combatRule, strike } from "../content/rules.js";

// Strip coordinates (D9) and, for the party's view, everything hidden. The layout comes as facts the engine
// derived from geometry: sizes and distances (D28).
export function mapFor(packet, { knownOnly = false } = {}) {
  const { map } = packet;
  const keep = (x) => !(knownOnly && x.hidden);
  return {
    layout: layoutFacts(packet, { knownOnly }),
    zones: map.zones.filter(keep).map(({ rects, ...z }) => z),
    connections: map.connections.filter(keep).map(({ wall, square, ...c }) => c),
    things: map.things.filter(keep).map(({ location, ...t }) => {
      const { at, ...loc } = location ?? {};
      return { ...t, location: loc };
    }),
    facts: map.facts.filter(keep),
  };
}

// The party's map: no size categories, which players never see and which mislead judgment (D57, D59).
function partyMap(packet) {
  const m = mapFor(packet, { knownOnly: true });
  return { ...m, connections: m.connections.map(({ fits, fits_unlocked, ...c }) => c), things: m.things.map(({ size, ...t }) => t) };
}

// Act-tagged worked examples: kept only from their act on (docs/spec/context.md §3).
export function promptFor(text, act) {
  return text.replace(/<!-- example act:(\d+) -->([\s\S]*?)<!-- \/example -->/g, (_, from, body) =>
    act >= Number(from) ? body.trim() : "",
  );
}

// Invariants in play this act: a gated one is absent before its act, not forbidden (docs/spec/context.md §3).
export const invariantsFor = (act, list = invariants) => list.filter((i) => act >= (i.fromAct ?? 1)).map((i) => i.text);

// Abilities as the AIs read them: the effect text, never the engine's `declared` block (D30, D59).
const abilitiesFor = ({ combat, noncombat, ...rest }) => {
  const strip = (a) => a && (({ declared, ...x }) => x)(a);
  return { ...rest, combat: strip(combat), noncombat: strip(noncombat) };
};

// The rules-facing part of a sheet: who they are and what they can do.
const playSheet = (s) => ({ id: s.id, name: s.name, role: s.role, skills: s.skills, abilities: abilitiesFor(s.abilities) });

// Where a companion stands with the player, as encounters see it (D79): a mood from a short fixed list, why, and
// what she has learned, all written at camp. Never her secrets, history or romance arc: those stay at the campfire.
export const standingOf = (env, id) => env.standing?.[id] ?? { mood: "steady", learned: [] };

// A companion in an encounter (D79): how she talks, thinks and acts, what she can do, and her standing. The rest
// of her profile (look, fantasy, backstory, secrets) is for the campfire.
export function briefProfile(c, standing) {
  const { mood, why, learned } = standing;
  return {
    id: c.id,
    name: c.name,
    race: c.race,
    role: c.role,
    voice: c.voice,
    beliefs: c.beliefs,
    rules: c.rules,
    pursuit: c.pursuit,
    planning: { reaches_for: c.planning.reaches_for, hunch: c.planning.hunch },
    skills: c.skills,
    abilities: abilitiesFor(c.abilities),
    mood: why ? `${mood}: ${why}` : mood,
    ...(learned?.length ? { learned } : {}),
  };
}

// A companion's huddle profile is an allowlist (D59): fields not named here, including UI and engine data
// and special cases not yet declared (Phase 5), never reach a prompt.
const HUDDLE_FIELDS = ["id", "name", "race", "age", "role", "blurb", "fantasy", "heatMode", "look", "outfit", "pursuit",
  "heatActs", "turnoffs", "flattery", "voice", "rules", "skills", "beliefs", "admires", "despises", "askAbout", "other",
  "suppressed", "darkTriggers"];

// A companion's own profile, gated by relationship and act (docs/spec/companions.md §3) and by D50:
// she gets her hunch and the plan she reaches for, never her blind spots.
export function ownProfile(c, rel, act) {
  const { hidden, deep, dark, payoff, quest, questAct, planning, react } = c;
  const out = Object.fromEntries(HUDDLE_FIELDS.filter((k) => c[k] !== undefined).map((k) => [k, c[k]]));
  out.abilities = abilitiesFor(c.abilities);
  out.planning = { reaches_for: planning.reaches_for, hunch: planning.hunch };
  if ((rel.turn ?? 0) < 8) Object.assign(out, { first: c.first, why: c.why });
  if (rel.intimacy >= 2 || rel.payoff) out.hidden = hidden;
  if (rel.payoff || rel.intimacy >= 5 || rel.lean >= 3) Object.assign(out, { deep, dark });
  if (!rel.payoff && rel.heat >= payoff.at - 2) out.payoff_scene = payoff.scene;
  if (act >= questAct - 1) out.quest = quest;
  out.react = react[rel.config] ?? null;
  return out;
}

const publicProfile = (c) => ({ id: c.id, name: c.name, role: c.role, blurb: c.blurb, voice: c.voice, abilities: abilitiesFor(c.abilities) });

// What the party knows about the people: names, known routines, and what's been learned.
function learnedPeople(people) {
  return people.map((p) => ({
    id: p.id,
    name: p.name,
    ...(p.schedule?.known ? { routine: p.schedule.beats.map((b) => ({ beat: b.id, does: b.label, cue: b.cue })) } : {}),
  }));
}

function knownClock(clock) {
  return { events: clock.events.filter((e) => e.known).map(({ id, at_tick }) => ({ id, at_tick })) };
}

// Compact JSON: indentation would cost about a third more input on every call.
const block = (title, body) => `## ${title}\n\n${typeof body === "string" ? body : "```json\n" + JSON.stringify(body) + "\n```"}`;

// ---- Live state, as the AIs read it ----

const entries = (o, keep) => Object.fromEntries(Object.entries(o).filter(([k]) => keep(k)));

// How much texture and log a ruled call gets: the latest, not all of it (D76).
const CANON = 10;
const LOG = 16;

// The event log, one entry per line. The party's view leaves out the engine's own bookkeeping: trigger ids and
// events the party doesn't know about.
function logFor(s, party) {
  const knownEvent = (id) => s.packet.clock.events.find((e) => e.id === id && (e.known || s.known.revealed.includes(id)));
  return s.log.filter((l) => !party || (!l.trigger && (!l.event || knownEvent(l.event)))).slice(-40);
}

// Where everyone and everything is, flags, meters, dispositions, canon and the event log, for the plan calls
// and the Moment AI. With `party`, only what the party perceives or knows (the companions' view, D40).
export function stateFor(s, { party = false } = {}) {
  const partyIds = s.party.map((p) => p.id);
  const { seen } = partyPerceives(s);
  const hidden = new Set(["zones", "connections", "things", "facts"].flatMap((k) => s.packet.map[k]).filter((x) => x.hidden && !s.known.revealed.includes(x.id)).map((x) => x.id));
  const visible = (id) => partyIds.includes(id) || (seen.has(s.at[id]) && !hidden.has(id)) || partyIds.includes(s.holder[id]);
  const beats = Object.fromEntries(
    s.packet.people
      .filter((p) => p.schedule && (!party || p.schedule.known || s.known.revealed.includes(p.schedule.id)))
      .map((p) => [p.id, beatOf(s, p.id)?.id])
      .filter(([, b]) => b),
  );
  const out = {
    tick: s.tick,
    beats,
    positions: entries(s.at, (id) => s.at[id] != null && (!party || visible(id))),
    held: entries(s.holder, (id) => !party || visible(id) || visible(s.holder[id])),
    flags: party ? entries(s.flags, (id) => partyIds.includes(id) || (!hidden.has(id) && s.packet.map.connections.some((c) => c.id === id))) : s.flags,
    hp: entries(s.hp, (id) => partyIds.includes(id)),
    // Texture keeps its truth in state; calls get the latest (D76). Rulings that matter later are facts.
    canon: s.ruled ? s.canon.slice(-CANON) : s.canon,
    log: logFor(s, party),
  };
  if (!party) Object.assign(out, { pending_ticks: s.pending, meters: s.meters, dispositions: s.disposition, revealed: s.known.revealed, promises: s.promises });
  if (s.combat) out.fight = { round: s.combat.round, enemies: s.combat.enemies.map((e) => ({ id: e, hp: s.combat.hp[e], out: s.combat.out.includes(e) })) };
  // Ruled mode (D75): the DM's facts (the party's view keeps the ones it knows), who's off their routine, and
  // NPC hurt. Meters don't run there.
  if (s.ruled) {
    delete out.meters;
    out.facts = (party ? s.facts.filter((f) => f.known) : s.facts).map(({ id, text, about }) => ({ id, text, ...(about.length ? { about } : {}) }));
    if (!party) Object.assign(out, { off_routine: s.offRoutine, hurt: entries(s.hp, (id) => !partyIds.includes(id)) });
  }
  if (s.ended) out.ended = s.ended.outcome;
  return out;
}

// What's coming, tick by tick: each routine's beat for the people still following it, and the events due.
// The party's version has only the routines and events it knows.
export function timelineFor(s, { ticks = 12, party = false } = {}) {
  const knows = (id) => s.known.revealed.includes(id);
  const people = s.packet.people.filter((p) => p.schedule && s.at[p.id] != null && !s.offRoutine?.includes(p.id) && (!party || p.schedule.known || knows(p.schedule.id)));
  const events = s.packet.clock.events.filter((e) => !s.fired.includes(e.id) && s.due[e.id] !== undefined && (!party || e.known || knows(e.id)));
  return Array.from({ length: ticks }, (_, i) => {
    const t = s.tick + i;
    const beats = Object.fromEntries(people.map((p) => [p.id, ((b) => `${b.id}: ${b.label} (${b.position})`)(beatOf(s, p.id, t))]));
    const due = events.filter((e) => s.due[e.id] === t).map((e) => e.id);
    return { tick: t, ...(people.length ? { beats } : {}), ...(due.length ? { events: due } : {}) };
  });
}

// What each party member sees and hears now, and what an ordinary person would from each zone the party knows:
// the facts behind "could she see that from there?" (D39). Members' own traits apply only where they stand.
export function perceptionFor(s) {
  const person = s.party[0].id;
  const zones = s.packet.map.zones.filter((z) => !z.hidden || s.known.revealed.includes(z.id));
  const view = (p) => ({ sees: p.seen, hears_speech_from: p.heard });
  return {
    now: Object.fromEntries(s.party.map((m) => [m.id, view(memberPerceives(s, m.id))])),
    from_each_zone: Object.fromEntries(zones.map((z) => [z.id, view(memberPerceives(s, person, z.id))])),
  };
}

// The schema as compact type notation: the same contract at about a quarter of the size of JSON Schema.
// `T[]` is a list, `a?` is optional, `|` separates alternatives; named types are defined below the root.
export function shapeText(schema) {
  const { $defs = {}, ...root } = schema;
  const named = { id: "a lowercase id like cell_far", ref: "an id, or @self or @step_zone", text: "a non-empty string" };
  const queue = [];
  const t = (s) => {
    if (s.$ref) {
      const n = s.$ref.replace("#/$defs/", "");
      if (!queue.includes(n)) queue.push(n);
      return n;
    }
    if (s.const !== undefined) return JSON.stringify(s.const);
    if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
    if (s.oneOf || s.anyOf) return (s.oneOf ?? s.anyOf).map(t).join(" | ");
    if (s.prefixItems) return `[${s.prefixItems.map(t).join(", ")}]`;
    if (s.type === "array") {
      const inner = t(s.items);
      const range = s.maxItems ? ` (${s.minItems ?? 0}–${s.maxItems})` : s.minItems ? ` (at least ${s.minItems})` : "";
      return `${/[ |]/.test(inner) && !/^[{[]/.test(inner) ? `(${inner})` : inner}[]${range}`;
    }
    if (s.type === "object" && s.properties)
      return `{ ${Object.entries(s.properties).map(([k, v]) => `${k}${s.required?.includes(k) ? "" : "?"}: ${t(v)}`).join(", ")} }`;
    if (s.type === "integer") return s.minimum != null ? `integer ≥ ${s.minimum}${s.maximum != null ? ` and ≤ ${s.maximum}` : ""}` : "integer";
    if (Array.isArray(s.type)) return s.type.join(" | ");
    return s.type ?? "any";
  };
  const lines = [`The answer: ${t(root)}`];
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i];
    lines.push(`${n} = ${named[n] ?? t($defs[n])}`);
  }
  return "`T[]` is a list of T, `key?` is optional, `|` separates alternatives. No other keys are allowed.\n\n" + lines.join("\n");
}

// Keep only the $defs a schema actually reaches, so a call isn't sent definitions it can't use.
export function pruned(schema) {
  const { $defs, ...root } = schema;
  const keep = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.$ref === "string") {
      const name = node.$ref.replace("#/$defs/", "");
      if (!keep.has(name)) {
        keep.add(name);
        walk($defs[name]);
      }
    }
    Object.values(node).forEach(walk);
  };
  walk(root);
  return keep.size ? { ...root, $defs: Object.fromEntries([...keep].map((k) => [k, $defs[k]])) } : root;
}

function compose(parts) {
  return parts.filter(Boolean).join("\n\n") + "\n\nReturn only the JSON object, with no other text.";
}

// Campaign tier, then encounter, then live (docs/spec/context.md §1).
function campaign(env, call, schema) {
  return [
    block("How this game is written", env.prompts.style),
    block("Your job", promptFor(env.prompts[call], env.act)),
    block("Output format", shapeText(schema)),
    invariantsFor(env.act).length ? block("World facts that never change", invariantsFor(env.act)) : null,
  ];
}

function encounterFull(env) {
  const { intent, people, clock, opening } = env.packet;
  return [block("The encounter", { intent, people, clock, map: mapFor(env.packet) }), block("Opening description", opening)];
}

// The party as the DM's calls see it; companions add their voice and mood, so the DM can voice them (D79).
const sheets = (env) => env.party.map((p, i) => (i === 0 ? playSheet(p) : { ...playSheet(p), voice: p.voice, mood: standingOf(env, p.id).mood }));

export function stepInput(env, c, schema) {
  return compose([
    ...campaign(env, "step", schema),
    block("Characters", sheets(env)),
    ...encounterFull(env),
    block("Right now", c.now ?? { tick: c.tick, beat: env.beatAt(c.tick), positions: env.packet.start.positions, canon: [] }),
    c.recent?.length ? block("Recent exchanges", c.recent) : null,
    block("Stances the player has decided", c.stances),
    block("The plan, in the player's words", c.plan),
    "Turn this plan into steps.",
  ]);
}

export function pricingInput(env, c, schema) {
  const facts = c.facts.map(({ interrupts, ...f }) => f);
  const arrivals = c.facts.flatMap((f) => f.interrupts.filter((i) => i.code === "arrival").map((i) => ({ n: f.n, ...i })));
  return compose([
    ...campaign(env, "pricing", schema),
    block("Characters", sheets(env)),
    ...encounterFull(env),
    c.now ? block("Right now", c.now) : null,
    block("The plan, in the player's words", c.plan),
    block("The steps", c.step_call.steps),
    block("What the party foresees for each step (from the engine)", facts),
    block("Projected arrivals the party doesn't foresee (warnings only, never priced or named)", arrivals),
    "Price each step.",
  ]);
}

// The world call returns structure only, and the engine has already run triggers, senses and beat rules,
// so it gets none of those, no prose style guide, and only the people who are present (D59).
function worldEncounter(env) {
  const { intent, people, clock, opening } = env.packet;
  const present = people
    .filter((p) => p.position)
    .map(({ schedule, senses, ...p }) =>
      schedule ? { ...p, routine: schedule.beats.map((b) => ({ beat: b.id, does: b.label, at: b.position })) } : p,
    );
  const coming = clock.events.map(({ id, at_tick }) => ({ id, at_tick }));
  const meters = clock.meters.map(({ id, name, max }) => ({ id, name, max }));
  return [
    block("The encounter", { intent, people: present, coming, meters, reactions_the_engine_runs: clock.triggers.map((t) => t.id), map: mapFor(env.packet) }),
    block("Opening description", opening),
  ];
}

export function worldInput(env, c, schema) {
  return compose([
    block("Your job", promptFor(env.prompts.world, env.act)),
    block("Output format", shapeText(schema)),
    block("Characters", env.party.map((s) => ({ id: s.id, name: s.name, hp: s.abilities.hp }))),
    ...worldEncounter(env),
    block("What just happened (the engine's results)", c.results),
    block("State now", c.state),
    block("How the encounter has gone (table read)", c.table),
    "Decide how the people in this encounter respond.",
  ]);
}

export function narrationInput(env, c, schema) {
  return compose([
    ...campaign(env, "narration", schema),
    block("Voices", env.party.filter((s) => s.voice).map((s) => ({ id: s.id, name: s.name, voice: s.voice }))),
    ...encounterFull(env),
    block("The plan, in the player's words", c.plan),
    block("The card's steps", c.steps),
    block("What happened to each step (the engine's results)", c.results),
    block("How the world responded", c.world),
    block("State now", c.state),
    c.recent?.length ? block("Recent exchanges", c.recent) : null,
    "Narrate this for the player.",
  ]);
}

// A companion in the huddle or a private channel, in an encounter: her brief, not her full profile (D79). In
// ruled mode the encounter and what the party can see come as plain lines (D76); the opening reaches her through
// the DM's narration.
export function companionInput(env, c, self, others, huddle, schema) {
  const { people, clock } = env.packet;
  const pair = env.pairFor(self.id, others.map((o) => o.id));
  const privately = c.channel === "private";
  const ruled = env.state?.ruled;
  return compose([
    ...campaign(env, "companion", schema),
    block("You are", briefProfile(self, standingOf(env, self.id))),
    block("At the table with you", [{ id: "player", name: env.party[0].name, role: env.party[0].role ?? "The player" }, ...others.map(publicProfile)]),
    block("What the party knows", ruled ? encounterText(env.packet, env.state, { party: true, intent: false, sheets: false, secrets: false }) : { map: partyMap(env.packet), people: learnedPeople(people), clock: knownClock(clock) }),
    c.now ? block("What the party can see right now", c.now) : null,
    c.recent?.length ? block("What has happened, as the DM told it", c.recent) : null,
    pair ? block("You and the other companion", pair) : null,
    block(privately ? "Just you and the player, through your ring (the other companion can't hear this)" : "The huddle so far", huddle),
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    c.card ? block("The plan as the card shows it", c.card) : null,
    privately ? `The player is talking to you alone. It's your turn, as ${self.name}.` : `It's your turn in the huddle, as ${self.name}.`,
  ]);
}

// The Moment AI: the full packet with hidden things marked, live state, the engine's perception facts, and the
// current conversation (docs/spec/context.md §2). No intent: it answers and plays people, it doesn't pace.
export function momentInput(env, c, schema) {
  const { people, clock, opening } = env.packet;
  return compose([
    ...campaign(env, "moment", schema),
    block("Characters", sheets(env)),
    block("The encounter", { people, clock, map: mapFor(env.packet) }),
    block("Opening description", opening),
    block("Right now", c.now),
    block("What the party could see and hear (from the engine)", c.perception),
    c.fight ? block("The fight", { rule: combatRule, strike: strike.effect, ...c.fight }) : null,
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    c.recent?.length ? block("Recent exchanges", c.recent) : null,
    block(c.to === "dm" ? "The player asks the DM" : `The player is talking to ${c.to}`, c.conversation),
    c.fight ? "Run this round of the fight." : "Answer the player.",
  ]);
}

export function graderInput(flaws, said) {
  return `You are checking a game's test output. Below are problems with a plan, and messages characters said about it.
For each message, list the ids of the problems it points out or fixes, even loosely. Count a problem only if the message addresses that specific problem; a message about something else, or one that only agrees with the plan, catches nothing.

Problems:
${flaws.map((f) => `- ${f.id}: ${f.text}`).join("\n")}

Messages:
${said.map((m, i) => `[${i}] ${m ?? "(says nothing)"}`).join("\n")}

Return only JSON: {"caught": [[ids for message 0], [ids for message 1], ...]}, one list per message, in order.`;
}

// One neutral question about fit (D55): the two things involved, in rough real dimensions rather than the game's
// size categories (D57), and canon. Never the plan.
const SPAN = { tiny: "three inches across", small: "a foot across", medium: "a person's width", large: "a wide doorway" };
const GAP = {
  bars: "iron bars about five inches apart",
  grate: "an iron grate with gaps about three inches across",
  drain: "a drain opening about three inches across",
};
export function rulingInput(env, { who, connection, by, canon = [] }) {
  const { things, zones } = env.packet.map;
  const sheet = (id) => {
    const t = things.find((x) => x.id === id);
    if (t) return { name: t.name, description: t.properties };
    return { name: env.party.find((x) => x.id === id)?.name ?? id, description: "a person" };
  };
  const c = env.connections.get(connection);
  const zone = (id) => zones.find((z) => z.id === id)?.name ?? id;
  return [
    env.prompts.ruling,
    block("The thing", sheet(who)),
    block("The opening", { name: c.name ?? c.kind, between: c.between.map(zone), roughly: GAP[c.kind] ?? `an opening about ${SPAN[c.fits]}` }),
    by && by !== who ? block("Who's doing it", sheet(by)) : null,
    block("Canon so far", canon),
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---- Ruled mode (D75) ----

// The ledger as plain lines (D76): where everyone and everything is, doors and flags, hurt, moods, the facts, and
// the latest of the log and texture. With `party`, only what the party can see or knows (the companions' view);
// `history: false` leaves out the log and texture, for a call that gets the DM's narration instead.
export function ledgerText(s, { party = false, history = true } = {}) {
  const st = stateFor(s, { party });
  const pairs = (o, f = (k, v) => `${k} ${v}`) => Object.entries(o).map(([k, v]) => f(k, v)).join("; ");
  const flags = Object.entries(st.flags)
    .map(([id, f]) => `${id} ${Object.entries(f).map(([k, v]) => (v === true ? k : v === false ? `not ${k}` : `${k} ${v}`)).join(", ")}`)
    .join("; ");
  const beats = Object.entries(st.beats).map(([npc, b]) => `${npc} on ${b}`);
  const max = (id) => s.party.find((p) => p.id === id)?.abilities?.hp ?? 4;
  const lines = [
    `Tick ${st.tick}.${beats.length ? ` ${beats.join(", ")}.` : ""}${st.off_routine?.length ? ` Off their routine: ${st.off_routine.join(", ")}.` : ""}`,
    `Where: ${pairs(st.positions)}.`,
    Object.keys(st.held).length ? `Held: ${pairs(st.held, (k, v) => `${k} by ${v}`)}.` : null,
    flags ? `Flags: ${flags}.` : null,
    `HP: ${pairs(st.hp, (k, v) => `${k} ${v}/${max(k)}`)}.${st.hurt && Object.keys(st.hurt).length ? ` Hurt: ${pairs(st.hurt)}.` : ""}`,
    st.dispositions ? `Moods: ${pairs(st.dispositions)}.` : null,
    st.revealed?.length ? `The party has found: ${st.revealed.join(", ")}.` : null,
    st.facts?.length ? `Facts:\n${st.facts.map((f) => `- ${f.id}: ${f.text}`).join("\n")}` : "Facts: none yet.",
    history ? `Lately, oldest first:\n${st.log.slice(-LOG).map(logLine).join("\n")}` : null,
    history && st.canon.length ? `Said so far (texture):\n${st.canon.map((c) => `- ${c.text}`).join("\n")}` : null,
    st.ended ? `The encounter has ended: ${st.ended}.` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

// One log entry as a line: "t9 step 2 partly: The ring scraped and dropped."
function logLine(l) {
  const { tick, ...rest } = l;
  if (rest.step !== undefined) {
    const [k, v] = Object.entries(rest).find(([key]) => key !== "step");
    return `- t${tick} step ${rest.step} ${k === "did" ? "" : k === "partly" ? "partly: " : "didn't: "}${v}`;
  }
  return `- t${tick} ${Object.entries(rest).map(([k, v]) => `${k} ${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ")}`;
}

// What's coming as one line per routine and event: the routine's beats are in the encounter text.
export function aheadText(s, { ticks = 12, party = false } = {}) {
  const t = timelineFor(s, { ticks, party });
  const people = Object.keys(t[0]?.beats ?? {});
  const routine = people.map((id) => `${id}: ${t.map((x) => `${x.tick} ${x.beats[id].split(":")[0]}`).join(", ")}`);
  const events = t.filter((x) => x.events).map((x) => `${x.events.join(", ")} at tick ${x.tick}`);
  const later = s.packet.clock.events.filter((e) => !s.fired.includes(e.id) && s.due[e.id] >= s.tick + ticks && (!party || e.known || s.known.revealed.includes(e.id))).map((e) => `${e.id} at tick ${s.due[e.id]}`);
  return [...routine, ...events, ...later].join("\n") || "Nothing on a schedule.";
}



// The encounter as the ruling DM reads it. The packet's triggers and meters don't run in ruled mode; they're
// notes on how people react, for the DM to apply. With `party`, routines the party doesn't know are left off.
// The encounter as a ruling DM reads it (D76): plain lines instead of the packet's JSON, about half the size.
// No size categories (openings in rough real dimensions, D57), no coordinates (D9), and no engine rules: the
// packet's prose `notes` say how people react, and the DM applies them. With `party`, routines and events the
// party doesn't know are left off. Hidden things are listed apart, marked, so the DM never contradicts them.
export function encounterText(packet, s, { intent = true, party = false, sheets = true, secrets = true } = {}) {
  const { map, people, clock } = packet;
  const knows = (id) => s.known.revealed.includes(id);
  const hidden = (x) => x.hidden && !knows(x.id);
  const name = (id) => [...map.zones, ...map.things, ...people, ...s.party].find((x) => x.id === id)?.name ?? id;
  const feet = (z) => {
    const [x0, y0] = [Math.min(...z.rects.map(([x]) => x)), Math.min(...z.rects.map(([, y]) => y))];
    const [x1, y1] = [Math.max(...z.rects.map(([x, , w]) => x + w)), Math.max(...z.rects.map(([, y, , h]) => y + h))];
    return `${(x1 - x0) * 5}×${(y1 - y0) * 5} ft`;
  };
  const open = (c) => GAP[c.kind] ?? (c.fits ? `about ${SPAN[c.fits]}` : "");
  const zone = (z) => `- ${z.id} (${z.name}; ${feet(z)}, ${z.light}${z.level ? `, level ${z.level}` : ""}): ${z.purpose}${z.sees?.length ? ` Sees into ${z.sees.join(", ")}.` : ""}`;
  const wayBits = (c) => [c.kind, open(c), c.fits_unlocked ? `${SPAN[c.fits_unlocked]} once unlocked` : "", c.flags?.locked ? "starts locked" : "", c.key ? `key: ${c.key}` : "", c.see_through ? "see-through" : "", c.operated_from && c.operated_from !== "both" ? `worked from ${c.operated_from}${c.reachable_from_other_side ? " or the other side" : ""}` : "", c.ticks ? `+${c.ticks} ticks` : ""].filter(Boolean).join(", ");
  const way = (c) => `- ${c.id}${c.name ? ` (${c.name})` : ""}: ${c.between.join(" – ")}; ${wayBits(c)}`;
  // Where things are now, from the ledger, so the encounter never contradicts it.
  const where = (t) => (s.holder[t.id] ? `held by ${s.holder[t.id]}` : s.at[t.id] ? `in ${s.at[t.id]}` : "gone");
  const thing = (t) => `- ${t.id} (${t.name}, ${where(t)}): ${t.properties}`;
  // Things alike (four cell doors, three buckets) share one line: the description once, then each one's place.
  const ways = (list) => [...Map.groupBy(list, wayBits).values()].map((g) => (g.length > 1 ? `- ${g.map((c) => `${c.id} (${c.between.join(" – ")})`).join("; ")}: ${wayBits(g[0])}` : way(g[0])));
  const things = (list) => [...Map.groupBy(list, (t) => `${t.name}|${t.properties}`).values()].map((g) => (g.length > 1 ? `- ${g.map((t) => `${t.id} (${where(t)})`).join("; ")}: ${g[0].name}. ${g[0].properties}` : thing(g[0])));
  const person = (p) => {
    const sch = p.schedule && (!party || p.schedule.known || knows(p.schedule.id)) ? p.schedule : null;
    const routine = sch ? `\n  Routine, one beat a tick: ${sch.beats.map((b) => `${b.id}: ${b.label}, in ${b.position}${b.cue ? ` (cue: ${b.cue})` : ""}`).join("; ")}.` : "";
    if (!sheets) return `- ${p.id} (${p.name})${routine}`;
    return `- ${p.id} (${p.name}${p.tier ? `, ${p.tier}` : ""}): wants ${p.wants} Fears ${p.fears} Knows ${p.knows} Will never ${p.will_never} Temper: ${p.temper} Under pressure: ${p.under_pressure}${routine}`;
  };
  const events = clock.events.filter((e) => !party || e.known || knows(e.id)).map((e) => `- ${e.id}: at tick ${s.due[e.id] ?? "when its condition holds"}${e.deadline ? " (the deadline)" : ""}`);
  const goal = (o) => o && `${o.label}${o.id ? ` (${o.id})` : ""}`;
  const secret = [...map.zones.filter(hidden).map(zone), ...map.connections.filter(hidden).map(way), ...map.things.filter(hidden).map(thing), ...map.facts.filter(hidden).map((f) => `- ${f.id}: ${f.text}`)];
  const parts = [
    intent && `Objective: ${goal(packet.intent.objective)}. Also ends: ${[...(packet.intent.alternates ?? []), packet.intent.fail_forward].filter(Boolean).map(goal).join("; ")}.${packet.intent.optional?.length ? ` Optional: ${packet.intent.optional.map(goal).join("; ")}.` : ""}\nWhat it's for: ${packet.intent.purpose}`,
    `Places:\n${map.zones.filter((z) => !hidden(z)).map(zone).join("\n")}`,
    `Ways between them:\n${ways(map.connections.filter((c) => !hidden(c))).join("\n")}`,
    `Things:\n${things(map.things.filter((t) => !hidden(t))).join("\n")}`,
    `Fixed facts:\n${map.facts.filter((f) => !hidden(f)).map((f) => `- ${f.text}`).join("\n")}`,
    `People:\n${people.map(person).join("\n")}`,
    sheets && packet.notes?.length ? `How they react:\n${packet.notes.map((n) => `- ${n}`).join("\n")}` : null,
    events.length ? `Coming:\n${events.join("\n")}` : null,
    secret.length && secrets ? `Hidden (true, but never mention or hint at them until the party finds them):\n${secret.join("\n")}` : null,
  ];
  return parts.filter(Boolean).join("\n\n");
}

// The opening goes only to the scene call, which answers questions about what was said in it.
function ruledEncounter(env, { intent = true, party = false, opening = false } = {}) {
  return [block("The encounter", encounterText(env.packet, env.state, { intent, party })), opening ? block("Opening description", env.packet.opening) : null];
}

export function adjudicateInput(env, c, schema) {
  return compose([
    ...campaign(env, "adjudicate", schema),
    block("Characters", sheets(env)),
    block("The encounter", encounterText(env.packet, env.state, { party: true })),
    block("The ledger now", c.now),
    block("What the party expects next (the routines and events it knows)", c.timeline),
    c.stances?.length ? block("Stances the player has decided", c.stances) : null,
    c.recent?.length ? block("Recent exchanges", c.recent) : null,
    block("The plan, in the player's words", c.plan),
    "Rule on this plan and make its card.",
  ]);
}

export function resolveInput(env, c, schema) {
  return compose([
    ...campaign(env, "resolve", schema),
    block("Characters", sheets(env)),
    ...ruledEncounter(env),
    block("The ledger now", c.now),
    block("What is really happening, tick by tick", c.timeline),
    block("The plan, in the player's words", c.plan),
    block("The card", c.card),
    block("The dice", c.dice),
    c.stances?.length ? block("Stances the player decided", c.stances) : null,
    "Play the card out and record what happened.",
  ]);
}

export function sceneInput(env, c, schema) {
  return compose([
    ...campaign(env, "scene", schema),
    block("Characters", sheets(env)),
    ...ruledEncounter(env, { intent: false, opening: true }),
    block("The ledger now", c.now),
    block("What is really happening, tick by tick", c.timeline),
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    c.recent?.length ? block("Recent exchanges", c.recent) : null,
    block(c.to === "dm" ? "The player asks the DM" : `The player is talking to ${c.to}`, c.conversation),
    "Answer the player.",
  ]);
}
