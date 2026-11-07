// Context assembly: what each call sees (docs/spec/context.md §1–3). Pure functions; the caller does the
// fetching and the calling. Used by the game and the bench page.
import { beatOf } from "./engine/clock.js";
import { toughnessOf } from "./engine/ledger.js";
import { partyPerceives } from "./engine/perceive.js";
import { usesText } from "./engine/ledger.js";
import { worldOf } from "./campaign/world.js";
import { pairs } from "../content/pairs.js";
import * as Relationship from "../content/relationship.js";
import * as Rel from "./campaign/relationship.js";
import { resolveParty, pairEntry } from "./campaign/roster.js";
import { wearing, wardrobeFor } from "./campaign/wardrobe.js";

// Act-tagged worked examples: kept only from their act on (docs/spec/context.md §3).
export function promptFor(text, act) {
  return text.replace(/<!-- example act:(\d+) -->([\s\S]*?)<!-- \/example -->/g, (_, from, body) =>
    act >= Number(from) ? body.trim() : "",
  );
}

// Invariants in play this act: a gated one is absent before its act, not forbidden (docs/spec/context.md §3).
export const invariantsFor = (act, list = worldOf().invariants ?? []) => list.filter((i) => act >= (i.fromAct ?? 1)).map((i) => i.text);

// Abilities as the AIs read them: the effect text, never the engine's `declared` block (D30, D59). With live state
// `s` and whose they are, each limited one says what's left (D128).
const abilitiesFor = ({ combat, noncombat, ...rest }, s, who) => {
  const strip = (a) => {
    if (!a) return a;
    const { declared, ...x } = a;
    const left = s && who ? usesText(s, who, a.id) : null;
    return left ? { ...x, left } : x;
  };
  return { ...rest, combat: strip(combat), noncombat: strip(noncombat) };
};

// The rules-facing part of a sheet: who they are and what they can do, with what's left of it.
const playSheet = (p, s) => ({ id: p.id, name: p.name, role: p.role, skills: p.skills, abilities: abilitiesFor(p.abilities, s, p.id) });

// Where a companion stands with the player, as encounters see it (D79): a mood from a short fixed list, why, and
// what she has learned, all written at camp. Never her secrets, history or romance arc: those stay at the campfire.
export const standingOf = (env, id) => env.standing?.[id] ?? { mood: "steady", learned: [] };

// A companion in an encounter (D79): how she talks, thinks and acts, what she can do, and her standing. The rest
// of her profile (look, fantasy, backstory, secrets) is for the campfire.
export function briefProfile(c, standing, s) {
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
    abilities: abilitiesFor(c.abilities, s, c.id),
    mood: why ? `${mood}: ${why}` : mood,
    ...(learned?.length ? { learned } : {}),
  };
}

