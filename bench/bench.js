// The judgment test bench. Runs the real companion and campfire prompts on the hand-written cases in
// fixtures/bench/cases.json through `sample`, plus Camp, free play with any two companions; shows each call's input and output, and saves every
// run and note to the artifact's db so the design thread can read them.
import { validate } from "../src/validate.js";
import { companionSchema, campfireSchema, partySchema } from "../schemas/index.js";
import { speakerProblems } from "../src/calls/party.js";
import { classes } from "../content/classes.js";
import { pairs } from "../content/pairs.js";
import { companions as roster } from "../content/companions/index.js";
import * as Rel from "../src/campaign/relationship.js";
import * as Relationship from "../content/relationship.js";
import { addOutfit, equip, wearing } from "../src/campaign/wardrobe.js";
import { resolveParty, partyProblems } from "../src/campaign/roster.js";
import * as A from "../src/context.js";
import { load as loadEncounter } from "../src/engine/index.js";
import * as C from "./checks.js";
import * as Speech from "../src/ui/speech.js";

const url = (p) => new URL(`../${p}`, import.meta.url);
const $ = (sel, el = document) => el.querySelector(sel);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
};
const store = {
  get: (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

const KINDS = [
  { id: "huddle", label: "Huddle, two calls", schema: companionSchema, call: "companion" },
  // The same huddle cases, both companions in one call (D127), to judge against two.
  { id: "party", label: "Huddle, one call", schema: partySchema, call: "party", cases: "huddle" },
  { id: "campfire", label: "Campfire", schema: campfireSchema },
];
const PROMPTS = ["style", "companion", "party", "campfire"];
const TIERS = ["quick", "default", "complex"];
const DEFAULT_TIERS = { companion: "default", party: "default", campfire: "complex", grader: "quick" };
const settings = store.get("bench.settings", { runs: 3, tiers: {} });
settings.tiers = { ...DEFAULT_TIERS, ...settings.tiers };
const saveSettings = () => store.set("bench.settings", settings);

let env, sample, db, version;
const results = {}; // case key -> runs, newest first
let controller = new AbortController();

// ---------- loading ----------

async function load() {
  const text = (p) => fetch(url(p)).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${p}: ${r.status}`))));
  const sources = ["content/encounters/cells.json", "fixtures/bench/cases.json", ...PROMPTS.map((n) => `prompts/${n}.md`)];
  const code = ["src/context.js", "src/calls/party.js", "src/campaign/relationship.js", "src/campaign/roster.js", "content/relationship.js", "bench/checks.js"];
  const texts = await Promise.all([...sources, ...code].map(text));
  const [packet, cases] = texts.slice(0, 2).map(JSON.parse);
  const prompts = texts.slice(2, sources.length);
  // The bench version: a fingerprint of every prompt, case and check, so runs from older versions can be told apart.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texts.join("\0")));
  version = [...new Uint8Array(digest).slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const cls = classes[cases.player_class];
  const party = [{ id: "player", name: cls.name, role: "The player", skills: cls.mods, abilities: cls.abilities }];
  for (const id of cases.party.filter((p) => p !== "player")) party.push(roster[id]);
  const { map, people } = packet;
  env = {
    packet,
    cases,
    act: cases.act,
    party,
    companions: party.slice(1),
    prompts: Object.fromEntries(PROMPTS.map((n, i) => [n, prompts[i]])),
    ids: new Set([...map.zones, ...map.connections, ...map.things, ...map.facts, ...people, ...party].map((x) => x.id).concat("party")),
    hiddenTerms: cases.hidden_terms,
    state: loadEncounter({ packet, party }),
  };
}

// ---------- calling ----------

let active = 0;
const waiting = [];
async function slot(fn) {
  if (active >= 2) await new Promise((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

// One call, with the one retry on validation errors (D13). Never retries a runtime error.
// `engine` adds the engine's own validation (moves, flags), which also goes back for the one retry.
async function ask(input, schema, tier, engine = () => [], prepare = (o) => o) {
  const opts = () => ({ modelTier: tier, cache: false, signal: controller.signal });
  return slot(async () => {
    const t0 = performance.now();
    // One backoff on rate_limited, never a loop. A reply with no JSON in it gets one more try, counted, so how
    // often the model answers in prose stays visible instead of failing the whole run.
    let noJson = 0;
    const call = (x) =>
      sample.json(x, opts()).catch(async (e) => {
        if (e?.code === "invalid_json" && !noJson) {
          noJson++;
          return sample.json(x, opts());
        }
        if (e?.code !== "rate_limited") throw e;
        await new Promise((r) => setTimeout(r, 15000));
        return sample.json(x, opts());
      });
    let out = prepare(await call(input));
    let errors = validate(schema, out);
    if (!errors.length) errors = engine(out);
    let retried = false;
    let first = null;
    if (errors.length) {
      first = errors;
      retried = true;
      const turns = [
        { role: "user", content: input },
        { role: "assistant", content: JSON.stringify(out) },
        { role: "user", content: `That has problems:\n${errors.slice(0, 20).join("\n")}\nReturn the corrected JSON object only.` },
      ];
      out = prepare(await call(turns));
      errors = validate(schema, out);
      if (!errors.length) errors = engine(out);
    }
    return { out, errors, retried, first, noJson, ms: Math.round(performance.now() - t0), inputChars: input.length };
  });
}

const errorText = (e) => (e?.code ? `${e.code}: ${e.message}` : String(e?.message ?? e));

async function runOne(kind, c) {
  const k = KINDS.find((x) => x.id === kind);
  const tier = settings.tiers[k.call ?? kind];
  const run = { kind, case: c.id, tier, at: Date.now(), version };
  try {
    if (kind === "huddle") return Object.assign(run, await runHuddle(c, k.schema, tier));
    if (kind === "party") return Object.assign(run, await runParty(c, k.schema, tier));
    if (kind === "campfire") return Object.assign(run, await runCampfire(c, k.schema, tier));
  } catch (e) {
    run.error = errorText(e);
  }
  return run;
}

// The huddle: each companion in turn sees what the companion before her said (D137).
async function runHuddle(c, schema, tier) {
  const huddle = [...c.huddle];
  const turns = [];
  let ms = 0;
  let inputChars = 0;
  for (const self of env.companions) {
    const others = env.companions.filter((o) => o !== self);
    const input = A.companionInput(env, c, self, others, huddle, schema);
    const r = await ask(input, schema, tier);
    ms += r.ms;
    inputChars += r.inputChars;
    const pick = 0;
    if (r.out.message) huddle.push({ from: self.id, text: r.out.message });
    const checks = [...(r.errors.length ? [{ name: "Matches the schema", ok: false, detail: r.errors.slice(0, 5).join("; ") }] : C.companionChecks(r.out)), { name: "JSON first time", ok: r.noJson ? "near" : true, detail: r.noJson ? "the first reply held no JSON" : "" }];
    turns.push({ id: self.id, name: self.name, input, out: r.out, errors: r.errors, retried: r.retried, pick, checks });
  }
  const run = { turns, ms, inputChars };
  if (c.flaws) {
    const said = turns.map((t) => t.out.message ?? null);
    try {
      const g = await slot(() =>
        sample.json(A.graderInput(c.flaws, said), { modelTier: settings.tiers.grader, cache: false, signal: controller.signal }),
      );
      let i = 0;
      for (const t of turns) t.caught = [g.caught?.[i++] ?? []];
    } catch (e) {
      run.graderError = errorText(e);
    }
  }
  run.checks = turns.flatMap((t) => t.checks.map((x) => ({ ...x, name: `${t.name}: ${x.name}` })));
  return run;
}

// The huddle in one call: one exchange between both companions (D137). Each companion's
// row in the holes table counts her own lines, so it reads the same as the two-call tab's.
async function runParty(c, schema, tier) {
  const ids = env.companions.map((x) => x.id);
  const input = A.partyInput(env, c, env.companions, [...c.huddle], schema);
  const r = await ask(input, schema, tier, (o) => speakerProblems(o, ids));
  const pick = 0;
  const exchanges = r.out.lines ? [{ lines: r.out.lines }] : [];
  const run = { input, out: r.out, pick, ms: r.ms, inputChars: r.inputChars, retried: r.retried };
  run.turns = env.companions.map((comp) => ({ id: comp.id, name: comp.name, pick }));
  run.checks = [...(r.errors.length ? [{ name: "Matches the schema", ok: false, detail: r.errors.slice(0, 5).join("; ") }] : C.partyChecks(r.out, env.companions)), { name: "JSON first time", ok: r.noJson ? "near" : true, detail: r.noJson ? "the first reply held no JSON" : "" }];
  if (c.flaws && !r.errors.length) {
    const lines = exchanges.flatMap((x, i) => x.lines.map((l) => ({ ...l, i })));
    try {
      const g = await slot(() =>
        sample.json(A.graderInput(c.flaws, lines.map((l) => l.message)), { modelTier: settings.tiers.grader, cache: false, signal: controller.signal }),
      );
      lines.forEach((l, j) => (l.caught = g.caught?.[j] ?? []));
      run.caught = exchanges.map((_, i) => lines.filter((l) => l.i === i).map((l) => l.caught));
      for (const t of run.turns) t.caught = exchanges.map((_, i) => [...new Set(lines.filter((l) => l.i === i && l.from === t.id).flatMap((l) => l.caught))]);
    } catch (e) {
      run.graderError = errorText(e);
    }
  }
  return run;
}

// A campfire case: any two companions from the roster and the relationship state the case gives. One on one is
// one call. With both, it's two calls in speaking order (D85), the second seeing the first's answer and, if that
// moved nothing, required to. The engine checks each answer (one retry), then applies it.
function campfireSetup(c) {
  const members = resolveParty(c.party.map((id) => roster[id]));
  const romance = { ...Rel.newRomance(members, pairs), ...c.romance };
  // A case's payoff means they're lovers now unless it says otherwise (D96).
  for (const [id, r] of Object.entries(c.rel)) romance.rel[id] = { ...Rel.newRel(), ...(r.payoff ? { involved: true } : {}), ...r, toward: Rel.axes(r.toward ?? romance.rel[id]?.toward), read: Rel.axes(r.read ?? romance.rel[id]?.read) };
  let out = romance;
  for (const [who, owned] of Object.entries(c.outfits ?? {})) for (const [id, o] of Object.entries(owned)) out = addOutfit(out, who, id, o);
  return { members, romance: out };
}

async function runCampfire(c, schema, tier) {
  let { members, romance } = campfireSetup(c);
  const order = c.with.length > 1 ? Rel.speakingOrder(romance, c.with) : c.with;
  const scene = [...c.scene];
  const turns = [];
  let ms = 0;
  let inputChars = 0;
  let mustAdvance = false;
  for (const id of order) {
    const self = members.find((m) => m.id === id);
    const others = c.party.filter((x) => x !== id).map((x) => roster[x]);
    const where = { private: c.with.length === 1, inPerson: true, mustAdvance };
    const input = A.campfireInput({ ...env, romance }, { ...c, scene, mustAdvance }, roster[id], others, schema);
    const r = await ask(input, schema, tier, (o) => Rel.campfireProblems(romance, self, members, o, where), Rel.fillCampfire);
    ms += r.ms;
    inputChars += r.inputChars;
    const turn = { id, name: self.name, input, out: r.out, errors: r.errors, first: r.first };
    turns.push(turn);
    if (r.errors.length) break;
    const after = Rel.applyCampfire(romance, self, members, r.out, where);
    const [b, x] = [romance.rel[id], after.rel[id]];
    turn.tracks = ["heat", "intimacy", "regard", "lean"].map((k) => `${k} ${Math.round(b[k] * 10) / 10}→${Math.round(x[k] * 10) / 10}`).join(", ") + "; " + ["affection", "respect", "trust"].map((k) => `${k} ${b.toward[k]}→${x.toward[k]}`).join(", ");
    turn.stage = `${Rel.stage(b, self)} → ${Rel.stage(x, self)}`;
    romance = after;
    // What the other companion sees of it (D95, D108): the shared scene, words meant for her, and a hidden action only
    // if she caught it, as plain scene text.
    const w = Rel.catchAside(romance, r.out, where);
    romance = w.state;
    turn.caught = w.caught;
    scene.push(...r.out.segments.filter((g) => ["no", "to_other"].includes(asideOf(g)) || (asideOf(g) === "action" && w.caught)).map((g) => ({ from: (g.speaker === "narrator" ? "narrator" : id) + (asideOf(g) === "to_other" ? " (to you alone, over the rings)" : ""), text: g.text })));
    mustAdvance = !r.out.advances;
  }
  const run = { turns, ms, inputChars, campfire: true };
  run.checks = turns.flatMap((t) => [
    t.errors.length
      ? { name: `${t.name}: valid after one retry`, ok: false, detail: t.errors.slice(0, 5).join("; ") }
      : { name: `${t.name}: valid first time`, ok: !t.first, detail: t.first ? t.first.slice(0, 5).join("; ") : "" },
    ...(t.errors.length ? [] : [
      { name: `${t.name}: stage`, ok: "info", detail: t.stage },
      { name: `${t.name}: tracks`, ok: "info", detail: t.tracks },
      { name: `${t.name}: beats`, ok: "info", detail: t.out.beats.join(", ") || "none" },
      { name: `${t.name}: moves`, ok: "info", detail: t.out.advances ?? "nothing" },
      ...(t.out.outfit ? [{ name: `${t.name}: changes into`, ok: "info", detail: t.out.outfit }] : []),
    ]),
  ]);
  if (turns.length > 1) run.checks.push({ name: "Someone moved something", ok: turns.some((t) => t.out?.advances), detail: "" });
  return run;
}

async function runCase(kind, c, n, ui) {
  const key = `${kind}-${c.id}`;
  ui.status.textContent = `Running 0 of ${n}…`;
  ui.button.disabled = true;
  let done = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      const run = await runOne(kind, c);
      (results[key] ??= []).unshift(run);
      ui.status.textContent = ++done < n ? `Running ${done} of ${n}…` : "";
      renderRuns(kind, c, ui);
      save(key, run);
    }),
  );
  ui.button.disabled = false;
}

// ---------- saving ----------

async function save(key, run) {
  if (!db) return;
  const strip = ({ input, ...rest }) => rest;
  const body = run.turns ? { ...strip(run), turns: run.turns.map(strip) } : strip(run);
  try {
    await db.collection("runs").add({ key, kind: run.kind, tier: run.tier, at: run.at, data: JSON.stringify(body).slice(0, 200000) });
  } catch {}
}

async function loadSaved() {
  if (!db) return;
  try {
    const snap = await db.collection("runs").orderBy("at", "desc").limit(300).get();
    for (const d of snap.docs) {
      const { key, data } = d.data();
      try {
        (results[key] ??= []).push({ ...JSON.parse(data), saved: true });
      } catch {}
    }
  } catch {}
}

// ---------- rendering ----------

const chip = (ok, label, title) =>
  h("span", { class: `chip ${ok === true ? "ok" : ok === "near" ? "near" : ok === "info" ? "info" : "bad"}`, title }, label);

function summarize(runs) {
  const by = new Map();
  for (const r of runs)
    for (const x of r.checks ?? []) {
      if (x.ok === "info") continue;
      const s = by.get(x.name) ?? { pass: 0, near: 0, n: 0 };
      s.n++;
      if (x.ok === true) s.pass++;
      else if (x.ok === "near") s.near++;
      by.set(x.name, s);
    }
  return [...by].map(([name, s]) =>
    chip(s.pass === s.n ? true : s.pass + s.near === s.n ? "near" : false, `${name} ${s.pass}/${s.n}`, name),
  );
}

function flawTable(c, runs) {
  const hud = runs.filter((r) => r.turns?.every((t) => t.caught));
  if (!hud.length) return null;
  const rows = env.companions.map((comp) =>
    h(
      "tr",
      {},
      h("th", {}, comp.name),
      ...c.flaws.map((f) => {
        let picked = 0;
        for (const r of hud) {
          const t = r.turns.find((x) => x.id === comp.id);
          if (t?.caught[t.pick]?.includes(f.id)) picked++;
        }
        const tag = f.hunch_of.includes(comp.id) ? " hunch" : f.misses_of.includes(comp.id) ? " misses" : "";
        return h("td", { class: tag.trim() }, `${picked}/${hud.length}`);
      }),
    ),
  );
  return h(
    "div",
    { class: "scroll" },
    h(
      "table",
      { class: "flaws" },
      h("caption", {}, "Holes caught in what she said, across runs. Shaded: her hunch points at it; outlined: her blind spot."),
      h("tr", {}, h("th", {}), ...c.flaws.map((f) => h("th", { title: f.text }, f.id))),
      ...rows,
    ),
  );
}

const json = (v) => JSON.stringify(v, null, 1);
const fold = (label, body) => h("details", { class: "fold" }, h("summary", {}, label), h("pre", {}, body));

function campfireView(run) {
  return (run.turns ?? []).map((t) => {
    const who = { narrator: null, self: t.name, second_voice: roster[t.id].secondVoice?.name ?? "second voice" };
    const o = t.out ?? {};
    return h(
      "div",
      { class: "turn" },
      run.turns.length > 1 ? h("div", { class: "who" }, t.name) : null,
      h(
        "div",
        { class: "prose" },
        (o.segments ?? []).map((x) => h("p", { class: asideOf(x) !== "no" ? "aside" : null }, asideOf(x) !== "no" ? h("span", { class: "chip info" }, asideOf(x)) : null, who[x.speaker] ? h("b", {}, ` ${who[x.speaker]}: `) : null, x.text)),
        (o.changes ?? []).map((x) => h("p", { class: "texture" }, `${x.track} ${x.by > 0 ? "+" : ""}${x.by}: ${x.reason}`)),
        [...(o.inner ? [`Inside: ${o.inner}`] : []), ...(o.agenda ? [`Agenda: ${o.agenda}`] : []), ...(o.memories ?? []).map((m) => `Memory: ${m}`), ...(o.commitments ?? []).map((m) => `Commitment: ${m}`), ...(o.secrets ?? []).map((m) => `Revealed: ${m}`)].map((x) => h("p", { class: "texture" }, x)),
      ),
      // Saved runs don't keep inputs (save()).
      t.input ? fold(`Input · ${(t.input.length / 1024).toFixed(1)} KB`, t.input) : null,
      fold("Raw output", json(o)),
    );
  });
}

function huddleView(c, run) {
  return run.turns.map((t) =>
    h(
      "div",
      { class: "turn" },
      h("div", { class: "who" }, t.name),
      (t.out ? [t.out] : []).map((x, i) =>
        h(
          "div",
          { class: `cand${i === t.pick ? " picked" : ""}` },
          h("span", { class: "mark" }, i === t.pick ? "said" : ""),
          x.message ?? h("i", {}, "passes"),
          x.stance ? h("div", { class: "tag" }, `${x.stance.kind}: ${x.stance.text}`) : null,
          t.caught?.[i]?.length ? h("div", { class: "caught" }, t.caught[i].map((id) => h("span", { class: "chip info" }, id))) : null,
        ),
      ),
      t.input ? fold(`Input · ${(t.input.length / 1024).toFixed(1)} KB`, t.input) : null,
      fold("Raw output", json(t.out)),
    ),
  );
}

function partyView(c, run) {
  const name = (id) => roster[id]?.name ?? id;
  return h(
    "div",
    { class: "turn" },
    (run.out.lines ? [{ lines: run.out.lines }] : []).map((x, i) =>
      h(
        "div",
        { class: `cand${i === run.pick ? " picked" : ""}` },
        h("span", { class: "mark" }, i === run.pick ? "said" : ""),
        x.lines.length
          ? x.lines.map((l, j) =>
              h(
                "div",
                {},
                h("b", {}, `${name(l.from)}: `),
                l.message,
                l.stance ? h("div", { class: "tag" }, `${l.stance.kind}: ${l.stance.text}`) : null,
                run.caught?.[i]?.[j]?.length ? h("div", { class: "caught" }, run.caught[i][j].map((id) => h("span", { class: "chip info" }, id))) : null,
              ),
            )
          : h("i", {}, "both pass"),
      ),
    ),
  );
}

function renderRuns(kind, c, ui) {
  const runs = results[`${kind}-${c.id}`] ?? [];
  // Only runs from this version of the bench count; older ones stay visible, dimmed.
  const now = runs.filter((r) => r.version === version);
  ui.summary.replaceChildren(...summarize(now), ...(now.length < runs.length ? [h("span", { class: "status" }, `${runs.length - now.length} from older versions`)] : []));
  const table = c.flaws ? flawTable(c, now) : null;
  ui.flaws.replaceChildren(...(table ? [table] : []));
  ui.runs.replaceChildren(
    ...runs.map((run, i) => {
      try {
        return runView(kind, c, run, i, runs);
      } catch (e) {
        return h("p", { class: "err" }, `Run #${runs.length - i} couldn't be shown: ${errorText(e)}`);
      }
    }),
  );
}

