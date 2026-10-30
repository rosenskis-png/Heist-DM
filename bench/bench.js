// The Phase 2 judgment test bench (docs/roadmap.md). Runs the real prompts in prompts/ on the hand-written
// cases in fixtures/bench/cases.json through `sample`, shows each call's input and output, and saves every
// run and note to the artifact's db so the design thread can read them.
import { validate } from "../src/validate.js";
import { stepSchema, pricingSchema, worldSchema, narrationSchema, companionSchema, rulingSchema } from "../schemas/index.js";
import { classes } from "../content/classes.js";
import { pairs } from "../content/pairs.js";
import * as A from "../src/context.js";
import { load as loadEncounter, checkSteps } from "../src/engine/index.js";
import { flagKeys } from "../src/engine/plan.js";
import * as C from "./checks.js";

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
  { id: "step", label: "Steps", schema: stepSchema },
  { id: "pricing", label: "Pricing", schema: pricingSchema },
  { id: "world", label: "World", schema: worldSchema },
  { id: "narration", label: "Narration", schema: narrationSchema },
  { id: "huddle", label: "Huddle", schema: companionSchema, call: "companion" },
  { id: "ruling", label: "Rulings", schema: rulingSchema },
];
const PROMPTS = ["style", "step", "pricing", "world", "narration", "companion", "ruling"];
const TIERS = ["quick", "default", "complex"];
const DEFAULT_TIERS = { step: "default", pricing: "default", world: "default", narration: "default", companion: "default", ruling: "quick", grader: "quick" };
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
  const code = ["src/context.js", "bench/checks.js"];
  const texts = await Promise.all([...sources, ...code].map(text));
  const [packet, cases] = texts.slice(0, 2).map(JSON.parse);
  const prompts = texts.slice(2, sources.length);
  // The bench version: a fingerprint of every prompt, case and check, so runs from older versions can be told apart.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texts.join("\0")));
  version = [...new Uint8Array(digest).slice(0, 4)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const cls = classes[cases.player_class];
  const party = [{ id: "player", name: cls.name, role: "The player", skills: cls.mods, abilities: cls.abilities }];
  for (const id of cases.party.filter((p) => p !== "player"))
    party.push((await import(url(`content/companions/${id}.js`))).default);
  const { map, people } = packet;
  const sched = people.find((p) => p.schedule)?.schedule;
  env = {
    packet,
    cases,
    act: cases.act,
    party,
    companions: party.slice(1),
    prompts: Object.fromEntries(PROMPTS.map((n, i) => [n, prompts[i]])),
    exceptions: new Set(),
    ids: new Set([...map.zones, ...map.connections, ...map.things, ...map.facts, ...people, ...party].map((x) => x.id).concat("party")),
    connections: new Map(map.connections.map((c) => [c.id, c])),
    people: new Set(people.map((p) => p.id)),
    hiddenTerms: cases.hidden_terms,
    beatAt: (t) => (sched ? { [people.find((p) => p.schedule).id]: sched.beats[(t + sched.phase) % sched.period].id } : {}),
    state: loadEncounter({ packet, party }),
    pairFor: (a, others) => others.map((b) => pairs[`${a}|${b}`] ?? pairs[`${b}|${a}`]).find(Boolean) ?? null,
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
async function ask(input, schema, tier, engine = () => []) {
  const opts = () => ({ modelTier: tier, cache: false, signal: controller.signal });
  return slot(async () => {
    const t0 = performance.now();
    // One backoff on rate_limited, never a loop.
    const call = (x) =>
      sample.json(x, opts()).catch(async (e) => {
        if (e?.code !== "rate_limited") throw e;
        await new Promise((r) => setTimeout(r, 15000));
        return sample.json(x, opts());
      });
    let out = await call(input);
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
      out = await call(turns);
      errors = validate(schema, out);
      if (!errors.length) errors = engine(out);
    }
    return { out, errors, retried, first, ms: Math.round(performance.now() - t0), inputChars: input.length };
  });
}

const errorText = (e) => (e?.code ? `${e.code}: ${e.message}` : String(e?.message ?? e));

async function runOne(kind, c) {
  const k = KINDS.find((x) => x.id === kind);
  const tier = settings.tiers[k.call ?? kind];
  const run = { kind, case: c.id, tier, at: Date.now(), version };
  try {
    if (kind === "huddle") return Object.assign(run, await runHuddle(c, k.schema, tier));
    const input = A[`${kind}Input`](env, c, k.schema);
    // A named route that fails only on size goes to the ruling call (D55), not back to the step call.
    const engine =
      kind === "step"
        ? (o) => engineSteps(o).errors
        : kind === "world"
          ? (o) => C.unknownFlags(o.actions, flagKeys(env.state)).map((f) => `unknown flag ${f}`)
          : undefined;
    const r = await ask(input, k.schema, tier, engine);
    Object.assign(run, r, { input });
    if (kind === "step" && !r.errors.length) run.rulings = await rule(engineSteps(r.out).fits);
    if (r.errors.length) run.checks = [{ name: "Valid after one retry", ok: false, detail: r.errors.slice(0, 5).join("; ") }];
    else if (kind === "pricing") Object.assign(run, C.pricingChecks(r.out, c, env));
    else run.checks = C[`${kind}Checks`](r.out, c, { ...env, engineSteps });
    for (const x of run.rulings ?? []) run.checks.push({ name: `Ruling: ${x.who} through ${x.connection}`, ok: "info", detail: `${x.answer}: ${x.text}` });
    run.checks.unshift({ name: "Valid first time", ok: !r.first, detail: r.first ? r.first.slice(0, 5).join("; ") : "" });
  } catch (e) {
    run.error = errorText(e);
  }
  return run;
}

// The engine's check of a step call's output, with the rulings granted so far (D55).
const engineSteps = (out) => checkSteps({ ...env.state, exceptions: [...env.exceptions] }, out);

// Size conflicts on named routes, each put to the ruling call as one neutral question (D55).
async function rule(fits) {
  const seen = new Set();
  const out = [];
  for (const fit of fits) {
    const key = `${fit.who}|${fit.connection}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const r = await ask(A.rulingInput(env, fit), rulingSchema, settings.tiers.ruling);
      out.push({ ...fit, ...r.out });
    } catch (e) {
      out.push({ ...fit, answer: "error", text: errorText(e) });
    }
  }
  return out;
}

// The huddle: each companion in turn sees the one candidate picked for the companion before her (D40).
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
    const pick = Math.floor(Math.random() * 3);
    const picked = r.out.candidates?.[pick];
    if (picked?.message) huddle.push({ from: self.id, text: picked.message });
    const checks = r.errors.length ? [{ name: "Matches the schema", ok: false, detail: r.errors.slice(0, 5).join("; ") }] : C.companionChecks(r.out);
    turns.push({ id: self.id, name: self.name, input, out: r.out, errors: r.errors, retried: r.retried, pick, checks });
  }
  const run = { turns, ms, inputChars };
  if (c.flaws) {
    const said = turns.flatMap((t) => (t.out.candidates ?? []).map((x) => x.message));
    try {
      const g = await slot(() =>
        sample.json(A.graderInput(c.flaws, said), { modelTier: settings.tiers.grader, cache: false, signal: controller.signal }),
      );
      let i = 0;
      for (const t of turns) t.caught = (t.out.candidates ?? []).map(() => g.caught?.[i++] ?? []);
    } catch (e) {
      run.graderError = errorText(e);
    }
  }
  run.checks = turns.flatMap((t) => t.checks.map((x) => ({ ...x, name: `${t.name}: ${x.name}` })));
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
  const body = run.turns ? { ...run, turns: run.turns.map(strip) } : strip(run);
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
        let any = 0;
        for (const r of hud) {
          const t = r.turns.find((x) => x.id === comp.id);
          if (!t) continue;
          if (t.caught[t.pick]?.includes(f.id)) picked++;
          if (t.caught.some((ids) => ids.includes(f.id))) any++;
        }
        const tag = f.hunch_of.includes(comp.id) ? " hunch" : f.misses_of.includes(comp.id) ? " misses" : "";
        return h("td", { class: tag.trim() }, `${picked}/${hud.length}`, h("small", {}, ` (any ${any})`));
      }),
    ),
  );
  return h(
    "div",
    { class: "scroll" },
    h(
      "table",
      { class: "flaws" },
      h("caption", {}, "Holes caught in the line actually said (in any of her three). Shaded: her hunch points at it; outlined: her blind spot."),
      h("tr", {}, h("th", {}), ...c.flaws.map((f) => h("th", { title: f.text }, f.id))),
      ...rows,
    ),
  );
}

const json = (v) => JSON.stringify(v, null, 1);
const fold = (label, body) => h("details", { class: "fold" }, h("summary", {}, label), h("pre", {}, body));

function readable(kind, c, run) {
  const o = run.out;
  if (!o) return null;
  if (kind === "step")
    return h(
      "ol",
      { class: "steps" },
      (o.steps ?? []).map((s) =>
        h(
          "li",
          {},
          s.summary,
          s.when ? h("span", { class: "tag" }, `when ${json(s.when.until).replace(/\s+/g, "")}`) : null,
          s.if ? h("span", { class: "tag warn" }, `if ${json(s.if).replace(/\s+/g, "")}`) : null,
        ),
      ),
      (o.rulings ?? []).map((r) => h("li", { class: "ruling" }, `${r.answer}: ${r.text}`)),
    );
  if (kind === "pricing") {
    const sum = new Map(c.step_call.steps.map((s) => [s.n, s.summary]));
    return h(
      "div",
      { class: "scroll" },
      h(
        "table",
        { class: "card" },
        (o.steps ?? []).map((s) => {
          const b = run.bands?.find((x) => x.n === s.n);
          return h(
            "tr",
            {},
            h("td", { class: "n" }, s.n),
            h(
              "td",
              {},
              h("div", { class: "what" }, sum.get(s.n) ?? ""),
              s.risks.map((r) => h("div", { class: "risk" }, h("b", {}, r.difficulty.replace("_", " ")), ` ${r.reason}`, h("div", { class: "fail" }, `If it fails: ${r.on_fail.summary}`))),
              s.mitigations.map((m) => h("div", { class: "mit" }, `${m.covers}: automatic (${m.by}) ${m.note}`)),
            ),
            h("td", { class: "band" }, b ? chip(b.ok, b.got.replace("_", " "), b.ok === true ? "" : `expected ${b.want}`) : ""),
          );
        }),
      ),
    );
  }
  if (kind === "world")
    return h("ul", { class: "acts" }, (o.actions ?? []).length ? o.actions.map((a) => h("li", {}, h("b", {}, a.npc), ` ${a.because}`, h("code", {}, JSON.stringify(a.ops)))) : h("li", {}, "Nobody acts."));
  if (kind === "ruling") return h("p", { class: "prose" }, h("b", {}, `${o.answer}: `), o.text);
  if (kind === "narration")
    return h("div", { class: "prose" }, (o.text ?? "").split(/\n+/).map((p) => h("p", {}, p)), o.texture?.length ? h("p", { class: "texture" }, `Texture: ${o.texture.join(" · ")}`) : null);
  return null;
}

function huddleView(c, run) {
  return run.turns.map((t) =>
    h(
      "div",
      { class: "turn" },
      h("div", { class: "who" }, t.name),
      (t.out.candidates ?? []).map((x, i) =>
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

function renderRuns(kind, c, ui) {
  const runs = results[`${kind}-${c.id}`] ?? [];
  // Only runs from this version of the bench count; older ones stay visible, dimmed.
  const now = runs.filter((r) => r.version === version);
  ui.summary.replaceChildren(...summarize(now), ...(now.length < runs.length ? [h("span", { class: "status" }, `${runs.length - now.length} from older versions`)] : []));
  const table = c.flaws ? flawTable(c, now) : null;
  ui.flaws.replaceChildren(...(table ? [table] : []));
  ui.runs.replaceChildren(
    ...runs.map((run, i) => {
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
            kind === "huddle" ? huddleView(c, run) : readable(kind, c, run),
            run.input ? fold(`Input · ${(run.input.length / 1024).toFixed(1)} KB`, run.input) : null,
            run.out ? fold("Raw output", json(run.out)) : null,
          );
      return h("details", { class: `run${run.version !== version ? " old" : ""}`, open: i === 0 && !run.saved }, head, body);
    }),
  );
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
    c.plan ? h("blockquote", {}, c.plan) : null,
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
    const c = env.cases[k.id][0];
    const input =
      k.id === "huddle"
        ? A.companionInput(env, c, env.companions[0], env.companions.slice(1), c.huddle, k.schema)
        : A[`${k.id}Input`](env, c, k.schema);
    return h("li", {}, `${k.label}: ${(input.length / 1024).toFixed(1)} KB input, prompt ${(env.prompts[k.call ?? k.id].length / 1024).toFixed(1)} KB`);
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

let current = store.get("bench.tab", "pricing");
function show(tab) {
  current = tab;
  store.set("bench.tab", tab);
  for (const b of document.querySelectorAll("nav button")) b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
  const main = $("#cases");
  if (tab === "settings") return main.replaceChildren(settingsView());
  main.replaceChildren(...env.cases[tab].map((c) => caseCard(tab, c)));
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

start();
