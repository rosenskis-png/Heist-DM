// Context assembly: what each call sees (docs/spec/context.md §1–3). Pure functions; the caller does the
// fetching and the calling. Used by the bench page and, from Phase 4, the game.
import { layoutFacts } from "./engine/map.js";
import { invariants } from "../content/setting.js";
import { pairs } from "../content/pairs.js";
import * as Relationship from "../content/relationship.js";
import * as Rel from "./campaign/relationship.js";
import { resolveParty, pairEntry } from "./campaign/roster.js";
import { wearing, wardrobeFor } from "./campaign/wardrobe.js";

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

// A companion's profile is an allowlist (D59): fields not named here, including UI and engine data and any
// declared data not resolved below, never reach a prompt.
const PROFILE_FIELDS = ["id", "name", "race", "age", "role", "blurb", "fantasy", "heatMode", "look", "outfit", "pursuit",
  "heatActs", "turnoffs", "flattery", "voice", "rules", "skills", "beliefs", "admires", "despises", "askAbout", "other",
  "suppressed", "darkTriggers"];
// Gated fields, by the gate's name in content/relationship.js `reveal`.
const GATED = { first: (c) => c.first, why: (c) => c.why, hidden: (c) => c.hidden, deep: (c) => c.deep, dark: (c) => c.dark,
  payoff_scene: (c) => c.payoff.scene, quest: (c) => c.quest };

// A companion's own profile, as resolved for this party (src/campaign/roster.js), gated by relationship and act
// (docs/spec/companions.md §3), with her declared special cases resolved for this scene (§6). `scene.private`:
// the player is alone with her; `scene.inPerson`: at camp rather than over the rings. In the huddle she gets her
// hunch and the plan she reaches for, never her blind spots (D50).
export function ownProfile(c, rom, members, scene = {}, { planning = true } = {}) {
  const out = Object.fromEntries(PROFILE_FIELDS.filter((k) => c[k] !== undefined).map((k) => [k, c[k]]));
  // What she has on now (docs/spec/companions.md §7).
  out.outfit = wearing(rom, c);
  out.abilities = abilitiesFor(c.abilities);
  if (planning) out.planning = { reaches_for: c.planning.reaches_for, hunch: c.planning.hunch };
  const v = Rel.view(rom, c);
  for (const [k, gate] of Object.entries(Relationship.reveal)) if (Rel.holds(v, gate)) out[k] = GATED[k](c);
  const notes = (c.notes ?? []).filter((n) => Rel.holds(v, n.when)).map((n) => n.text);
  if (notes.length) out.notes = notes;
  const sv = Rel.secondVoiceState(rom, c, scene);
  if (sv) {
    const { name, voice, look, relayed, admires, despises } = c.secondVoice;
    const tastes = { ...(admires ? { admires } : {}), ...(despises ? { despises } : {}) };
    out.second_voice = sv.speaks ? { name, voice, ...tastes, speaks_here: true, ...(sv.canAppear ? { may_take_her_own_body: look } : {}) } : { name, relayed, ...tastes };
  }
  const partner = members.find((m) => m.id !== c.id);
  if (c.tie && partner) out.tie = { with: partner.name, bond: c.tie.bond, gift: c.tie.gift };
  if (partner?.tie?.withId === c.id) {
    const t = partner.tie;
    out.tie_to_you = { who: partner.name, note: t.toPartner, bond: t.bond, if_you_learn: t.partnerReacts, you_know: rom.knows };
  }
  out.react = c.react[Rel.config(rom, c, members)] ?? null;
  return out;
}

// Her relationship with the player and the other companion, as her call reads it. Lean is shown whole.
function relationshipFor(c, rom, members) {
  const r = rom.rel[c.id];
  const cfg = Rel.config(rom, c, members);
  return {
    stage: Rel.stage(r, c),
    heat: r.heat,
    payoff_at: c.payoff.at,
    intimacy: r.intimacy,
    regard: r.regard,
    lean: Math.round(r.lean),
    happened: ["payoff", "vuln", "deep", "bond", "manifest"].filter((k) => r[k]),
    hurt: r.hurt,
    configuration: Relationship.configText[cfg],
    you_feel_about_the_other_companion: r.towardOther,
    you_think_she_feels_about_you: r.readOfOther,
    ...(r.memories.length ? { memories: r.memories } : {}),
    ...(r.commitments.length ? { commitments: r.commitments } : {}),
  };
}