function runView(kind, c, run, i, runs) {
  const head = h(
    "summary",
    {},
    h("span", { class: "rn" }, `#${runs.length - i}`),
    h("span", { class: "meta" }, `${run.tier} · ${run.ms ? (run.ms / 1000).toFixed(0) + "s" : "–"} · ${run.inputChars ? (run.inputChars / 1024).toFixed(0) + " KB in" : ""}${run.version !== version ? " · older version" : ""}`),
    run.error ? chip(false, "error") : h("span", { class: "dots" }, (run.checks ?? []).filter((x) => x.ok !== "info").map((x) => h("i", { class: x.ok === true ? "ok" : x.ok === "near" ? "near" : "bad", title: x.name }))),
  );
  const body = run.error
    ? h("p", { class: "err" }, run.error)
    : h(
        "div",
        { class: "body" },
        h("ul", { class: "checks" }, (run.checks ?? []).map((x) => h("li", {}, chip(x.ok, x.ok === true ? "pass" : x.ok === "near" ? "close" : x.ok === "info" ? "note" : "fail"), ` ${x.name}`, x.detail ? h("small", {}, ` ${x.detail}`) : null))),
        run.graderError ? h("p", { class: "err" }, `Grader: ${run.graderError}`) : null,
        kind === "huddle" ? huddleView(c, run) : kind === "party" ? partyView(c, run) : campfireView(run),
        run.input ? fold(`Input · ${(run.input.length / 1024).toFixed(1)} KB`, run.input) : null,
        run.out ? fold("Raw output", json(run.out)) : null,
      );
  return h("details", { class: `run${run.version !== version ? " old" : ""}`, open: i === 0 && !run.saved }, head, body);
}

