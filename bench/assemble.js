// Context assembly for the Phase 2 bench: what each call sees (docs/spec/context.md §1–2), built from
// hand-written cases. Pure functions; the page does the fetching and the calling.

// Strip coordinates (D9) and, for the party's view, everything hidden.
export function mapFor(map, { knownOnly = false } = {}) {
  const keep = (x) => !(knownOnly && x.hidden);
  return {
    zones: map.zones.filter(keep).map(({ rects, ...z }) => z),
    connections: map.connections.filter(keep).map(({ wall, square, ...c }) => c),
    things: map.things.filter(keep).map(({ location, ...t }) => {
      const { at, ...loc } = location ?? {};
      return { ...t, location: loc };
    }),
    facts: map.facts.filter(keep),
  };
}

// Act-tagged worked examples: kept only from their act on (docs/spec/context.md §3).
export function promptFor(text, act) {
  return text.replace(/<!-- example act:(\d+) -->([\s\S]*?)<!-- \/example -->/g, (_, from, body) =>
    act >= Number(from) ? body.trim() : "",
  );
}

// The rules-facing part of a sheet: who they are and what they can do.
const playSheet = (s) => ({ id: s.id, name: s.name, role: s.role, skills: s.skills, abilities: s.abilities });

// A companion's own profile, gated by relationship and act (docs/spec/companions.md §3) and by D50:
// she gets her hunch and the plan she reaches for, never her blind spots.
export function ownProfile(c, rel, act) {
  const { hidden, deep, dark, payoff, quest, questAct, planning, react, ...rest } = c;
  const out = { ...rest, planning: { reaches_for: planning.reaches_for, hunch: planning.hunch } };
  if (rel.intimacy >= 2 || rel.payoff) out.hidden = hidden;
  if (rel.payoff || rel.intimacy >= 5 || rel.lean >= 3) Object.assign(out, { deep, dark });
  if (!rel.payoff && rel.heat >= payoff.at - 2) out.payoff_scene = payoff.scene;
  if (act >= questAct - 1) out.quest = quest;
  out.react = react[rel.config] ?? null;
  return out;
}

const publicProfile = (c) => ({ id: c.id, name: c.name, role: c.role, blurb: c.blurb, voice: c.voice, abilities: c.abilities });

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
    block("Output format (JSON Schema)", pruned(schema)),
  ];
}

function encounterFull(env) {
  const { intent, people, clock, opening } = env.packet;
  return [block("The encounter", { intent, people, clock, map: mapFor(env.packet.map) }), block("Opening description", opening)];
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

export function worldInput(env, c, schema) {
  return compose([
    ...campaign(env, "world", schema),
    block("Characters", env.party.map((s) => ({ id: s.id, name: s.name, hp: s.abilities.hp }))),
    ...encounterFull(env),
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
    block("What happened (the engine's results)", c.results),
    block("How the world responded", c.world),
    block("State now", c.state),
    "Narrate this for the player.",
  ]);
}

export function companionInput(env, c, self, others, huddle, schema) {
  const rel = { heat: 0, intimacy: 0, regard: 0, lean: 0, payoff: false, config: "open" };
  const { opening, people, clock } = env.packet;
  const pair = env.pairFor(self.id, others.map((o) => o.id));
  return compose([
    ...campaign(env, "companion", schema),
    block("You are", ownProfile(self, rel, env.act)),
    block("At the table with you", [{ id: "player", name: "The player", class: env.party[0].name }, ...others.map(publicProfile)]),
    block("What the party knows", { map: mapFor(env.packet.map, { knownOnly: true }), people: learnedPeople(people), clock: knownClock(clock) }),
    block("Opening description", opening),
    block("Your relationship with the player", rel),
    pair ? block("You and the other companion", pair) : null,
    block("The huddle so far", huddle),
    c.draft ? block("The plan the player is drafting", c.draft) : null,
    `It's your turn in the huddle, as ${self.name}.`,
  ]);
}

export function graderInput(flaws, said) {
  return `You are checking a game's test output. Below are problems with a plan, and messages characters said about it.
For each message, list the ids of the problems it points out or fixes, even loosely or in passing. A message that only agrees with the plan catches nothing.

Problems:
${flaws.map((f) => `- ${f.id}: ${f.text}`).join("\n")}

Messages:
${said.map((m, i) => `[${i}] ${m ?? "(says nothing)"}`).join("\n")}

Return only JSON: {"caught": [[ids for message 0], [ids for message 1], ...]}, one list per message, in order.`;
}