// A companion's profile is an allowlist (D59): fields not named here, including UI and engine data and any
// declared data not resolved below, never reach a prompt.
const PROFILE_FIELDS = ["id", "name", "race", "age", "role", "blurb", "fantasy", "heatMode", "look", "outfit", "pursuit",
  "heatActs", "turnoffs", "flattery", "voice", "rules", "skills", "beliefs", "admires", "despises", "askAbout", "other",
  "suppressed", "darkTriggers", "inOthers", "recalibrates", "boundaries", "honesty", "means", "whenRefused"];
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
  // Her own gate for a field replaces the default (D100).
  for (const [k, gate] of Object.entries(Relationship.reveal)) if (Rel.holds(v, c.reveal?.[k] ?? gate)) out[k] = GATED[k](c);
  const notes = (c.notes ?? []).filter((n) => Rel.holds(v, n.when)).map((n) => n.text);
  if (notes.length) out.notes = notes;
  const sv = Rel.secondVoiceState(rom, c, scene);
  if (sv) {
    const { name, voice, look, relayed, admires, despises } = c.secondVoice;
    const tastes = { ...(admires ? { admires } : {}), ...(despises ? { despises } : {}) };
    out.second_voice = sv.speaks ? { name, voice, ...tastes, speaks_here: true, ...(sv.inCompany ? { in_company: true } : {}), ...(sv.canAppear ? { may_take_her_own_body: look } : {}) } : { name, relayed, ...tastes };
  }
  // Her shape (D101): what she can do, and how she looks now if she's changed it.
  const r = rom.rel[c.id];
  if (c.shapeshift) {
    out.shapeshift = c.shapeshift.text;
    if (r.form) out.look = r.form;
  }
  // A declared escalation: where she is on it now, and every tier (D97).
  if (c.escalation) {
    const e = c.escalation;
    const lvl = rom.rel[c.id].storm;
    out.escalation = { name: e.name, level: lvl, now: lvl ? e.tiers[lvl - 1] : "calm", tiers: e.tiers.map((x, i) => `${i + 1}: ${x}`), what_starts_or_raises_it: e.rises, what_calms_it: e.calms, ...(e.actsOnOther ? { from_level_she_may_act_on_the_other_companion: e.actsOnOther } : {}) };
  }
  const partner = members.find((m) => m.id !== c.id);
  if (partner?.shapeshift && r.knowsShifter) out.you_know = `${partner.name} can change her shape.`;
  // What she privately means to do, carried from scene to scene (D107). Only her own calls see it.
  if (r.agenda) out.your_private_agenda = r.agenda;
  if (r.absent?.length) out.not_you = `If he brings up being alone with you at camp on turn ${r.absent.join(", ")}, you weren't there and don't remember it. Don't play along.`;
  if (c.tie && partner) {
    out.tie = { with: partner.name, bond: c.tie.bond, gift: c.tie.gift, ...(c.tie.secret ? { your_secret: c.tie.secret } : {}) };
    if (c.tie.mirrorsWhenOpen && rom.open) out.tie.now_in_the_open = { [`${partner.name}'s pursuit, which you now take up`]: partner.pursuit, how: c.tie.mirrorsWhenOpen };
  }
  if (partner?.tie?.withId === c.id) {
    const t = partner.tie;
    out.tie_to_you = { who: partner.name, note: t.toPartner, bond: t.bond, if_you_learn: t.partnerReacts };
  }
  out.react = c.react[Rel.config(rom, c, members)] ?? null;
  return out;
}

// A number as words, from its bands in content/relationship.js `stances` (D94).
export function stance(bands, v) {
  let out = bands[0][1];
  for (const [at, text] of bands) if (v >= at) out = text;
  return out;
}

// How she feels about the other companion, and how she thinks the other feels about her, as words (D92, D94).
export function pairStance(r) {
  const S = Relationship.stances;
  const say = (side, v) => Relationship.axes.map((k) => `${stance(S[k][side], Math.round(v[k]))} (${k} ${Math.round(v[k])})`).join("; ");
  return { you_feel_about_her: say("own", r.toward), you_think_she_feels_about_you: say("read", r.read) };
}

// What she believes about him and the other companion (D96).
const beliefText = (b, other) =>
  b.current ? `You believe he and ${other} are involved now.` : b.past ? `You believe he and ${other} were involved once, but not now.` : `As far as you know, nothing has happened between him and ${other}.`;

// Her relationship with the player and the other companion, as her call reads it. Lean is shown whole.
function relationshipFor(c, rom, members) {
  const r = rom.rel[c.id];
  const cfg = Rel.config(rom, c, members);
  const S = Relationship.stances;
  const o = members.find((m) => m.id !== c.id);
  return {
    stage: Rel.stage(r, c),
    // What the numbers mean for how she treats him (D94).
    how_she_feels_about_him: ["heat", "intimacy", "regard"].map((k) => `${stance(S[k], r[k])} (${k} ${Math.round(r[k])})`),
    payoff_at: c.payoff.at,
    lean: Math.round(r.lean),
    happened: ["payoff", "vuln", "deep", "bond", "manifest"].filter((k) => r[k]),
    involved_now: !!r.involved,
    hurt: r.hurt,
    configuration: Relationship.configText[cfg],
    ...(o ? { about_him_and_the_other: beliefText(r.believes, o.name), ...pairStance(r) } : {}),
    ...(r.memories.length ? { memories: r.memories } : {}),
    ...(r.commitments.length ? { commitments: r.commitments } : {}),
  };
}