function caseCard(kind, c) {
  const n = settings.runs;
  const ui = {
    status: h("span", { class: "status" }),
    summary: h("div", { class: "summary" }),
    flaws: h("div"),
    runs: h("div", { class: "runs" }),
  };
  ui.button = h("button", { class: "run-btn", onclick: () => runCase(kind, c, settings.runs, ui) }, `Run ×${n}`);
  const notes = h("textarea", { id: `note-${kind}-${c.id}`, rows: 2, placeholder: "Notes for the design thread (saved)" });
  let t;
  notes.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => db?.doc(`notes/${kind}-${c.id}`).set({ text: notes.value, at: Date.now() }).catch(() => {}), 800);
  });
  db?.doc(`notes/${kind}-${c.id}`).get().then((s) => s.exists && !notes.value && (notes.value = s.data().text ?? "")).catch(() => {});
  const card = h(
    "section",
    { class: "case" },
    h("div", { class: "case-head" }, h("h2", {}, c.title), ui.button),
    c.look_for ? h("p", { class: "look" }, c.look_for) : null,
    c.plan ? h("blockquote", {}, c.plan) : c.message ? h("blockquote", {}, `To ${c.to === "dm" ? "the DM" : c.to}: ${c.message}`) : null,
    c.scene ? c.scene.map((x) => h("blockquote", {}, x.text)) : null,
    h("div", { class: "row" }, ui.summary, ui.status),
    ui.flaws,
    ui.runs,
    notes,
  );
  renderRuns(kind, c, ui);
  return card;
}

