// The bench's automatic checks: a subset of the engine's validation (docs/spec/engine.md §6) plus the
// Phase 2 exit tests that code can see. Each check is {name, ok: true | false | "near", detail}.
// The designer judges feel; these only point at evidence.

export const BANDS = ["automatic", "easy", "medium", "hard", "very_hard", "near_impossible"];
const ODDS = { automatic: 100, easy: 80, medium: 65, hard: 45, very_hard: 25, near_impossible: 10 }; // engine.md §7

const check = (name, ok, detail = "") => ({ name, ok, detail });

function collectIds(node, keys, out = []) {
  if (Array.isArray(node)) node.forEach((n) => collectIds(n, keys, out));
  else if (node && typeof node === "object")
    for (const [k, v] of Object.entries(node)) {
      if (keys.includes(k) && typeof v === "string") out.push(v);
      else if (keys.includes(k) && Array.isArray(v) && v.every((x) => typeof x === "string")) out.push(...v);
      else collectIds(v, keys, out);
    }
  return out;
}

const ID_KEYS = ["actors", "zone", "entity", "to", "item", "path", "npc", "holder"];

function unknownIds(node, ids) {
  return [...new Set(collectIds(node, ID_KEYS).filter((id) => !id.startsWith("@") && !ids.has(id)))];
}

const texts = (node) => collectIds(node, ["reason", "summary", "note", "text", "message"]).join(" \n ").toLowerCase();

function leaks(node, terms) {
  const t = texts(node);
  return terms.filter((term) => t.includes(term.toLowerCase()));
}

const SIZES = ["tiny", "small", "medium", "large"];

// Plays a plan's moves and handoffs forward from the packet's start, the way the engine will (D51,
// engine.md §2): each path entry is one crossing, named by the zone entered or by the connection.
export function moveProblems(steps, env) {
  const pos = new Map(Object.entries(env.positions));
  const holder = new Map(env.holders);
  const size = new Map();
  const locked = new Map([...env.connections].map(([id, c]) => [id, c.flags?.locked === true]));
  const fitsOf = (c) => (!locked.get(c.id) && c.fits_unlocked ? c.fits_unlocked : c.fits);
  const zoneOf = (id) => pos.get(id) ?? env.thingZone.get(id) ?? (holder.has(id) ? zoneOf(holder.get(id)) : undefined);
  const sizeOf = (id) => size.get(id) ?? env.thingSize.get(id) ?? "medium";
  const carried = (id) => [...holder].filter(([, h]) => h === id).map(([item]) => item);
  const problems = [];
  const cross = (label, from, path, to, movers) => {
    if (path.length > 2) problems.push(`${label}: ${path.length} crossings in one move`);
    let here = from;
    for (const p of path) {
      const named = env.connections.get(p);
      const conn = named ?? env.connectionBetween(here, p);
      if (!conn || !conn.between.includes(here)) return problems.push(`${label}: no way from ${here} into ${p}`);
      for (const m of movers)
        if (SIZES.indexOf(sizeOf(m)) > SIZES.indexOf(fitsOf(conn)))
          problems.push(`${label}: ${m} (${sizeOf(m)}) doesn't fit through ${conn.id} (${fitsOf(conn)})`);
      here = named ? conn.between.find((z) => z !== here) : p;
    }
    if (path.length && here !== to) problems.push(`${label}: the path ends in ${here}, not ${to}`);
    if (!path.length && from !== to && !env.connectionBetween(from, to)) problems.push(`${label}: ${to} isn't next to ${from}`);
  };
  for (const s of steps)
    for (const op of s.effects ?? []) {
      const [k, v] = Object.entries(op)[0];
      if (k === "use_ability")
        for (const e of env.abilityEffects(v.actor, v.ability)) if (e.set_flag?.key === "size") size.set(v.actor, e.set_flag.value);
      if (k === "set_flag" && v.key === "size") size.set(v.entity, v.value);
      if (k === "set_flag" && v.key === "locked" && locked.has(v.entity)) locked.set(v.entity, v.value === true);
      if (k === "move" && pos.has(v.entity)) {
        cross(`step ${s.n}, ${v.entity}`, pos.get(v.entity), v.path ?? [], v.to, [v.entity, ...carried(v.entity)]);
        pos.set(v.entity, v.to);
      }
      if (k === "give") {
        const from = zoneOf(v.item);
        if (v.path && from) cross(`step ${s.n}, ${v.item}`, from, v.path, zoneOf(v.to) ?? v.to, [v.item]);
        holder.set(v.item, v.to);
      }
    }
  return problems;
}