// The party's relationship state, or a fresh one when there isn't one yet (the bench).
const romanceOf = (env, members) => env.romance ?? Rel.newRomance(members, env.pairs ?? pairs, { act: env.act });

// What the other companion sees of her, including how she looks right now (a shapeshifter's current form, D101).
const publicProfile = (c, rom) => ({ id: c.id, name: c.name, role: c.role, blurb: c.blurb, voice: c.voice, ...(rom ? { looks: rom.rel[c.id]?.form ?? c.look, wearing: wearing(rom, c) } : {}), abilities: abilitiesFor(c.abilities) });

// Compact JSON: indentation would cost about a third more input on every call.
const block = (title, body) => `## ${title}\n\n${typeof body === "string" ? body : "```json\n" + JSON.stringify(body) + "\n```"}`;

// ---- Live state, as the AIs read it ----

const entries = (o, keep) => Object.fromEntries(Object.entries(o).filter(([k]) => keep(k)));

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
    invariantsFor(env.act, env.world?.invariants).length ? block("World facts that never change", invariantsFor(env.act, env.world?.invariants)) : null,
  ];
}

// What the party has to spend and the relics it holds (D147), for the DM's calls: each relic is a fact.
function kit(env) {
  const { gold = 0, relics = [] } = env.state ?? {};
  if (!gold && !relics.length) return null;
  return block("The party's gold and relics", { gold, relics: relics.map((r) => `${r.name}: ${r.text}`) });
}

// The party as the DM's calls see it; companions add their voice and mood, so the DM can voice them (D79).
const sheets = (env) => env.party.map((p, i) => (i === 0 ? playSheet(p, env.state) : { ...playSheet(p, env.state), voice: p.voice, mood: standingOf(env, p.id).mood }));

// A companion in the huddle or a private channel, in an encounter: her brief, not her full profile (D79), with the
// special cases she acts on (D114), from the party as resolved for ties (D8), and any form an ability put her in. The encounter and
// what the party can see come as plain lines (D76); the opening reaches her through the DM's narration.
export function companionInput(env, c, self, others, huddle, schema) {
  const [me, ...rest] = resolveParty([self, ...others], env.world);
  const pair = rest.length ? pairEntry(env.pairs ?? pairs, me.id, rest[0].id) : null;
  const privately = c.channel === "private";
  const rom = romanceOf(env, [me, ...rest]);
  // A form an ability put her in (e.g. an animal), from the encounter's flags.
  const form = env.state?.flags?.[me.id]?.form;
  return compose([
    ...campaign(env, "companion", schema),
    block("You are", { ...briefProfile(me, standingOf(env, me.id), env.state), ...encounterCases(me, rom, [me, ...rest], { private: privately, inPerson: false }) }),
    form ? block("You, right now", { form }) : null,
    block("At the table with you", [{ id: "player", name: env.party[0].name, role: env.party[0].role ?? "The player" }, ...rest.map((o) => publicProfile(o))]),
    block("What the party knows", encounterText(env.packet, env.state, { party: true, intent: false, sheets: false, secrets: false })),
    c.now ? block("What the party can see right now", c.now) : null,
    c.recent?.length ? block("What has happened, as the DM told it", c.recent) : null,
    pair ? block("You and the other companion", { dynamic: pair.dynamic }) : null,
    block(privately ? "Just you and the player, through your ring (the other companion can't hear this)" : "The huddle so far", huddle),
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    c.card ? block("The plan as the card shows it", c.card) : null,
    privately ? `The player is talking to you alone. It's your turn, as ${me.name}.` : `It's your turn in the huddle, as ${me.name}.`,
  ]);
}