function settingsView() {
  const tiers = Object.keys(settings.tiers).map((call) =>
    h(
      "label",
      { class: "set" },
      h("span", {}, call),
      h(
        "select",
        { id: `tier-${call}`, onchange: (e) => ((settings.tiers[call] = e.target.value), saveSettings()) },
        TIERS.map((t) => h("option", { value: t, selected: settings.tiers[call] === t }, t)),
      ),
    ),
  );
  const sizes = KINDS.map((k) => {
    const c = env.cases[k.cases ?? k.id][0];
    const input =
      k.id === "huddle"
        ? A.companionInput(env, c, env.companions[0], env.companions.slice(1), c.huddle, k.schema)
        : k.id === "party"
          ? A.partyInput(env, c, env.companions, c.huddle, k.schema)
        : k.id === "campfire"
          ? A.campfireInput({ ...env, romance: campfireSetup(c).romance }, c, roster[c.with[0]], c.party.filter((id) => id !== c.with[0]).map((id) => roster[id]), k.schema)
          : A[`${k.id}Input`](env, c, k.schema);
    const calls = k.id === "huddle" ? env.companions.length : 1;
    return h("li", {}, `${k.label}: ${(input.length / 1024).toFixed(1)} KB input${calls > 1 ? ` × ${calls} calls` : ""}, prompt ${(env.prompts[k.call ?? k.id].length / 1024).toFixed(1)} KB`);
  });
  return h(
    "section",
    { class: "case" },
    h("h2", {}, "Settings"),
    h(
      "label",
      { class: "set" },
      h("span", {}, "Runs per test"),
      h(
        "select",
        { id: "runs", onchange: (e) => ((settings.runs = Number(e.target.value)), saveSettings(), show(current)) },
        [1, 3, 5, 10].map((n) => h("option", { value: n, selected: settings.runs === n }, n)),
      ),
    ),
    h("h3", {}, "Model tier per call"),
    h("div", { class: "tiers" }, tiers),
    h("p", { class: "look" }, "Quick is fastest and cheapest; complex thinks longest. The grader marks which holes a companion caught; it isn't part of the game."),
    h("h3", {}, "Sizes"),
    h("ul", { class: "sizes" }, sizes),
    h("button", { class: "run-btn ghost", onclick: () => (controller.abort(), (controller = new AbortController())) }, "Stop all running calls"),
  );
}

// A saved tab that no longer exists falls back to the huddle.
const TABS = ["huddle", "party", "campfire", "camp", "settings"];
let current = TABS.includes(store.get("bench.tab", "huddle")) ? store.get("bench.tab", "huddle") : "huddle";
function show(tab) {
  current = tab;
  store.set("bench.tab", tab);
  for (const b of document.querySelectorAll("nav button")) b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
  const main = $("#cases");
  if (tab === "settings") return main.replaceChildren(settingsView());
  if (tab === "camp") return main.replaceChildren(...campView());
  main.replaceChildren(...env.cases[KINDS.find((k) => k.id === tab)?.cases ?? tab].map((c) => caseCard(tab, c)));
}

async function start() {
  const banner = $("#banner");
  try {
    await load();
  } catch (e) {
    banner.textContent = `Couldn't load the bench files: ${errorText(e)}`;
    banner.hidden = false;
    return;
  }
  $("nav").replaceChildren(
    ...KINDS.map((k) => h("button", { "data-tab": k.id, onclick: () => show(k.id) }, k.label)),
    h("button", { "data-tab": "camp", onclick: () => show("camp") }, "Camp"),
    h("button", { "data-tab": "settings", onclick: () => show("settings") }, "⚙"),
  );
  show(current);
  [sample, db] = await Promise.all([window.claude?.use("sample") ?? null, window.claude?.use("db") ?? null]);
  if (!sample) {
    banner.textContent = "Calls to Claude aren't available in this view. Open the bench on claude.ai to run tests.";
    banner.hidden = false;
  }
  await loadSaved();
  show(current);
}

// ---------- Camp: free play for character design ----------
// Any two companions, any relationship state, one on one or both, as many turns as you like. Each answer goes
// through the engine's checks and is applied, so the numbers move as the scene does. Kept in this browser only.

const camp = store.get("bench.camp", null) ?? { a: "nadia", b: "fern", with: "both", log: "", romance: null, transcript: [], looks: {} };
// A relationship state saved before the three axes and beliefs (D92, D96) starts over; the transcript stays.
if (camp.romance && Object.values(camp.romance.rel ?? {}).some((r) => !r.toward)) camp.romance = null;
camp.to ??= "all";
// Who is really at the fire when he sits with one of them, if a shapeshifter came in her place (D101).
camp.disguise ??= null;

