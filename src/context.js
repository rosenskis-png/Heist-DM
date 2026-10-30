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
    canon: s.canon,
    log: logFor(s, party),
  };
  if (!party) Object.assign(out, { pending_ticks: s.pending, meters: s.meters, dispositions: s.disposition, revealed: s.known.revealed, promises: s.promises });
  if (s.combat) out.fight = { round: s.combat.round, enemies: s.combat.enemies.map((e) => ({ id: e, hp: s.combat.hp[e], out: s.combat.out.includes(e) })) };
  if (s.ended) out.ended = s.ended.outcome;
  return out;
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

const sheets = (env) => env.party.map(playSheet);

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

export function companionInput(env, c, self, others, huddle, schema) {
  const rel = env.rel?.[self.id] ?? { heat: 0, intimacy: 0, regard: 0, lean: 0, payoff: false, config: "open" };
  const { opening, people, clock } = env.packet;
  const pair = env.pairFor(self.id, others.map((o) => o.id));
  const privately = c.channel === "private";
  return compose([
    ...campaign(env, "companion", schema),
    block("You are", ownProfile(self, rel, env.act)),
    block("At the table with you", [{ id: "player", name: env.party[0].name, role: env.party[0].role ?? "The player" }, ...others.map(publicProfile)]),
    block("What the party knows", { map: partyMap(env.packet), people: learnedPeople(people), clock: knownClock(clock) }),
    block("Opening description", opening),
    c.now ? block("What the party can see right now", c.now) : null,
    c.recent?.length ? block("What has happened, as the DM told it", c.recent) : null,
    block("Your relationship with the player", rel),
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