// Both companions in the huddle, in one call (docs/spec/calls/party.md): each one's brief and special cases as
// companionInput gives them, and the table as both of them see it.
export function partyInput(env, c, companions, huddle, schema) {
  const members = resolveParty(companions, env.world);
  const [a, b] = members;
  const pair = b ? pairEntry(env.pairs ?? pairs, a.id, b.id) : null;
  const rom = romanceOf(env, members);
  const entry = (me) => {
    const form = env.state?.flags?.[me.id]?.form;
    const order = [me, ...members.filter((o) => o !== me)];
    return {
      ...briefProfile(me, standingOf(env, me.id), env.state),
      ...encounterCases(me, rom, order, { private: false, inPerson: false }),
      ...(form ? { right_now: { form } } : {}),
    };
  };
  return compose([
    ...campaign(env, "party", schema),
    block("The companions you play", members.map(entry)),
    block("At the table with them", [{ id: "player", name: env.party[0].name, role: env.party[0].role ?? "The player" }]),
    block("What the party knows", encounterText(env.packet, env.state, { party: true, intent: false, sheets: false, secrets: false })),
    c.now ? block("What the party can see right now", c.now) : null,
    c.recent?.length ? block("What has happened, as the DM told it", c.recent) : null,
    pair ? block("The two of them", { dynamic: pair.dynamic }) : null,
    block("The table so far", huddle),
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    c.card ? block("The plan as the card shows it", c.card) : null,
    c.asked?.length ? `The player's last line is to ${c.asked.join(" and ")} by name.` : null,
    `It's the companions' turn, over the rings: ${members.map((m) => m.name).join(" and ")}.`,
  ]);
}

// Her declared special cases that shape how she acts in an encounter (D114): what she has on, her second voice,
// her shape, and her tie without its secret. Gated fields, notes and her private agenda stay at camp (D79).
function encounterCases(c, rom, members, scene) {
  const own = ownProfile(c, rom, members, scene, { planning: false });
  const out = {};
  for (const k of ["outfit", "second_voice", "shapeshift", "you_know"]) if (own[k] !== undefined) out[k] = own[k];
  if (c.shapeshift && own.look !== c.look) out.look = own.look;
  if (own.tie) out.tie = { with: own.tie.with, bond: own.tie.bond, gift: own.tie.gift };
  if (own.tie_to_you) out.tie_to_you = { who: own.tie_to_you.who, note: own.tie_to_you.note, bond: own.tie_to_you.bond };
  return out;
}