// Shortcuts for Camp: a general vibe in one pick, adjustable after. Toward the player sets heat, intimacy, regard
// and the flags; toward the other companion sets her view and her read of the other's.
const PRESETS_YOU = [
  { name: "Stranger", set: { heat: 0, intimacy: 0, regard: 0 } },
  { name: "Curious", set: { heat: 2, intimacy: 1, regard: 2 } },
  { name: "Flirting", set: { heat: 4, intimacy: 2, regard: 3 } },
  { name: "Friends", set: { heat: 1, intimacy: 5, regard: 5 } },
  { name: "Smitten, not yet lovers", set: { heat: 5, intimacy: 4, regard: 5 } },
  { name: "New lovers", set: { heat: 6, intimacy: 4, regard: 5, payoff: true, involved: true } },
  { name: "Lovers, opening up", set: { heat: 7, intimacy: 7, regard: 6, payoff: true, involved: true, vuln: true } },
  { name: "Deeply in love", set: { heat: 8, intimacy: 9, regard: 9, payoff: true, involved: true, vuln: true } },
  { name: "Wary", set: { heat: 0, intimacy: 0, regard: -3 } },
  { name: "Resentful", set: { heat: 1, intimacy: 1, regard: -6 } },
  { name: "Hostile", set: { heat: 0, intimacy: 0, regard: -10 } },
  { name: "Hate-lust", set: { heat: 6, intimacy: 0, regard: -6 } },
  { name: "Hurt lover", set: { heat: 5, intimacy: 5, regard: -5, payoff: true, involved: true, hurt: true } },
  { name: "Exes", set: { heat: 3, intimacy: 4, regard: 0, payoff: true, involved: false } },
];
const PRESETS_OTHER = [
  { name: "Strangers", toward: { affection: 0, respect: 0, trust: 0 } },
  { name: "Friends", toward: { affection: 5, respect: 4, trust: 5 } },
  { name: "Best friends", toward: { affection: 9, respect: 7, trust: 9 } },
  { name: "Lovers", toward: { affection: 10, respect: 6, trust: 8 } },
  { name: "Fond exasperation", toward: { affection: 5, respect: -3, trust: -3 } },
  { name: "Protective, condescending", toward: { affection: 6, respect: -3, trust: 4 } },
  { name: "Respected rival", toward: { affection: -4, respect: 6, trust: 1 } },
  { name: "Frenemies", toward: { affection: -2, respect: 2, trust: -5 } },
  { name: "Can't stand her, trusts her", toward: { affection: -5, respect: 3, trust: 5 } },
  { name: "Contempt", toward: { affection: -4, respect: -9, trust: -3 } },
  { name: "Hatred", toward: { affection: -9, respect: -6, trust: -8 } },
  { name: "Secret hatred (thinks she's loved)", toward: { affection: -8, respect: -4, trust: -5 }, read: { affection: 6, respect: 3, trust: 6 } },
  { name: "Adores her, thinks she's hated", toward: { affection: 7, respect: 5, trust: 6 }, read: { affection: -6, respect: -3, trust: -4 } },
  { name: "Suspicious", toward: { affection: 1, respect: 1, trust: -7 } },
];

// ---------- reading Camp aloud (D104) ----------
camp.voices ??= {};
// Every voice in the scene: each companion, her second voice if she has one, and the narrator.
const campSpeakers = () => campMembers().flatMap((c) => [c.id, ...(c.secondVoice ? [`${c.id}:second`] : [])]);
const campCast = () => Speech.assign(Speech.voices(), campSpeakers(), camp.voices);
// A companion's turn as lines to read. A disguised turn is read in the voice of the face she's wearing.
function campLines(t) {
  const face = t.as ?? t.from;
  const rate = roster[face]?.rate ?? 1;
  return t.out.segments.filter((g) => asideOf(g) !== "to_other").map((g) => ({
    text: g.text,
    speaker: g.speaker === "narrator" ? "narrator" : g.speaker === "second_voice" ? `${t.from}:second` : face,
    rate: g.speaker === "narrator" ? 1 : rate,
    volume: asideOf(g) !== "no" ? 0.7 : 1,
  }));
}
const campRead = (turns) => Speech.speak(turns.flatMap(campLines), campCast());
// Some browsers list their voices late; redraw Camp once they arrive.
let voiceCount = 0;
Speech.voices(() => {
  const n = Speech.voices().length;
  if (n !== voiceCount && document.querySelector("#camp-say")) show("camp");
  voiceCount = n;
});

// Sitting with one companion alone: a shapeshifting other may come in her place. "Force" makes her come.
// Changing who's at the fire continues the same chat (D113): any whisper target resets, and who really comes is decided
// once, for the whole private scene. A companion never sees a private scene she wasn't in.
function campChooseWith(value) {
  camp.with = value;
  camp.to = "all";
  camp.disguise = null;
  if (value !== "both" && camp.romance) {
    const members = campMembers();
    const other = members.find((m) => m.id !== value);
    let actor = value;
    if (other?.shapeshift && camp.forceShift) actor = other.id;
    else {
      const w = Rel.whoComes(camp.romance, members, value);
      camp.romance = w.state;
      actor = w.actor;
    }
    if (actor !== value) camp.disguise = { actor, as: value };
  }
  saveCamp();
}
const campName = (t) => (t.as ? (camp.reveal ? `${roster[t.from].name} (as ${roster[t.as].name})` : roster[t.as].name) : roster[t.from].name);
// Camp is saved in this browser, and the latest scene also goes to the artifact's db (D111), one document that each
// save overwrites, so the design thread can read the scene being troubleshot and nothing older piles up. Full inputs
// are kept only for the last two answers; the rest keep their outputs, problems and retries.
let latestTimer;
const saveLatest = () => {
  if (!db) return;
  clearTimeout(latestTimer);
  latestTimer = setTimeout(() => db.doc("camp/latest").set(campDoc()).catch(() => {}), 1500);
};
// Before a scene is cleared, it's kept as `camp/previous` (one slot, overwritten), so switching scenes can't lose it.
const keepPrevious = () => db?.doc("camp/previous").set(campDoc()).catch(() => {});
function campDoc() {
  {
    const answered = camp.transcript.map((t, i) => (t.input ? i : -1)).filter((i) => i >= 0).slice(-2);
    const doc = {
      at: Date.now(),
      version,
      with: camp.with,
      to: camp.to,
      first: camp.a,
      second: camp.b,
      disguise: camp.disguise,
      forceShift: !!camp.forceShift,
      showingTruth: !!camp.reveal,
      log: camp.log,
      state: camp.romance,
      transcript: camp.transcript.map((t, i) => (answered.includes(i) ? t : (({ input, ...rest }) => rest)(t))),
    };
    return JSON.parse(JSON.stringify(doc));
  }
}
const saveCamp = () => {
  store.set("bench.camp", { ...camp, transcript: camp.transcript.map(({ input, ...t }) => t) });
  saveLatest();
};
const campMembers = () => resolveParty([roster[camp.a], roster[camp.b]]);
function campReset() {
  if (camp.transcript.length) keepPrevious();
  camp.romance = Rel.newRomance(campMembers(), pairs, { turn: 10, act: 1 });
  camp.transcript = [];
  saveCamp();
}

// An aside's kind (D108); saves from before it was a kind held true or false.
const asideOf = (g) => (g.aside === true ? "action" : g.aside || "no");