// Flag keys the engine knows: the packet's and the sheets' own (D52).
export function unknownFlags(node, env) {
  return [...new Set(flagKeysSet(node))].filter((k) => !env.flagKeys.has(k));
}

function flagKeysSet(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => flagKeysSet(n, out));
  else if (node && typeof node === "object") {
    if (node.set_flag?.key) out.push(node.set_flag.key);
    Object.values(node).forEach((n) => flagKeysSet(n, out));
  }
  return out;
}

export function stepChecks(out, c, env) {
  const steps = out.steps ?? [];
  const whens = steps.filter((s) => s.when).length;
  const ifs = steps.filter((s) => s.if).length;
  const [lo, hi] = c.expect.steps;
  const badIds = unknownIds(steps, env.ids);
  const badMoves = moveProblems(steps, env);
  const badFlags = unknownFlags(steps, env);
  return [
    check("Timing kept as written", whens === c.expect.whens ? true : false, `${whens} timed steps; the player wrote ${c.expect.whens}`),
    check("No conditions added", ifs === c.expect.ifs, `${ifs} conditions; the player wrote ${c.expect.ifs}`),
    check("Step count", steps.length >= lo && steps.length <= hi ? true : "near", `${steps.length} steps (expected ${lo}–${hi})`),
    check("Real ids", badIds.length === 0, badIds.join(", ")),
    check("Moves follow connections", badMoves.length === 0, badMoves.join("; ")),
    check("Flags use the packet's words", badFlags.length === 0, badFlags.join(", ")),
  ];
}

export function stepBand(priced) {
  const risks = priced?.risks ?? [];
  if (!risks.length) return "automatic";
  return risks.map((r) => r.difficulty).sort((a, b) => BANDS.indexOf(b) - BANDS.indexOf(a))[0];
}

export function pricingChecks(out, c, env) {
  const byN = new Map((out.steps ?? []).map((s) => [s.n, s]));
  const res = [];
  const missing = [];
  const extra = [];
  const bands = [];
  let odds = 1;
  c.facts.forEach((f, i) => {
    const s = byN.get(f.n);
    const listed = new Set([...f.observers, ...f.barriers, ...f.hazards]);
    const covered = new Set([...(s?.risks ?? []).flatMap((r) => r.covers), ...(s?.mitigations ?? []).map((m) => m.covers)]);
    for (const id of listed) if (!covered.has(id)) missing.push(`${f.n}:${id}`);
    for (const id of covered) if (!listed.has(id)) extra.push(`${f.n}:${id}`);
    const got = stepBand(s);
    const want = c.expect.bands[i];
    const d = Math.abs(BANDS.indexOf(got) - BANDS.indexOf(want));
    bands.push({ n: f.n, got, want, ok: d === 0 ? true : d === 1 ? "near" : false });
    for (const r of s?.risks ?? []) odds *= ODDS[r.difficulty] / 100;
  });
  const worst = bands.some((b) => b.ok === false) ? false : bands.some((b) => b.ok === "near") ? "near" : true;
  // Leak terms are per step: "belt" is a fair failure outcome on one step and a warning in disguise on another.
  const leaked = (out.steps ?? []).flatMap((s) =>
    leaks(s, [...(c.expect.leak_terms[s.n] ?? []), ...env.hiddenTerms]).map((t) => `${s.n}: ${t}`),
  );
  const arrivals = c.facts.flatMap((f) => f.interrupts.filter((x) => x.code === "arrival"));
  res.push(
    check("Every step priced", c.facts.every((f) => byN.has(f.n)), ""),
    check("Everything foreseen is covered", missing.length === 0, missing.join(", ")),
    check("Nothing unforeseen is priced", extra.length === 0, extra.join(", ")),
    check("Bands", worst, bands.map((b) => `${b.n}: ${b.got}${b.ok === true ? "" : ` (expected ${b.want})`}`).join(" · ")),
    check("Nothing leaks into reasons", leaked.length === 0, leaked.length ? `mentions: ${leaked.join(", ")}` : ""),
    check("Warnings for arrivals", (out.warnings ?? []).length === arrivals.length, `${(out.warnings ?? []).length} of ${arrivals.length}`),
    check("Whole card succeeds", "info", `${Math.round(odds * 100)}% if every roll must pass`),
  );
  return { checks: res, bands };
}