// The campfire (docs/spec/calls/campfire.md, D45). `c.with` lists the companions in the scene: her alone (one on
// one), or both. In a scene with both, each exchange is two calls in `speakingOrder` (D85): she gets the other's
// public profile and what the other has said and done in this scene, which is in `c.scene`, never the other's
// secrets or private history; answering second after a turn that moved nothing, `c.mustAdvance` says so. The beats
// she may report are listed, with any declared beat's own text, and the outfits she could change into.
export function campfireInput(env, c, self, others, schema) {
  const [me, ...rest] = resolveParty([self, ...others], env.world);
  const members = [me, ...rest];
  const rom = romanceOf(env, members);
  const alone = !c.with.some((id) => id !== me.id);
  const scene = { private: alone, inPerson: true };
  // She may be wearing the other companion's face, alone with him (D101).
  const as = c.disguisedAs ? rest.find((o) => o.id === c.disguisedAs) : null;
  const beats = Rel.allowedBeats(rom, me, members, scene);
  const extra = (me.extraBeats ?? []).map((b) => (beats.includes(b.id) ? b.text : b.cooling)).filter(Boolean);
  const pair = rest.length ? pairEntry(env.pairs ?? pairs, me.id, rest[0].id) : null;
  return compose([
    ...campaign(env, "campfire", schema),
    block("You are", ownProfile(me, rom, members, scene, { planning: false })),
    alone
      ? block("The scene", as
        ? `Camp, between encounters. The player is alone with you, but you've come wearing ${as.name}'s face, and he believes you are her. ${as.name} is elsewhere in camp.`
        : `Camp, between encounters. The player is alone with you. ${rest.map((o) => o.name).join(" and ")} is elsewhere in camp.`)
      : block("The scene", { where: "Camp, between encounters, the player with both of you.", with_you: rest.map((o) => publicProfile(o, rom)) }),
    as
      ? block(`You are wearing ${as.name}'s face`, {
          how: `Look, sound and act like her, well enough to pass, for your own reasons: to be close to him in her place, or to make her look bad. Your narration and lines appear to him as hers. You know only her public face and what you've seen; you don't know her private history with him, so steer around it. Your memories and feelings are your own.`,
          her: { ...publicProfile(as, rom), look: rom.rel[as.id]?.form ?? as.look },
        })
      : null,
    block("Your relationship with the player", relationshipFor(me, rom, members)),
    alone ? null : block("You and the other companion", { ...(pair ? { dynamic: pair.dynamic } : {}), ...(rom.open ? { in_the_open: "Where everyone stands with him is out in the open." } : {}) }),
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

const CANON = 10;
const LOG = 16;

// The event log, one entry per line. The party's view leaves out events the party doesn't know about.
function logFor(s, party) {
  const knownEvent = (id) => s.packet.clock.events.find((e) => e.id === id && (e.known || s.known.revealed.includes(id)));
  return s.log.filter((l) => !party || !l.event || knownEvent(l.event)).slice(-40);
}

// Where everyone and everything is, flags, moods, the DM's facts, canon and the event log, for `ledgerText`. With
// `party`, only what the party perceives or knows (the companions' view, D40).
function stateFor(s, { party = false } = {}) {
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
    // The party's hurts and hindrances, and what anyone fighting the party is about to do (D130): both are things
    // the party knows.
    conditions: s.conditions,
    threats: s.threats,
    // Texture keeps its truth in state; calls get the latest (D76). Rulings that matter later are facts.
    canon: s.canon.slice(-CANON),
    log: logFor(s, party),
  };
  // The DM's facts (the party's view keeps the ones it knows), who's off their routine, and the telling blows each
  // person still standing can take (D75, D130).
  out.facts = (party ? s.facts.filter((f) => f.known) : s.facts).map(({ id, text, about }) => ({ id, text, ...(about.length ? { about } : {}) }));
  if (!party) Object.assign(out, { pending_ticks: s.pending, dispositions: s.disposition, revealed: s.known.revealed, off_routine: s.offRoutine, toughness: Object.fromEntries(s.packet.people.filter((p) => s.at[p.id] != null && !s.flags[p.id]?.down).map((p) => [p.id, `${s.toughness[p.id]}/${toughnessOf(p)}`])) });
  if (s.ended) out.ended = s.ended.outcome;
  return out;
}

// What's coming, tick by tick: each routine's beat for the people still following it, and the events due.
// The party's version has only the routines and events it knows.
function timelineFor(s, { ticks = 12, party = false } = {}) {
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

// The ledger as plain lines (D76): where everyone and everything is, doors and flags, hurt, moods, the facts, and
// the latest of the log and texture. With `party`, only what the party can see or knows (the companions' view);
// `history: false` leaves out the log and texture, for a call that gets the DM's narration instead.
export function ledgerText(s, { party = false, history = true, log = history } = {}) {
  const st = stateFor(s, { party });
  const pairs = (o, f = (k, v) => `${k} ${v}`) => Object.entries(o).map(([k, v]) => f(k, v)).join("; ");
  const flags = Object.entries(st.flags)
    .map(([id, f]) => `${id} ${Object.entries(f).map(([k, v]) => (v === true ? k : v === false ? `not ${k}` : `${k} ${v}`)).join(", ")}`)
    .join("; ");
  const beats = Object.entries(st.beats).map(([npc, b]) => `${npc} on ${b}`);
  const lines = [
    `Tick ${st.tick}.${beats.length ? ` ${beats.join(", ")}.` : ""}${st.off_routine?.length ? ` Off their routine: ${st.off_routine.join(", ")}.` : ""}`,
    `Where: ${pairs(st.positions)}.`,
    Object.keys(st.held).length ? `Held: ${pairs(st.held, (k, v) => `${k} by ${v}`)}.` : null,
    flags ? `Flags: ${flags}.` : null,
    st.conditions.length ? `The party's conditions:\n${st.conditions.map((c) => `- ${c.id} (${c.who}): ${c.text}`).join("\n")}` : null,
    st.toughness && Object.keys(st.toughness).length ? `Telling blows each can still take: ${pairs(st.toughness)}.` : null,
    st.threats.length ? `About to happen, as the party sees it:\n${st.threats.map((x) => `- ${x.who}: ${x.does}`).join("\n")}` : null,
    st.dispositions ? `Moods: ${pairs(st.dispositions)}.` : null,
    st.revealed?.length ? `The party has found: ${st.revealed.join(", ")}.` : null,
    st.facts?.length ? `Facts:\n${st.facts.map((f) => `- ${f.id}: ${f.text}`).join("\n")}` : "Facts: none yet.",
    log ? `Lately, oldest first:\n${st.log.slice(-LOG).map(logLine).join("\n")}` : null,
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

// Openings in rough real dimensions, for the DM's encounter text.
const SPAN = { tiny: "three inches across", small: "a foot across", medium: "a person's width", large: "a wide doorway" };
const GAP = {
  bars: "iron bars about five inches apart",
  grate: "an iron grate with gaps about three inches across",
  drain: "a drain opening about three inches across",
};

// The encounter as the DM reads it (D76): plain lines instead of the packet's JSON, about half the size. No
// size categories (openings in rough real dimensions), no coordinates (D9), and no engine rules: the
// packet's prose `notes` say how people react, and the DM applies them. With `party`, routines and events the
// party doesn't know are left off. Hidden things are listed apart, marked, so the DM never contradicts them.
export function encounterText(packet, s, { intent = true, party = false, sheets = true, secrets = true } = {}) {
  const { map, people, clock } = packet;
  const knows = (id) => s.known.revealed.includes(id);
  const hidden = (x) => x.hidden && !knows(x.id);
  const name = (id) => [...map.zones, ...map.things, ...people, ...s.party].find((x) => x.id === id)?.name ?? id;
  const feet = (z) => {
    // A packet without a map (D9, D153) has no footprints to measure.
    if (!z.rects?.length) return "size not mapped";
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
    return `- ${p.id} (${p.name}${p.tier ? `, ${p.tier}` : ""}): wants ${p.wants} Fears ${p.fears} Knows ${p.knows} Will never ${p.will_never} Temper: ${p.temper} Under pressure: ${p.under_pressure}${p.breaks ? ` Stops fighting: ${p.breaks}` : ""}${routine}`;
  };
  const events = clock.events.filter((e) => !party || e.known || knows(e.id)).map((e) => `- ${e.id}: at tick ${s.due[e.id] ?? "when its condition holds"}`);
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
function dmEncounter(env, { intent = true, party = false, opening = false } = {}) {
  return [block("The encounter", encounterText(env.packet, env.state, { intent, party })), opening ? block("Opening description", env.packet.opening) : null];
}

// A question to the DM (D127, D133): the read-only slice. The places, ways, things and fixed facts, with hidden things
// so the answer never contradicts them; who's there and the routines the party knows, without their sheets or how
// they react; the party's abilities and what's left of them; the opening; the ledger; and the DM's recent answers.
// Nothing about what's coming or the companions' voices: a question changes nothing in the world.
export function questionInput(env, c, schema) {
  const party = env.party.map((p) => ({ id: p.id, name: p.name, role: p.role, abilities: abilitiesFor(p.abilities, env.state, p.id) }));
  return compose([
    ...campaign(env, "question", schema),
    block("The party", party),
    kit(env),
    block("The encounter", encounterText(env.packet, env.state, { intent: false, party: true, sheets: false })),
    block("Opening description", env.packet.opening),
    block("The ledger now", c.now),
    c.recent?.length ? block("What the DM has told the party lately", c.recent) : null,
    block("The player asks", c.question),
    "Answer the question.",
  ]);
}

export function adjudicateInput(env, c, schema) {
  return compose([
    ...campaign(env, "adjudicate", schema),
    block("Characters", sheets(env)),
    kit(env),
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
    kit(env),
    ...dmEncounter(env),
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
    kit(env),
    ...dmEncounter(env, { intent: false, opening: true }),
    block("The ledger now", c.now),
    block("What is really happening, tick by tick", c.timeline),
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    c.recent?.length ? block("Recent exchanges", c.recent) : null,
    block(c.to === "do" ? "The player does something" : `The player is talking to ${c.to}`, c.conversation),
    "Answer the player.",
  ]);
}

// The verdict when a room ends (docs/spec/calls/verdict.md, D146): the record of what happened, not the narration.
// The room as designed (its purpose, what could be had, its exits), the party, the ledger and the log as they stand,
// how it ended (the hand-off), and each companion's values: what she believes, admires and despises, wants and can't stand,
// so her reactions are by her own values.
export function verdictInput(env, c, schema) {
  const members = resolveParty(env.party.slice(1), env.world);
  const values = (m) => {
    const { mood } = briefProfile(m, standingOf(env, m.id), env.state);
    return { id: m.id, name: m.name, beliefs: m.beliefs, rules: m.rules, pursuit: m.pursuit, mood, admires: m.admires, despises: m.despises, heatActs: m.heatActs, turnoffs: m.turnoffs };
  };
  const h = c.handoff;
  const ending = {
    ended: h.outcome, kind: h.ending, optional_met: h.optional?.met ?? [], optional_missed: h.optional?.missed ?? [],
    left_by: h.way_on ?? "no exit reached", carried: h.gear, hurt: h.conditions.map((x) => `${x.who}: ${x.text}`),
  };
  const exits = (env.packet.intent.exits ?? []).map((e) => `${e.id} (from ${e.zone}, to a ${e.leads_to}${e.stub ? `: ${e.stub}` : ""})`);
  return compose([
    ...campaign(env, "verdict", schema),
    block("The player", { id: env.party[0].id, name: env.party[0].name, role: env.party[0].role }),
    block("The companions", members.map(values)),
    ...dmEncounter(env),
    exits.length ? block("The room's ways on", exits) : null,
    block("The ledger and the log at the end", c.now),
    block("How it ended", ending),
    "Judge how the room went.",
  ]);
}

// A new world from the player's vibe (docs/spec/calls/pitch.md, D151): what every world shares, the companions'
// needs with what Gravenhold made of each, Gravenhold as the worked example, the vibe, and any pitches the player has
// already turned down. No invariants and no encounter: there's no world yet.
export function pitchInput(env, c, schema) {
  const example = worldOf();
  const needs = c.companions.flatMap((m) => (m.needs ?? []).map((k) => ({ companion: m.name, key: k, in_gravenhold: example.features[k] })));
  return compose([
    block("Your job", env.prompts.pitch),
    block("Output format", shapeText(schema)),
    block("The companions in this party", c.companions.map((m) => ({ name: m.name, role: m.role, blurb: m.blurb }))),
    needs.length ? block("Features their stories need", needs) : null,
    block("Worked example: Gravenhold", example),
    c.seed ? block("The question: this world's seed", { the_heart_is: c.seed.heart, the_player_secrets_are: c.seed.secrets }) : null,
    c.rejected?.length ? block("Pitches the player turned down (write something different)", c.rejected) : null,
    block("The player's vibe", c.vibe || "No vibe given: surprise them."),
    "Write the world and its pitch.",
  ]);
}


// ---------- generation (docs/spec/generation.md, D153) ----------

// What a climax is built from (D163): the act's goal, who stands at its centre (the boss of the faction whose place it
// is), and the act's rooms so far, which the climax pays off. Sent only to a climax.
function climaxText(c) {
  const act = c.world.acts[c.seed.act - 1];
  const f = c.seed.factions?.[0] && c.world.factions[c.seed.factions[0]];
  return {
    the_act: { name: act?.name, goal: act?.goal },
    who_stands_at_its_centre: f ? { who: f.boss, of: f.name, what_they_want: f.goal, how_they_behave: f.rules } : "the act's antagonist, from the world",
    the_heart: c.world.heart,
    what_the_act_built_up: c.earlier?.length ? c.earlier : "the act so far",
  };
}

// What the room's sketch is built from (D160): what the seed fixes, and its leanings, which the sketch uses or leaves.
const seedText = (seed, world) => ({
  fixed: {
    kind: seed.kind,
    tone: seed.tone,
    busy_with: seed.busy,
    ...(seed.shape ? { shape: seed.shape } : {}),
    ...(seed.centrepiece ? { centrepiece: seed.centrepiece } : {}),
    ...(seed.factions?.length ? { whose_place_it_is: seed.factions.map((f) => world.factions[f]?.name ?? f) } : {}),
    whose_room: seed.spotlight === "both" ? "both companions': the room touches each one's story"
      : seed.spotlight ? `${seed.spotlight}'s: the room touches her story and values; the other companion only reacts to it as herself`
      : "no one's: the room touches no companion's story; they react to it as themselves",
    ways_on: seed.exits.length ? seed.exits.map((k) => `a way on to ${k === "encounter" ? "an encounter" : `a ${k}`}`) : ["none: the act ends here"],
  },
  leanings: {
    ...(seed.core ? { built_around: seed.core } : {}),
    ...(seed.prize ? { prize: seed.prize } : {}),
    ...(seed.xFactor ? { x_factor: seed.xFactor } : {}),
    motifs: seed.motifs.map((m) => ({ name: m.name, pattern: m.pattern })),
  },
});

// The party as the designer needs it: what each can do, and what each companion values. Her story (the features it
// needs, and her quest once its act is near) only when the room is hers (D158).
function designParty(c) {
  const [player, ...companions] = c.party;
  const act = c.seed.act;
  const spot = c.seed.spotlight;
  return [
    { id: "player", role: player.role, abilities: abilitiesFor(player.abilities) },
    ...companions.map((m, i) => {
      const slot = `companion_${"ab"[i]}`;
      const hers = spot === "both" || spot === slot;
      return {
        slot, name: m.name, role: m.role, beliefs: m.beliefs, admires: m.admires, despises: m.despises,
        abilities: abilitiesFor(m.abilities),
        ...(hers && m.needs?.length ? { her_story_needs: m.needs.map((k) => c.world.features[k]) } : {}),
        ...(hers && m.quest && act >= (m.questAct ?? 99) - 1 ? { her_quest: m.quest } : {}),
      };
    }),
  ];
}

// The world as the sketch needs it: the place, its life, heart and tensions, this act, the factions in the room.
function designWorld(world, seed) {
  return {
    place: world.place, life: world.life, heart: world.heart, tensions: world.tensions,
    this_act: world.acts[seed.act - 1],
    factions: (seed.factions ?? []).map((f) => world.factions[f]),
    room_kinds: world.roomKinds,
  };
}

// The sketch call (D117, D119, D161): must honour the hand-off; the world and the act as background; the seed; the
// party; the premises of the act's earlier rooms (D162). No example rooms: they become anchors (D161). On the bench,
// the designer's brief (D154).
export function sketchInput(env, c, schema) {
  const h = c.handoff;
  return compose([
    block("Your job", env.prompts.sketch),
    block("Output format", shapeText(schema)),
    block("This room's seed: what it fixes, and leanings to use or leave", seedText(c.seed, c.world)),
    c.earlier?.length ? block("Rooms the party has already passed through this act: this one is somewhere different", c.earlier) : null,
    c.seed.kind === "climax" ? block("The climax", climaxText(c)) : null,
    block("The world", designWorld(c.world, c.seed)),
    c.brief ? block("The designer's brief: what this room should hold (fit it to the seed)", c.brief) : null,
    block("The party", designParty(c)),
    h ? block("Must honour: how the party arrives", { through: h.stub ?? "unknown", carrying: h.conditions?.map((x) => x.text) ?? [], the_last_rooms: c.log ?? [] }) : null,
    "Write the room's note.",
  ]);
}

// The encode call (D117): the sketch, what the seed fixes (kind, act, exits), the party's slots, and the worked example.
export function encodeInput(env, c, schema) {
  return compose([
    block("Your job", env.prompts.encode),
    block("Output format", shapeText(schema)),
    block("Fixed by the seed", { kind: c.seed.kind, mode: ROOM_KINDS.includes(c.seed.kind) ? "room" : "encounter", act: c.seed.act, exits: c.seed.exits }),
    block("The party's slots", ["player", "companion_a", "companion_b"]),
    block("Worked example: a finished packet", env.examples?.encoded),
    block("The sketch", c.sketch),
    "Encode the sketch as the packet.",
  ]);
}

// The kinds of room that are rooms rather than encounters (D121, D153).
export const ROOM_KINDS = ["quiet", "oddity", "merchant", "campfire", "sanctuary"];