// What the scene has said so far, as `viewer`'s next call reads it (D95, D108). The player's ring whispers reach only
// the one he whispered to. A companion's ring words to him reach no one else; her words to the other over the rings
// reach the other; a hidden action reaches the other only if caught, and then as plain scene text, unflagged.
function campScene(viewer) {
  return camp.transcript.flatMap((t) => {
    // A private scene she wasn't in never reaches her.
    if (t.present && t.present !== "both" && t.present !== viewer) return [];
    if (t.from === "player") return t.to && t.to !== viewer ? [] : [{ from: t.to ? "player, to you alone over the rings" : "player", text: t.text }];
    if (!t.out) return [];
    const c = roster[t.from];
    const mine = t.from === viewer;
    // A disguised turn reads as hers to everyone but the one wearing the face.
    const name = t.as && !mine ? roster[t.as].name : c.name + (t.as ? ` (wearing ${roster[t.as].name}'s face)` : "");
    const shown = (g) => {
      const k = asideOf(g);
      return k === "no" || mine || k === "to_other" || (k === "action" && t.caught);
    };
    const tag = (g) => {
      const k = asideOf(g);
      if (k === "to_other") return mine ? " (to her alone, over the rings)" : " (to you alone, over the rings)";
      if (!mine) return "";
      return k === "ring" ? " (to him alone, over the rings)" : k === "action" ? " (out of her sight)" : "";
    };
    return t.out.segments.filter(shown).map((g) => ({ from: (g.speaker === "narrator" ? "narrator" : g.speaker === "second_voice" ? c.secondVoice?.name ?? "second voice" : name) + tag(g), text: g.text }));
  });
}

async function campSend(text, status) {
  const members = campMembers();
  const both = camp.with === "both";
  // A whisper target only counts if she's one of the two here (an old save could name someone else).
  const whisper = both && [camp.a, camp.b].includes(camp.to) ? camp.to : null;
  // A whisper goes to one of them over the rings, silently: she answers, and the other never hears it (D108).
  const ids = whisper ? [whisper] : both ? [camp.a, camp.b] : [camp.disguise?.actor ?? camp.with];
  // Who was really there: both, or the one he sat with (the shapeshifter, if she came in that one's place).
  const present = both ? "both" : camp.disguise?.actor ?? camp.with;
  camp.transcript.push({ from: "player", text, present, ...(whisper ? { to: whisper } : {}) });
  camp.romance = Rel.nextTurn(camp.romance);
  const order = ids.length > 1 ? Rel.speakingOrder(camp.romance, ids) : ids;
  let mustAdvance = false;
  for (const id of order) {
    const face = !both && camp.disguise?.actor === id ? camp.disguise.as : id;
    status.textContent = `${roster[face].name} is answering…`;
    const self = members.find((m) => m.id === id);
    const other = id === camp.a ? camp.b : camp.a;
    const where = { private: !both, inPerson: true, mustAdvance };
    const as = !both && camp.disguise?.actor === id ? camp.disguise.as : null;
    if (as) where.disguisedAs = as;
    const c = { with: both ? [camp.a, camp.b] : ids, ...(as ? { disguisedAs: as } : {}), scene: campScene(id), mustAdvance, log: camp.log.split("\n").map((l) => l.trim()).filter(Boolean) };
    const input = A.campfireInput({ ...env, romance: camp.romance }, c, roster[id], [roster[other]], campfireSchema);
    try {
      const r = await ask(input, campfireSchema, settings.tiers.campfire, (o) => Rel.campfireProblems(camp.romance, self, members, o, where), Rel.fillCampfire);
      if (r.errors.length) {
        camp.transcript.push({ from: id, error: r.errors.slice(0, 5).join("; "), input });
        break;
      }
      camp.romance = Rel.applyCampfire(camp.romance, self, members, r.out, where);
      const w = Rel.catchAside(camp.romance, r.out, where);
      camp.romance = w.state;
      camp.transcript.push({ from: id, present, ...(as ? { as } : {}), out: r.out, input, retried: r.retried, ...(r.first ? { firstProblems: r.first.slice(0, 5) } : {}), ...(w.caught ? { caught: true } : {}) });
      mustAdvance = !r.out.advances;
    } catch (e) {
      camp.transcript.push({ from: id, error: errorText(e), input });
      break;
    }
  }
  status.textContent = "";
  saveCamp();
}

// A plain description of how she looks now, for the designer: from her look, what she has on, and her second
// voice's look if she has one.
async function describeLooks(id, out) {
  const c = campMembers().find((m) => m.id === id);
  const source = { name: c.name, race: c.race, age: c.age, look: c.look, wearing: wearing(camp.romance, c), ...(c.secondVoice ? { second_voice: { name: c.secondVoice.name, look: c.secondVoice.look } } : {}) };
  out.replaceChildren(h("p", { class: "status" }, "Describing…"));
  try {
    const d = await sample.json(
      `Below is a game character's appearance as written. Restate it as a clean, simple description for the game's designer, using only what's written (say "not described" where nothing is). Return only JSON: {"outfit": text, "hair": text (colour and style), "face": text (features), "body_type": text, "body_shape": text, "other_features": text (anything else defining)${c.secondVoice ? `, "second_voice": the same fields for ${c.secondVoice.name}` : ""}}.\n\n${JSON.stringify(source)}`,
      { modelTier: "quick", cache: true, signal: controller.signal },
    );
    const rows = (o) => Object.entries(o).filter(([k]) => k !== "second_voice").map(([k, v]) => h("div", { class: "look-row" }, h("dt", {}, k.replace("_", " ")), h("dd", {}, String(v))));
    camp.looks[id] = d;
    out.replaceChildren(
      h("dl", { class: "looks" }, rows(d)),
      d.second_voice ? h("h3", {}, c.secondVoice.name) : null,
      d.second_voice ? h("dl", { class: "looks" }, rows(d.second_voice)) : null,
      h("p", { class: "status" }, `Edit in content/companions/${c.id}.js: look, outfit${c.secondVoice ? ", secondVoice.look" : ""}${c.tie ? ", or the tie entry for this sister" : ""}.`),
    );
  } catch (e) {
    out.replaceChildren(h("p", { class: "err" }, errorText(e)));
  }
}

