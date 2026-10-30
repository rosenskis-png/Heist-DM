// The bench's automatic checks: the engine's validation (docs/spec/engine.md §6) plus the Phase 2 exit
// tests that code can see. Each check is {name, ok: true | false | "near", detail}.
// The designer judges feel; these only point at evidence.

import { flagKeys } from "../src/engine/plan.js";
import { ODDS } from "../src/engine/rng.js";

export const BANDS = Object.keys(ODDS);

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

// Flag keys the engine doesn't know (D52). The engine's own check is `checkSteps`; this is for world actions.
export function unknownFlags(node, keys) {
  return [...new Set(flagKeysSet(node))].filter((k) => !keys.has(k));
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
  // Ids, moves, fit and flags are the engine's checks (docs/spec/engine.md §6).
  const { errors } = env.engineSteps(out);
  const badIds = errors.filter((e) => e.includes("unknown id"));
  const badFlags = errors.filter((e) => e.includes("flag"));
  const badMoves = errors.filter((e) => !badIds.includes(e) && !badFlags.includes(e));
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
  const badFlags = unknownFlags(actions, flagKeys(env.state));
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

export function rulingChecks(out, c) {
  return [{ name: "Ruled as expected", ok: out.answer === c.expect ? true : false, detail: `${out.answer} (expected ${c.expect})` }];
}