// The party's relationship state, or a fresh one when there isn't one yet (the bench).
const romanceOf = (env, members) => env.romance ?? Rel.newRomance(members, env.pairs ?? pairs, { act: env.act });

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
    block("Right now", { tick: c.tick, beat: env.beatAt(c.tick), positions: env.packet.start.positions, canon: [] }),
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
    "Narrate this for the player.",
  ]);
}

// The huddle, or a private channel over the rings (`c.channel === "private"`). `self` and `others` are roster
// entries; the party is resolved here (ties, D8), and relationship state comes from `env.romance`.
export function companionInput(env, c, self, others, huddle, schema) {
  const [me, ...rest] = resolveParty([self, ...others]);
  const rom = romanceOf(env, [me, ...rest]);
  const scene = { private: c.channel === "private", inPerson: false };
  const { opening, people, clock } = env.packet;
  // A form an ability put her in (e.g. an animal), from the encounter's flags.
  const form = env.state?.flags?.[me.id]?.form;
  const pair = rest.length ? pairEntry(env.pairs ?? pairs, me.id, rest[0].id) : null;
  return compose([
    ...campaign(env, "companion", schema),
    block("You are", ownProfile(me, rom, [me, ...rest], scene)),
    block("At the table with you", [{ id: "player", name: "The player", class: env.party[0].name }, ...rest.map(publicProfile)]),
    block("What the party knows", { map: partyMap(env.packet), people: learnedPeople(people), clock: knownClock(clock) }),
    block("Opening description", opening),
    form ? block("You, right now", { form }) : null,
    block("Your relationship with the player", relationshipFor(me, rom, [me, ...rest])),
    pair ? block("You and the other companion", { dynamic: pair.dynamic }) : null,
    block(scene.private ? "Your private channel with the player so far" : "The huddle so far", huddle),
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    scene.private ? `The player is talking to you alone, over the rings, as ${me.name}.` : `It's your turn in the huddle, as ${me.name}.`,
  ]);
}

// The campfire (docs/spec/calls/campfire.md, D45). `c.with` lists the companions in the scene: her alone (one on
// one), or both. In a scene with both, each exchange is two calls in `speakingOrder` (D70): she gets the other's
// public profile and what the other has said and done in this scene, which is in `c.scene`, never the other's
// secrets or private history; answering second after a turn that moved nothing, `c.mustAdvance` says so. The beats
// she may report are listed, with any declared beat's own text, and the outfits she could change into.
export function campfireInput(env, c, self, others, schema) {
  const [me, ...rest] = resolveParty([self, ...others]);
  const members = [me, ...rest];
  const rom = romanceOf(env, members);
  const alone = !c.with.some((id) => id !== me.id);
  const scene = { private: alone, inPerson: true };
  const beats = Rel.allowedBeats(rom, me, members, scene);
  const extra = (me.extraBeats ?? []).map((b) => (beats.includes(b.id) ? b.text : b.cooling)).filter(Boolean);
  const pair = rest.length ? pairEntry(env.pairs ?? pairs, me.id, rest[0].id) : null;
  return compose([
    ...campaign(env, "campfire", schema),
    block("You are", ownProfile(me, rom, members, scene, { planning: false })),
    alone
      ? block("The scene", `Camp, between encounters. The player is alone with you. ${rest.map((o) => o.name).join(" and ")} is elsewhere in camp.`)
      : block("The scene", { where: "Camp, between encounters, the player with both of you.", with_you: rest.map(publicProfile) }),
    block("Your relationship with the player", relationshipFor(me, rom, members)),
    alone ? null : block("You and the other companion", { ...(pair ? { dynamic: pair.dynamic } : {}), you_feel_about_her: rom.rel[me.id].towardOther, you_think_she_feels_about_you: rom.rel[me.id].readOfOther }),
    block("Beats that may happen now, if the scene really gets there", { beats, ...(extra.length ? { notes: extra } : {}) }),
    wardrobeFor(rom, me) ? block("Your outfits", wardrobeFor(rom, me)) : null,
    block("The story so far", c.log ?? []),
    c.events ? block("The last encounter", c.events) : null,
    block("This scene so far", c.scene ?? []),
    c.mustAdvance ? `${rest.map((o) => o.name).join(" and ")} didn't move anything between anyone this time, so you do. Continue the scene as ${me.name}.` : `Continue the scene as ${me.name}.`,
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
export function rulingInput(env, { who, connection, by }) {
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
    block("Canon so far", []),
  ]
    .filter(Boolean)
    .join("\n\n");
}