function campView() {
  if (!roster[camp.a] || !roster[camp.b]) Object.assign(camp, { a: Object.keys(roster)[0], b: Object.keys(roster)[1] });
  const problems = partyProblems([roster[camp.a], roster[camp.b]]);
  if (!problems.length && (!camp.romance || !camp.romance.rel[camp.a] || !camp.romance.rel[camp.b])) campReset();
  const rerender = () => show("camp");
  const pick = (key) =>
    h("select", { id: `camp-${key}`, onchange: (e) => ((camp[key] = e.target.value), (camp.with = "both"), (camp.to = "all"), (camp.disguise = null), (camp.romance = null), saveCamp(), rerender()) },
      Object.values(roster).map((c) => h("option", { value: c.id, selected: camp[key] === c.id }, c.name)));
  const setup = h(
    "section",
    { class: "case" },
    h("div", { class: "case-head" }, h("h2", {}, "Camp"), h("button", { class: "run-btn ghost", onclick: () => (campReset(), rerender()) }, "Start over")),
    h("p", { class: "look" }, "Pick two companions, set where everything stands, then talk. The numbers move with the scene, and you can change them any time."),
    h("label", { class: "set" }, h("span", {}, "First companion"), pick("a")),
    h("label", { class: "set" }, h("span", {}, "Second companion"), pick("b")),
    problems.length ? h("p", { class: "err" }, `These two can't share a party: ${problems.join("; ")}`) : null,
  );
  if (problems.length) return [setup];
  const members = campMembers();
  setup.append(
    h("label", { class: "set" }, h("span", {}, "At the fire"),
      h("select", { id: "camp-with", onchange: (e) => (campChooseWith(e.target.value), rerender()) },
        [["both", "Both"], [camp.a, `${roster[camp.a].name} alone`], [camp.b, `${roster[camp.b].name} alone`]].map(([v, l]) => h("option", { value: v, selected: camp.with === v }, l)))),
    ...["turn", "act"].map((k) =>
      h("label", { class: "set" }, h("span", {}, k === "turn" ? "Campaign turn" : "Act"),
        h("input", { id: `camp-${k}`, type: "number", min: k === "act" ? 1 : 0, value: camp.romance[k], onchange: (e) => ((camp.romance[k] = Number(e.target.value)), saveCamp(), rerender()) }))),
    h("label", { class: "stack" }, h("span", {}, "The story so far (one event per line)"),
      h("textarea", { id: "camp-log", rows: 2, oninput: (e) => ((camp.log = e.target.value), saveCamp()) }, camp.log)),
  );
  const TRACKS = [["heat", 0, 12], ["intimacy", 0, 10], ["regard", -10, 10], ["lean", 0, 10]];
  const AXES = ["affection", "respect", "trust"];
  const cards = members.map((c) => {
    const r = camp.romance.rel[c.id];
    const other = members.find((m) => m.id !== c.id);
    const set = (k, v) => ((r[k] = v), saveCamp(), rerender());
    const setIn = (group, k, v) => ((r[group][k] = v), saveCamp(), rerender());
    // A dropdown per number: quicker than typing on a phone.
    const num = (id, lo, hi, v, on) => {
      const cur = Math.round(v);
      return h("select", { id, class: "num", onchange: (e) => on(Number(e.target.value)) },
        Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((n) => h("option", { value: n, selected: n === cur }, String(n))));
    };
    const preset = (id, label, list, apply) =>
      h("label", { class: "set" }, h("span", {}, label),
        h("select", { id, onchange: (e) => { const p = list[Number(e.target.value)]; if (p) { apply(p); saveCamp(); rerender(); } } },
          [h("option", { value: "" }, "Choose a preset…"), ...list.map((p, i) => h("option", { value: i }, p.name))]));
    const looks = h("div");
    const owned = camp.romance.wardrobe[c.id];
    return h(
      "section",
      { class: "case" },
      h("div", { class: "case-head" }, h("h2", {}, c.name), h("span", { class: "chip info" }, Rel.stage(r, c))),
      h("h3", {}, "Toward you"),
      preset(`camp-${c.id}-preset-you`, "Preset", PRESETS_YOU, (p) => Object.assign(r, { payoff: false, involved: false, vuln: false, hurt: false, ...p.set })),
      h("div", { class: "grid" },
        TRACKS.map(([k, lo, hi]) => h("label", { class: "set" }, h("span", {}, k), num(`camp-${c.id}-${k}`, lo, hi, r[k], (v) => set(k, v)))),
        c.escalation ? h("label", { class: "set" }, h("span", {}, `${c.escalation.name} level`), num(`camp-${c.id}-storm`, 0, c.escalation.tiers.length, r.storm, (v) => set("storm", v))) : null),
      h("ul", { class: "sizes" }, ["heat", "intimacy", "regard"].map((k) => h("li", {}, A.stance(Relationship.stances[k], r[k])))),
      h("h3", {}, `Toward ${other.name}: feels · thinks ${other.name} feels`),
      preset(`camp-${c.id}-preset-other`, "Preset", PRESETS_OTHER, (p) => ((r.toward = Rel.axes(p.toward)), (r.read = Rel.axes(p.read ?? p.toward)))),
      h("div", { class: "grid" },
        AXES.map((k) => h("label", { class: "set" }, h("span", {}, k),
          h("span", { class: "row" }, num(`camp-${c.id}-${k}`, -10, 10, r.toward[k], (v) => setIn("toward", k, v)), num(`camp-${c.id}-read-${k}`, -10, 10, r.read[k], (v) => setIn("read", k, v)))))),
      h("div", { class: "row" },
        [["payoff", "payoff happened"], ["involved", "lovers now"], ["vuln", "opened up"], ["hurt", "hurt"], ...(c.secondVoice ? [["manifest", `${c.secondVoice.name} has appeared`]] : [])].map(([k, label]) =>
          h("label", { class: "check" }, h("input", { id: `camp-${c.id}-${k}`, type: "checkbox", checked: !!r[k], onchange: (e) => set(k, e.target.checked) }), ` ${label}`)),
        [["past", `thinks you and ${other.name} were involved`], ["current", `thinks you and ${other.name} are involved now`]].map(([k, label]) =>
          h("label", { class: "check" }, h("input", { id: `camp-${c.id}-believes-${k}`, type: "checkbox", checked: !!r.believes[k], onchange: (e) => setIn("believes", k, e.target.checked) }), ` ${label}`))),
      camp.reveal ? h("label", { class: "stack" }, h("span", {}, "Private agenda"), h("textarea", { id: `camp-${c.id}-agenda`, rows: 2, onchange: (e) => set("agenda", e.target.value.trim() || null) }, r.agenda ?? "")) : null,
      c.shapeshift ? h("label", { class: "stack" }, h("span", {}, "Current form (empty: her own look)"), h("textarea", { id: `camp-${c.id}-form`, rows: 2, onchange: (e) => set("form", e.target.value.trim() || null) }, r.form ?? "")) : null,
      r.knowsShifter && other.shapeshift ? h("p", { class: "status" }, `Knows ${other.name} can change her shape.`) : null,
      r.absent.length ? h("p", { class: "status" }, `Someone wore her face on turn ${r.absent.join(", ")}.`) : null,
      h("p", { class: "status" }, `Configuration: ${Rel.config(camp.romance, c, members)} · gained this camp: heat ${r.gain.heat}/${Relationship.caps.perEncounter.heat}, intimacy ${r.gain.intimacy}/${Relationship.caps.perEncounter.intimacy}`),
      h("label", { class: "set" }, h("span", {}, "Wearing"),
        h("select", { id: `camp-${c.id}-outfit`, onchange: (e) => ((camp.romance = equip(camp.romance, c.id, e.target.value)), saveCamp(), rerender()) },
          Object.entries(owned.owned).map(([id, o]) => h("option", { value: id, selected: owned.equipped === id }, o.name)))),
      h("button", { class: "run-btn ghost", onclick: () => describeLooks(c.id, looks) }, "Describe looks"),
      looks,
      h("p", { class: "status" }, `Ready: ${Rel.allowedBeats(camp.romance, c, members, { private: camp.with === c.id, inPerson: true }).join(", ")}`),
    );
  });
  setup.append(
    h("div", { class: "row" },
      [["open", "everything's out in the open"], ["shared", "all three openly together"]].map(([k, label]) =>
        h("label", { class: "check" }, h("input", { id: `camp-${k}`, type: "checkbox", checked: !!camp.romance[k], onchange: (e) => ((camp.romance[k] = e.target.checked), saveCamp(), rerender()) }), ` ${label}`))),
    h("button", { class: "run-btn ghost", onclick: () => ((camp.romance = Rel.endEncounter(camp.romance)), saveCamp(), rerender()) }, "New camp (resets the +4 gain caps)"),
    h("div", { class: "row" },
      h("label", { class: "check" }, h("input", { id: "camp-reveal", type: "checkbox", checked: !!camp.reveal, onchange: (e) => ((camp.reveal = e.target.checked), saveCamp(), rerender()) }), " show what's really going on (thoughts, agendas, disguises)"),
      members.some((c) => c.shapeshift)
        ? h("label", { class: "check" }, h("input", { id: "camp-force", type: "checkbox", checked: !!camp.forceShift, onchange: (e) => ((camp.forceShift = e.target.checked), camp.transcript.length ? saveCamp() : campChooseWith(camp.with), rerender()) }), " a shapeshifter always comes in the other's place (testing; one-on-one scenes only)")
        : "",
      camp.reveal && camp.disguise ? h("span", { class: "chip near" }, `${roster[camp.disguise.actor].name} is wearing ${roster[camp.disguise.as].name}'s face`) : "",
      camp.forceShift && camp.with === "both" ? h("span", { class: "status" }, "Impersonation happens only one-on-one: choose one of them alone under \"At the fire\".") : ""),
  );
  if (Speech.available()) {
    const ranked = Speech.rank(Speech.voices());
    const cast = campCast();
    const label = (id) => (id === "narrator" ? "Narrator" : id.endsWith(":second") ? roster[id.split(":")[0]].secondVoice.name : roster[id].name);
    const all = Speech.voices();
    const best = ranked.filter((v) => Speech.quality(v));
    setup.append(
      h("details", { class: "fold" },
        h("summary", {}, `Voices · ${ranked.length} English voices, ${best.length} premium or enhanced`),
        h("label", { class: "check" }, h("input", { id: "camp-read", type: "checkbox", checked: !!camp.readAloud, onchange: (e) => ((camp.readAloud = e.target.checked), saveCamp()) }), " read new answers aloud"),
        ...[...campSpeakers(), "narrator"].map((id) =>
          h("label", { class: "set" }, h("span", {}, label(id)),
            h("span", { class: "row" },
              h("select", { id: `camp-voice-${id.replace(":", "-")}`, onchange: (e) => ((camp.voices[id] = e.target.value), saveCamp(), rerender()) },
                ranked.map((v) => h("option", { value: Speech.idOf(v), selected: cast[id] && Speech.idOf(cast[id]) === Speech.idOf(v) }, `${Speech.labelOf(v)}${ranked.filter((x) => x.name === v.name && x.lang === v.lang).length > 1 ? ` · ${Speech.idOf(v).split(/[./]/).slice(-2).join(".")}` : ""}${v.localService ? "" : " (online)"}`))),
              h("button", { class: "run-btn ghost", onclick: () => (Speech.unlock(), Speech.speak([{ text: "The fire cracks. Somewhere below, chains shift in the dark.", speaker: id, rate: id === "narrator" ? 1 : roster[id.split(":")[0]]?.rate ?? 1 }], campCast())) }, "Try")))),
        h("button", { class: "run-btn ghost", onclick: () => Speech.stop() }, "Stop reading"),
        // Exactly what the browser lists, every language, for working out which voices a device exposes.
        fold(`Every voice this browser lists (${all.length})`, all.map((v) => `${v.name} · ${v.lang} · ${v.voiceURI}${v.localService ? "" : " · online"}${v.default ? " · default" : ""}`).join("\n") || "none"),
        h("p", { class: "status" }, "On iPhone, download voices in Settings › Accessibility › Spoken Content › Voices › English (Premium or Enhanced). Whether iOS offers them to web pages depends on the version and the app; Safari shows the most."),
      ),
    );
  }
  const status = h("span", { class: "status" });
  const box = h("textarea", { id: "camp-say", rows: 3, placeholder: "What you say or do" });
  const to = camp.with === "both"
    ? h("label", { class: "set" }, h("span", {}, "Say it to"),
      h("select", { id: "camp-to", onchange: (e) => ((camp.to = e.target.value), saveCamp()) },
        [["all", "Both"], [camp.a, `Whisper to ${roster[camp.a].name}`], [camp.b, `Whisper to ${roster[camp.b].name}`]].map(([v, l]) => h("option", { value: v, selected: camp.to === v }, l))))
    : null;
  const send = h("button", { class: "run-btn", onclick: async () => {
    const text = box.value.trim();
    if (!text || !sample) return;
    send.disabled = true;
    Speech.unlock();
    const before = camp.transcript.length;
    await campSend(text, status);
    if (camp.readAloud) campRead(camp.transcript.slice(before).filter((t) => t.out));
    rerender();
  } }, "Send");
  const lines = camp.transcript.map((t) => {
    if (t.from === "player") return h("blockquote", {}, t.to ? h("span", { class: "chip info" }, `whisper to ${roster[t.to].name}`) : null, t.to ? " " : null, t.text);
    if (t.from === "system") return h("p", { class: "status" }, t.text);
    const c = roster[t.from];
    if (t.error) return h("p", { class: "err" }, `${c.name}: ${t.error}`);
    const who = { narrator: null, self: campName(t), second_voice: c.secondVoice?.name ?? "second voice" };
    const o = t.out;
    return h("div", { class: "turn" },
      camp.reveal && (o.inner || o.agenda) ? h("p", { class: "inner" }, o.inner ? `Inside: ${o.inner}` : null, o.agenda ? ` · New agenda: ${o.agenda}` : null) : null,
      t.caught ? h("p", { class: "caught" }, `caught: ${roster[t.from === camp.a ? camp.b : camp.a].name} saw the hidden action (developer view)`) : null,
      h("div", { class: "prose" }, o.segments.map((g) => {
        const k = asideOf(g);
        const other = roster[t.from === camp.a ? camp.b : camp.a]?.name ?? "the other";
        // Words between the two companions: the player sees only that something passed between them.
        if (k === "to_other" && !camp.reveal) return h("p", { class: "aside" }, `${who.self} and ${other} exchange a look; something passes between them over the rings.`);
        const chip = { action: "out of sight", ring: "over the rings", to_other: `to ${other}, over the rings` }[k];
        return h("p", { class: k !== "no" ? "aside" : null }, chip ? h("span", { class: "chip info" }, chip) : null, chip ? " " : null, who[g.speaker] ? h("b", {}, `${who[g.speaker]}: `) : null, g.text);
      })),
      h("p", { class: "texture" }, [
        ...o.changes.map((x) => `${x.track} ${x.by > 0 ? "+" : ""}${x.by} (${x.reason})`),
        o.beats.length ? `beats: ${o.beats.join(", ")}` : null,
        o.storm != null ? `storm: ${o.storm}` : null,
        o.believes ? `now believes: ${o.believes.current ? "involved now" : o.believes.past ? "involved once" : "nothing"}` : null,
        o.risk ? `aside risk: ${o.risk}` : null,
        o.form ? `new form: ${o.form}` : null,
        o.advances ? `moves: ${o.advances}` : null,
        o.outfit ? `changes into: ${o.outfit}` : null,
        t.retried ? `retried once${t.firstProblems ? ` (first draft: ${t.firstProblems.join("; ")})` : ""}` : null,
      ].filter(Boolean).join(" · ")),
      Speech.available() ? h("button", { class: "run-btn ghost", onclick: () => (Speech.unlock(), campRead([t])) }, "Read aloud") : null,
      t.input ? fold(`${camp.reveal || !t.as ? c.name : roster[t.as].name}'s input · ${(t.input.length / 1024).toFixed(1)} KB`, t.input) : null,
      fold("Raw output", json(o)),
    );
  });
  const scene = h(
    "section",
    { class: "case" },
    h("h2", {}, "The scene"),
    lines.length ? lines : h("p", { class: "look" }, "Nothing yet. Say something to start."),
    to,
    box,
    h("div", { class: "row" }, send, status, sample ? null : h("span", { class: "status" }, "Open on claude.ai to talk.")),
  );
  return [setup, ...cards, scene];
}

start();