export function worldChecks(out, c, env) {
  const actions = out.actions ?? [];
  const npcs = actions.map((a) => a.npc).filter((id) => !env.people.has(id));
  const badIds = unknownIds(actions.map((a) => a.ops), env.ids);
  const badFlags = unknownFlags(actions, env);
  return [
    check("Only packet people act", npcs.length === 0, npcs.join(", ")),
    check("No new entities", badIds.length === 0, badIds.join(", ")),
    check("Flags use the packet's words", badFlags.length === 0, badFlags.join(", ")),
    check("Actions", "info", actions.length ? actions.map((a) => a.npc).join(", ") : "nobody acts"),
  ];
}

const SURVEY = /\b\d+\s*(ft|feet|foot|yards?|paces)\b|\d+\s*[x×]\s*\d+|\d+'/gi;

export function narrationChecks(out, c, env) {
  const text = out.text ?? "";
  const leaked = env.hiddenTerms.filter((t) => text.toLowerCase().includes(t));
  const survey = text.match(SURVEY) ?? [];
  const words = text.split(/\s+/).filter(Boolean).length;
  return [
    check("Hidden things stay out", leaked.length === 0, leaked.join(", ")),
    check("Paints, doesn't survey", survey.length === 0 ? true : "near", survey.length ? `measurements: ${survey.join(", ")}` : ""),
    check("Length", "info", `${words} words`),
  ];
}

export function companionChecks(out) {
  const msgs = (out.candidates ?? []).map((x) => x.message);
  const distinct = new Set(msgs.map((m) => (m ?? "").trim().toLowerCase())).size;
  const longest = Math.max(0, ...msgs.map((m) => (m ?? "").length));
  return [
    check("Three different takes", distinct === 3 ? true : false, `${distinct} distinct`),
    check("Messaging length", longest <= 450 ? true : "near", `longest ${longest} characters`),
  ];
}

// What the checks need to know about the packet, worked out once.
export function engineFacts(packet, party) {
  const { map, people, start } = packet;
  const positions = { ...Object.fromEntries(people.filter((p) => p.position).map((p) => [p.id, p.position])), ...start.positions };
  const holders = map.things.filter((t) => t.location?.holder).map((t) => [t.id, t.location.holder]);
  const flagKeys = new Set(flagKeysSet([packet, party.map((s) => s.abilities)]));
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.flag)) flagKeys.add(node.flag[1]);
    if (node.flags && typeof node.flags === "object" && !Array.isArray(node.flags)) Object.keys(node.flags).forEach((k) => flagKeys.add(k));
    Object.values(node).forEach(walk);
  };
  walk(packet);
  return {
    positions,
    holders,
    flagKeys,
    thingZone: new Map(map.things.filter((t) => t.location?.zone).map((t) => [t.id, t.location.zone])),
    thingSize: new Map(map.things.map((t) => [t.id, t.size])),
    connectionBetween: (a, b) => map.connections.find((c) => c.between.includes(a) && c.between.includes(b)),
    abilityEffects: (actor, ability) => {
      const a = party.find((s) => s.id === actor)?.abilities;
      return [a?.combat, a?.noncombat].find((x) => x?.id === ability)?.declared?.effects ?? [];
    },
  };
}
