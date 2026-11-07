// The Forge: the designer's bench for the generator (docs/spec/generation.md). Two tabs on the real code and prompts.
// Adventure: a vibe and two companions through the pitch call, shown as the DM sees the world and as the player reads
// the pitch. Rooms: on that adventure's world, a kind of room, any seed axes pinned, and a brief (D154), through the
// real pipeline (`seedRoom`, then `designRoom`: sketch, encode, layout, D156), every stage shown as it lands; a room
// whose encode failed can be resumed from its sketch. Every adventure and room, with the designer's notes, is saved to the artifact's db for the design thread.
import { companions as authored } from "../content/companions/index.js";
import { classes } from "../content/classes.js";
import { setting } from "../content/setting.js";
import { motifs } from "../content/motifs.js";
import { worldOf, pitchSeed } from "../src/campaign/world.js";
import { partyFor } from "../src/game/session.js";
import { newCampaign } from "../src/campaign/run.js";
import { TONES, XFACTORS, SHAPES, CORES, PRIZES } from "../src/campaign/seed.js";
import { seedRoom, designRoom } from "../src/game/generate.js";
import { pitchCall } from "../src/calls/pitch.js";
import { tierFor, SPEEDS, CallFailed } from "../src/ask.js";
import { ROOM_KINDS } from "../src/context.js";

const url = (p) => new URL(`../${p}`, import.meta.url);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
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
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const errorText = (e) => (e?.code ? `${e.code}: ${e.message}` : String(e?.message ?? e));
const json = (x) => JSON.stringify(x, null, 2);
const paras = (t = "") => String(t).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
const prose = (t) => h("div", { class: "prose" }, paras(t).map((p) => h("p", {}, p)));
const fold = (label, text) => h("details", { class: "fold" }, h("summary", {}, label), h("pre", {}, text));
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const when = (t) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const kv = (pairs) => h("dl", { class: "kv" }, pairs.filter(([, v]) => v != null && v !== "").map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, typeof v === "object" && !v.nodeType ? json(v) : v))));
// Every field of an object but its id, in order, for shapes that grow (people, things, connections).
const fields = (o, skip = []) => kv(Object.entries(o).filter(([k]) => k !== "id" && !skip.includes(k)).map(([k, v]) => [k.replaceAll("_", " "), v]));

const KINDS = ["encounter", "quiet", "oddity", "merchant", "campfire", "climax", "sanctuary"];
const CHALLENGED = ["encounter", "climax"];
const PROMPTS = ["pitch", "sketch", "encode"];

// ---------- state ----------

const S = {
  tab: store.get("forge.tab", "adventure"),
  setup: { a: "fern", b: "nadia", cls: "rogue", vibe: "", ...store.get("forge.setup", {}) },
  speed: store.get("forge.speed", "balanced"),
  adventures: store.get("forge.adventures", []),
  current: store.get("forge.current", null),
  room: { kind: "encounter", act: 1, tone: "", xFactor: "", shape: "", core: "", prize: "", spotlight: "", factions: [], motifs: [], arrives: "", brief: "", ...store.get("forge.room", {}) },
  rooms: store.get("forge.rooms", []),
  busy: null, // what's running, for the status line
  calls: {}, // run id -> the call records (inputs and outputs), this page load only
};
const save = () => {
  store.set("forge.tab", S.tab);
  store.set("forge.setup", S.setup);
  store.set("forge.speed", S.speed);
  store.set("forge.current", S.current);
  store.set("forge.room", S.room);
  store.set("forge.adventures", S.adventures.slice(0, 30));
  store.set("forge.rooms", S.rooms.slice(0, 40));
};

let env, sample, db;
let controller = new AbortController();

const GRAVENHOLD = () => ({ id: "gravenhold", at: 0, vibe: null, companions: [S.setup.a, S.setup.b], cls: S.setup.cls, pitch: null, world: worldOf() });
const currentAdventure = () => (S.current === "gravenhold" || !S.current ? GRAVENHOLD() : S.adventures.find((a) => a.id === S.current) ?? GRAVENHOLD());

// The db keeps every adventure and room whole, with the call inputs, for the design thread to read. Fire and forget.
async function persist(collection, rec) {
  if (!db) return;
  try {
    let body = JSON.stringify(rec);
    if (body.length > 240000) body = JSON.stringify({ ...rec, calls: (rec.calls ?? []).map(({ input, ...r }) => ({ ...r, inputDropped: input?.length })) });
    await db.collection(collection).doc(rec.id).set({ at: rec.at, data: body.slice(0, 250000) });
  } catch (e) {
    console.warn("db", e);
  }
}

function ioFor(id) {
  S.calls[id] = [];
  return {
    sample,
    speed: S.speed,
    signal: controller.signal,
    onStart: (call) => ((S.busy = `Running the ${call} call (${tierFor(call, S.speed)})…`), render()),
    onCall: (rec) => S.calls[id].push(rec),
  };
}
const slim = (records) => records.map(({ input, ...r }) => ({ ...r, inputSize: r.size }));

// ---------- the adventure ----------

async function pitch(another) {
  const { a, b, vibe, cls } = S.setup;
  const id = newId();
  const io = ioFor(id);
  const rejected = another ? S.adventures.filter((x) => x.companions.join() === [a, b].join() && x.pitch).slice(0, 3).map((x) => x.pitch) : [];
  S.busy = "Imagining the adventure…";
  S.error = null;
  render();
  const seed = pitchSeed((Math.random() * 2 ** 31) >>> 0);
  const rec = { id, at: Date.now(), vibe: vibe.trim(), companions: [a, b], cls, rejected: rejected.length, seed, note: "" };
  try {
    const out = await pitchCall(io, env, { companions: [authored[a], authored[b]], vibe: vibe.trim(), rejected, seed });
    Object.assign(rec, { pitch: out.pitch, world: out.world });
    S.adventures.unshift(rec);
    S.current = id;
  } catch (e) {
    S.error = { text: errorText(e), records: e instanceof CallFailed ? [e.record] : S.calls[id] };
  }
  S.busy = null;
  rec.calls = S.calls[id];
  if (rec.world) persist("adventures", rec);
  save();
  render();
}

function adventureTab() {
  const ids = Object.keys(authored);
  const pick = (key, label) =>
    h("label", { class: "field" }, label,
      h("select", { id: `pick-${key}`, onchange: (e) => ((S.setup[key] = e.target.value), save(), render()) },
        ids.map((id) => h("option", { value: id, selected: S.setup[key] === id }, `${authored[id].name} · ${authored[id].role}`))));
  const same = S.setup.a === S.setup.b;
  const vibe = h("textarea", { id: "vibe", rows: 3, placeholder: "trapped in a creepy noble's masquerade, gothic and eldritch", oninput: (e) => ((S.setup.vibe = e.target.value), save()) });
  vibe.value = S.setup.vibe;
  const canRun = sample && !S.busy && !same;
  const hasPrior = S.adventures.some((x) => x.companions.join() === [S.setup.a, S.setup.b].join());
  const setup = h("section", { class: "card" },
    h("h2", {}, "A campaign from a vibe"),
    h("p", { class: "muted small" }, "The pitch call writes the world for these two companions: the place, its heart, factions and tensions, the five acts, the player's secrets. Leave the vibe empty to be surprised."),
    h("div", { class: "grid2" }, pick("a", "First companion"), pick("b", "Second companion"),
      h("label", { class: "field" }, "Player class",
        h("select", { id: "pick-cls", onchange: (e) => ((S.setup.cls = e.target.value), save()) }, Object.keys(classes).map((k) => h("option", { value: k, selected: S.setup.cls === k }, classes[k].name ?? k))))),
    h("label", { class: "field" }, "The vibe", vibe),
    h("div", { class: "row" },
      h("button", { class: "go", disabled: !canRun, onclick: () => pitch(false) }, "Pitch an adventure"),
      hasPrior ? h("button", { class: "plain", disabled: !canRun, onclick: () => pitch(true) }, "Pitch another, unlike the last") : null,
      h("button", { class: "plain", onclick: () => ((S.current = "gravenhold"), save(), render()) }, "Use Gravenhold"),
      S.busy ? h("span", { class: "status" }, S.busy) : null,
      same ? h("span", { class: "err" }, "Choose two different companions.") : null,
      sample ? null : h("span", { class: "status" }, "Open on claude.ai to run calls."),
    ),
    S.error ? errorView(S.error) : null,
  );
  const adv = currentAdventure();
  return [setup, adventureView(adv), historyView()];
}

function errorView({ text, records = [] }) {
  return h("div", { class: "sub" }, h("p", { class: "err" }, text), records.filter(Boolean).map(recordView));
}

function recordView(r) {
  const chips = [
    h("span", { class: "chip" }, `${r.call} · ${r.tier}`),
    r.size ? h("span", { class: `chip ${r.over ? "near" : ""}` }, `in ${kb(r.size)}${r.over ? ` · over ${kb(r.over)} budget` : ""}`) : null,
    r.ms ? h("span", { class: "chip" }, `${(r.ms / 1000).toFixed(1)} s`) : null,
    r.firstErrors ? h("span", { class: "chip near" }, "retried once") : null,
    r.errors?.length ? h("span", { class: "chip bad" }, `${r.errors.length} problems`) : null,
    r.error ? h("span", { class: "chip bad" }, r.error) : null,
  ];
  return h("div", { class: "sub" }, h("div", { class: "row" }, chips),
    r.firstErrors ? fold(`First attempt's problems (${r.firstErrors.length})`, r.firstErrors.join("\n")) : null,
    r.errors?.length ? fold(`Remaining problems (${r.errors.length})`, r.errors.join("\n")) : null,
    r.input ? fold(`Input · ${kb(r.size)}`, r.input) : h("p", { class: "muted small" }, "The input was shown when it ran; it's in the db, not kept on this page."),
    r.first && r.firstErrors ? fold("First output", json(r.first)) : null,
    r.out ? fold("Output", json(r.out)) : null);
}

function adventureView(adv) {
  const w = adv.world;
  const names = adv.companions.map((id) => authored[id]?.name ?? id);
  const needs = Object.fromEntries(adv.companions.flatMap((id) => (authored[id]?.needs ?? []).map((k) => [k, authored[id].name])));
  const player = adv.pitch
    ? h("div", { class: "pitch" }, h("span", { class: "eyebrow" }, "What the player reads"), h("h2", {}, w.name), paras(adv.pitch).map((t) => h("p", {}, t)))
    : h("div", { class: "pitch" }, h("span", { class: "eyebrow" }, "The default world"), h("h2", {}, w.name), h("p", {}, "Gravenhold is hand-written, so it has no pitch. Pitch an adventure above to see one."));
  const factions = Object.entries(w.factions).map(([k, f]) =>
    h("div", { class: "sub" }, h("h4", {}, f.name, " ", h("span", { class: "chip" }, k)), kv([["Short", f.short], ["Who", f.desc], ["Behaviour", f.rules], ["Wants", f.goal], ["Boss", f.boss]])));
  const acts = w.acts.map((a, i) =>
    h("li", {}, h("span", { class: "actn" }, i + 1),
      h("div", { class: "sub" }, h("h4", {}, a.name, " ", h("span", { class: "chip accent" }, `${setting.arc[i].act} · ${setting.arc[i].legs} legs`)),
        kv([["Goal", a.goal], ["How it plays", a.mechanics], ["Sanctuary", a.sanctuary], ["Player's secret", setting.playerSecretReveal?.[i + 1]]]))));
  const dm = h("section", { class: "card" },
    h("span", { class: "dm-tag" }, "DM-facing · the campaign's shape"),
    h("h2", {}, w.name),
    h("div", { class: "row" }, h("span", { class: "chip" }, `for ${names.join(" & ")}`), adv.vibe != null ? h("span", { class: "chip" }, adv.vibe ? `vibe: ${adv.vibe}` : "no vibe") : null, adv.at ? h("span", { class: "chip" }, when(adv.at)) : null),
    h("h3", {}, "The place"), kv([["Place", w.place], ["The way out", w.escape], ["Life", w.life]]),
    h("h3", {}, "The heart"), prose(w.heart),
    h("h3", {}, "Tensions"), h("ul", { class: "plain" }, w.tensions.map((t) => h("li", {}, t))),
    h("h3", {}, "Factions"), h("div", { class: "grid2" }, factions),
    h("h3", {}, "The five acts"), h("ol", { class: "acts" }, acts),
    w.openAct ? [h("h3", {}, "The open act"), kv([["From act", w.openAct.min], ["Goal", w.openAct.goal], ["How it plays", w.openAct.mechanics], ["Sanctuary", w.openAct.sanctuary]])] : null,
    adv.seed ? [h("h3", {}, "The seed it answered"), kv([["The heart is", adv.seed.heart], ["Secret kinds", h("ul", { class: "plain" }, adv.seed.secrets.map((t) => h("li", {}, t)))]])] : null,
    h("h3", {}, "The player's secrets"), h("ul", { class: "plain" }, w.playerSecrets.map((t) => h("li", {}, t))),
    h("h3", {}, "Features the companions' stories use"),
    kv(Object.entries(w.features).map(([k, v]) => [`${k.replaceAll("_", " ")}${needs[k] ? ` (${needs[k]})` : ""}`, v])),
    h("h3", {}, "Kinds of room"), kv([["Exploration", w.roomKinds.exploration], ["Social", w.roomKinds.social], ["Respite", w.roomKinds.respite]]),
    h("h3", {}, "Role nouns in companion text"), kv(Object.entries(w.roles).map(([k, v]) => [k.replaceAll("_", " "), v])),
    h("h3", {}, "World facts"), h("ul", { class: "plain" }, w.invariants.map((i) => h("li", {}, i.fromAct ? h("span", { class: "chip" }, `from act ${i.fromAct}`) : null, i.fromAct ? " " : null, i.text))),
    adv.id !== "gravenhold" ? noteBox("adventures", adv) : null,
    S.calls[adv.id]?.length ? S.calls[adv.id].map(recordView) : null,
    fold("The world as data", json(w)),
    h("div", { class: "row" }, h("button", { class: "go", onclick: () => ((S.tab = "rooms"), save(), render()) }, "Design rooms in this world")),
  );
  return [player, dm];
}

function noteBox(collection, rec) {
  const box = h("textarea", { id: `note-${rec.id}`, rows: 2, placeholder: "What works, what doesn't. Saved for the design thread." });
  box.value = rec.note ?? "";
  box.addEventListener("change", () => {
    rec.note = box.value;
    save();
    if (db) db.collection(collection).doc(rec.id).update({ note: rec.note, noteAt: Date.now() }).catch(() => persist(collection, rec));
  });
  return h("label", { class: "field" }, "Your notes", box);
}

function historyView() {
  if (!S.adventures.length) return null;
  return h("section", { class: "card" }, h("h3", {}, "Earlier adventures"),
    h("div", { class: "history" },
      h("button", { class: "hist", "aria-pressed": String(S.current === "gravenhold" || !S.current), onclick: () => ((S.current = "gravenhold"), save(), render()) }, h("span", { class: "t" }, "Gravenhold"), h("span", { class: "chip" }, "default")),
      S.adventures.map((a) =>
        h("button", { class: "hist", "aria-pressed": String(S.current === a.id), onclick: () => ((S.current = a.id), save(), render()) },
          h("span", { class: "t" }, h("b", {}, a.world.name), a.vibe ? ` · ${a.vibe}` : ""),
          h("span", { class: "chip" }, a.companions.map((id) => authored[id]?.name ?? id).join(" & ")),
          h("span", { class: "chip" }, when(a.at))))));
}

// ---------- rooms ----------

// The pins that apply to this kind of room in this world (D159): a motif that doesn't suit the kind, a faction the world
// doesn't have, or an axis the kind doesn't take is never sent, and never shown as pinned.
function pinsFor(adv, r) {
  const challenged = CHALLENGED.includes(r.kind);
  const p = {};
  if (TONES.includes(r.tone)) p.tone = r.tone;
  if ((challenged || r.kind === "oddity") && XFACTORS.includes(r.xFactor)) p.xFactor = r.xFactor;
  if (challenged && SHAPES.includes(r.shape)) p.shape = r.shape;
  if (challenged && CORES.includes(r.core)) p.core = r.core;
  if (challenged && PRIZES.includes(r.prize)) p.prize = r.prize;
  if ((r.kind === "climax" ? ["both"] : ["companion_a", "companion_b", "none"]).includes(r.spotlight)) p.spotlight = r.spotlight;
  const fs = challenged ? r.factions.filter((f) => adv.world.factions[f]) : [];
  if (fs.length) p.factions = fs;
  const ms = r.motifs.filter((id) => motifs.find((m) => m.id === id)?.kinds.includes(r.kind));
  if (ms.length) p.motifs = ms;
  return p;
}

// The seed exactly as the game draws it for a room of this kind in this act, then with whatever the designer pinned.
function seedWith(adv, r) {
  let camp = newCampaign({ act: r.act, seed: (Math.random() * 2 ** 31) >>> 0 });
  // The act's motifs used so far on this bench, so successive rooms vary as they would across an act.
  const used = S.rooms.filter((x) => x.adventure === adv.id && x.act === r.act).flatMap((x) => x.seed?.motifs?.map((m) => m.id) ?? []);
  camp = { ...camp, used, way: { ...camp.way, here: r.kind } };
  const { seed } = seedRoom(camp, adv.world);
  const p = pinsFor(adv, r);
  for (const k of ["tone", "xFactor", "shape", "core", "prize", "factions"]) if (p[k]) seed[k] = p[k];
  if (p.spotlight) seed.spotlight = p.spotlight === "none" ? null : p.spotlight;
  if (p.motifs) seed.motifs = p.motifs.map((id) => motifs.find((m) => m.id === id));
  return seed;
}

async function designOne() {
  const adv = currentAdventure();
  const r = structuredClone(S.room);
  const id = newId();
  const seed = seedWith(adv, r);
  const run = { id, at: Date.now(), adventure: adv.id, worldName: adv.world.name, companions: adv.companions, kind: r.kind, act: r.act, brief: r.brief.trim(), arrives: r.arrives.trim(), pinned: pinsFor(adv, r), seed, stages: {}, note: "" };
  S.rooms.unshift(run);
  S.calls[id] = [];
  await runRoom(run, adv);
}

// Runs the room's pipeline; with a sketch already written, from the encode on.
async function runRoom(run, adv) {
  const earlier = S.calls[run.id] ?? [];
  const io = { ...ioFor(run.id), onStage: (name, value) => ((run.stages[name] = value), render()) };
  S.calls[run.id] = earlier;
  const t0 = Date.now();
  delete run.error;
  delete run.failedCall;
  S.busy = run.stages.sketch ? "Encoding the sketch…" : "Designing the room…";
  render();
  const party = partyFor({ name: "The player", class: adv.cls ?? S.setup.cls }, adv.companions, adv.world);
  try {
    await designRoom(io, env, { seed: run.seed, world: adv.world, party, handoff: run.arrives ? { stub: run.arrives, conditions: [] } : null, log: [], brief: run.brief || null, sketch: run.stages.sketch });
  } catch (e) {
    run.error = errorText(e);
    if (e instanceof CallFailed) run.failedCall = e.call;
  }
  S.busy = null;
  run.ms = (run.ms ?? 0) + Date.now() - t0;
  run.calls = [...(run.calls ?? []).filter((c) => !S.calls[run.id].some((x) => x.at === c.at)), ...slim(S.calls[run.id])];
  persist("rooms", { ...run, calls: S.calls[run.id] });
  save();
  render();
}


function roomsTab() {
  const adv = currentAdventure();
  const r = S.room;
  // Clear pins this kind or world can't take, so nothing hidden rides along (D159).
  const fitting = pinsFor(adv, r);
  r.motifs = fitting.motifs ?? [];
  if (CHALLENGED.includes(r.kind)) r.factions = fitting.factions ?? [];
  for (const k of ["tone", "shape", "core", "prize", "spotlight"]) if (r[k] && !fitting[k]) r[k] = "";
  const set = (k, v) => ((S.room[k] = v), save(), render());
  const sel = (k, label, options, { random = "Random, as the game draws it" } = {}) =>
    h("label", { class: "field" }, label,
      h("select", { id: `room-${k}`, onchange: (e) => set(k, k === "act" ? Number(e.target.value) : e.target.value) },
        random ? h("option", { value: "", selected: !r[k] }, random) : null,
        options.map(([v, l]) => h("option", { value: v, selected: String(r[k]) === String(v) }, l))));
  const challenged = CHALLENGED.includes(r.kind);
  const fits = motifs.filter((m) => m.kinds.includes(r.kind));
  const factionIds = Object.keys(adv.world.factions);
  const toggle = (k, v) => set(k, r[k].includes(v) ? r[k].filter((x) => x !== v) : [...r[k], v]);
  const brief = h("textarea", { id: "room-brief", rows: 3, placeholder: "A flooded chapel where the choir is still singing; someone in it knows the way down", oninput: (e) => ((S.room.brief = e.target.value), save()) });
  brief.value = r.brief;
  const arrives = h("input", { type: "text", id: "room-arrives", placeholder: "Optional: the stub of the exit they came through", oninput: (e) => ((S.room.arrives = e.target.value), save()) });
  arrives.value = r.arrives;
  const controls = h("section", { class: "card" },
    h("h2", {}, "A room in ", adv.world.name),
    h("p", { class: "muted small" },
      `For ${adv.companions.map((id) => authored[id]?.name ?? id).join(" & ")}. `,
      h("button", { class: "plain", onclick: () => ((S.tab = "adventure"), save(), render()) }, "Change adventure")),
    h("div", { class: "grid2" },
      sel("kind", "Kind of room", KINDS.map((k) => [k, `${k}${ROOM_KINDS.includes(k) ? " (a room, no objective)" : ""}`]), { random: null }),
      sel("act", "Act", adventureActs(adv), { random: null }),
      sel("tone", "Tone", TONES.map((t) => [t, t])),
      challenged || r.kind === "oddity" ? sel("xFactor", "X-factor", XFACTORS.map((t) => [t, t])) : null,
      challenged ? sel("shape", "Shape", SHAPES.map((t) => [t, t])) : null,
      challenged ? sel("core", "Built around", CORES.map((t) => [t, t])) : null,
      challenged ? sel("prize", "Prize", PRIZES.map((t) => [t, t])) : null,
      sel("spotlight", "Whose room it is", r.kind === "climax"
        ? [["both", "Both companions'"]]
        : [["companion_a", `${authored[adv.companions[0]]?.name ?? "First companion"}'s`], ["companion_b", `${authored[adv.companions[1]]?.name ?? "Second companion"}'s`], ["none", "No one's"]]),
    ),
    challenged
      ? h("div", { class: "field" }, h("span", { class: "muted small" }, "Factions in the room (none ticked: the game picks one or two)"),
        h("div", { class: "row" }, factionIds.map((f) => h("label", { class: "small" }, h("input", { type: "checkbox", id: `fac-${f}`, checked: r.factions.includes(f), onchange: () => toggle("factions", f) }), " ", adv.world.factions[f].name))))
      : null,
    h("div", { class: "field" }, h("span", { class: "muted small" }, `Motifs for a ${r.kind} (none ticked: the game draws ${challenged ? "two or three" : "one"})`),
      h("div", { class: "motifs" }, fits.map((m) => h("label", {}, h("input", { type: "checkbox", id: `motif-${m.id}`, checked: r.motifs.includes(m.id), onchange: () => toggle("motifs", m.id) }), h("span", {}, h("b", {}, m.name), h("span", { class: "muted" }, ` · ${m.decisions}`)))))),
    h("label", { class: "field" }, "Your brief: what this room should hold", brief),
    h("label", { class: "field" }, "How the party arrives", arrives),
    h("div", { class: "row" },
      h("button", { class: "go", disabled: !sample || !!S.busy, onclick: designOne }, "Design the room"),
      S.busy ? h("button", { class: "plain danger", onclick: () => (controller.abort(), (controller = new AbortController())) }, "Stop") : null,
      S.busy ? h("span", { class: "status" }, S.busy) : null,
      sample ? null : h("span", { class: "status" }, "Open on claude.ai to run calls."),
      h("span", { class: "status" }, "sketch, then encode · 2 calls")),
  );
  const mine = S.rooms.filter((x) => x.adventure === adv.id);
  const others = S.rooms.length - mine.length;
  return [controls, ...mine.map(roomView), others ? h("p", { class: "muted small" }, `${others} more rooms were designed in other adventures; switch adventure to see them.`) : null];
}

const adventureActs = (adv) => adv.world.acts.map((a, i) => [i + 1, `${i + 1}: ${a.name}`]);

function roomView(run) {
  const s = run.stages;
  const calls = S.calls[run.id] ?? run.calls ?? [];
  const head = h("div", { class: "row" },
    h("span", { class: "chip accent" }, run.kind), h("span", { class: "chip" }, `act ${run.act}`), h("span", { class: "chip" }, when(run.at)),
    run.ms ? h("span", { class: "chip" }, `${Math.round(run.ms / 1000)} s`) : null,
    run.error ? h("span", { class: "chip bad" }, `failed${run.failedCall ? ` at ${run.failedCall}` : ""}`) : s["laid out"] ? h("span", { class: `chip ${s["laid out"].mapped ? "ok" : "near"}` }, s["laid out"].mapped ? "laid out on the grid" : "no map: couldn't lay out") : h("span", { class: "chip near" }, "running"));
  return h("section", { class: "card" },
    h("h2", {}, s["laid out"]?.packet.name ?? s.encoded?.name ?? `A ${run.kind}`),
    head,
    seedView(run),
    s.sketch ? stage("Sketch", sketchView(s.sketch)) : null,
    s["laid out"] ? stage("The room as the DM gets it", packetView(s["laid out"].packet, s["laid out"].mapped), sizeChips(s["laid out"].packet)) : null,
    run.error ? h("p", { class: "err" }, run.error) : null,
    run.error && s.sketch && !s["laid out"]
      ? h("div", { class: "row" }, h("button", { class: "go", disabled: !sample || !!S.busy, onclick: () => runRoom(run, S.adventures.find((a) => a.id === run.adventure) ?? currentAdventure()) }, "Resume: encode this sketch"), h("span", { class: "status" }, "Keeps the sketch; runs only the encode call."))
      : null,
    stage("Calls", calls.length ? calls.map(recordView) : h("p", { class: "muted small" }, "None yet.")),
    noteBox("rooms", run),
  );
}

const stage = (title, body, chip) => h("div", { class: "stage" }, h("div", { class: "stage-head" }, h("h3", {}, title), chip), body);

function seedView(run) {
  const seed = run.seed;
  const pinned = run.pinned ?? {};
  const mark = (k, v) => (pinned[k] ? h("span", {}, v, " ", h("span", { class: "chip" }, "pinned")) : v);
  return stage("Seed", h("div", { class: "grid2" },
    kv([
      ["Tone", mark("tone", seed.tone)],
      ["X-factor", seed.xFactor && mark("xFactor", seed.xFactor)],
      ["Shape", seed.shape && mark("shape", seed.shape)],
      ["Built around", seed.core && mark("core", seed.core)],
      ["Prize", seed.prize && mark("prize", seed.prize)],
      ["Meaningful by", seed.meat],
      ["Factions", seed.factions && mark("factions", seed.factions.join(", "))],
      ["Whose room", mark("spotlight", seed.spotlight === "both" ? "both companions'" : seed.spotlight ? `${authored[run.companions?.[seed.spotlight === "companion_a" ? 0 : 1]]?.name ?? seed.spotlight}'s` : seed.spotlight === null ? "no one's" : null)],
      ["Exits lead to", seed.exits.length ? seed.exits.join(", ") : "nothing: the act ends"],
    ]),
    h("div", { class: "sub" }, h("span", { class: "muted small" }, pinned.motifs ? "Motifs (pinned)" : "Motifs"), seed.motifs.map((m) => h("p", { class: "small" }, h("b", {}, m.name), ": ", m.pattern))),
    run.brief ? h("div", { class: "sub" }, h("span", { class: "muted small" }, "Your brief"), h("p", {}, run.brief)) : null,
    run.arrives ? h("div", { class: "sub" }, h("span", { class: "muted small" }, "Arriving through"), h("p", {}, run.arrives)) : null));
}

// The sketch as a DM's prep note (D160). Rooms saved before it carry the old design statement and prose.
function sketchView(sk) {
  const list = (xs) => h("ul", { class: "plain" }, xs.map((o) => h("li", {}, o)));
  if (sk.design) {
    const d = sk.design;
    return h("div", { class: "stage" },
      kv([["Start", d.start], ["Goal", d.goal], ["Challenge", d.challenge], ["Outcomes", list(d.outcomes)], ["X-factor", d.x_factor], ["Pressure", d.pressure]]),
      prose(sk.sketch));
  }
  return h("div", { class: "stage" },
    kv([
      ["Premise", h("b", {}, sk.premise)],
      ["Shape", sk.shape],
      ["Things", h("span", {}, list(sk.things), h("span", { class: "chip" }, `${sk.things.length} things`))],
      ["Cut", sk.cut],
      ["Pressure", sk.pressure],
      ["Outcomes", list(sk.outcomes)],
      ["Notes", sk.notes],
    ]),
    h("span", { class: "muted small" }, "Opening, as sketched"),
    h("div", { class: "opening" }, sk.opening));
}

// How big the room came out, against what the sketch prompt asks (D156). Shown, never enforced.
function sizeChips(p) {
  const n = { zones: p.map.zones.length, people: p.people.length, things: p.map.things.length, events: p.clock?.events?.length ?? 0 };
  const over = { zones: 4, people: 3 };
  return h("span", { class: "row" }, Object.entries(n).map(([k, v]) => h("span", { class: `chip ${over[k] && v > over[k] ? "near" : ""}` }, `${v} ${k}`)));
}

function packetView(p, mapped) {
  const zoneName = (id) => p.map.zones.find((z) => z.id === id)?.name ?? id;
  const i = p.intent;
  return h("div", { class: "stage" },
    h("span", { class: "muted small" }, "What the player sees on arrival"),
    h("div", { class: "opening" }, p.opening),
    kv([
      ["Purpose", i.purpose],
      ["Objective", i.objective?.label ?? (p.mode === "room" ? "none: a room" : null)],
      ["Fail forward", i.fail_forward?.label],
      ["Alternates", i.alternates?.length ? h("ul", { class: "plain" }, i.alternates.map((x) => h("li", {}, x.label ?? x.id))) : null],
      ["Optional", i.optional?.length ? h("ul", { class: "plain" }, i.optional.map((x) => h("li", {}, x.label ?? x.id))) : null],
      ["Expected plans", i.expected_plans?.join("–")],
    ]),
    h("h3", {}, "Ways on"),
    h("ul", { class: "plain" }, (i.exits ?? []).map((e) => h("li", {}, h("span", { class: "chip accent" }, e.leads_to), " ", h("b", {}, zoneName(e.zone)), ": ", e.stub))),
    mapped ? h("div", { class: "map" }, mapSvg(p)) : h("p", { class: "status" }, "The layout couldn't place every connection, so this room ships without a map (D9)."),
    h("h3", {}, "Places"),
    h("div", { class: "scroll" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Zone"), h("th", {}, "Size"), h("th", {}, "Light"), h("th", {}, "What it is"))),
      h("tbody", {}, p.map.zones.map((z) => h("tr", {}, h("td", {}, h("b", {}, z.name), p.start.positions && Object.values(p.start.positions).includes(z.id) ? h("span", { class: "chip ok" }, " start") : null), h("td", { class: "num" }, sizeOf(z)), h("td", {}, z.light), h("td", {}, z.purpose)))))),
    h("h3", {}, "Connections"),
    h("div", { class: "scroll" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Connection"), h("th", {}, "Between"), h("th", {}, "Details"))),
      h("tbody", {}, p.map.connections.map((c) => h("tr", {}, h("td", {}, h("b", {}, c.name ?? c.id), " ", h("span", { class: "chip" }, c.kind)), h("td", {}, c.between.map(zoneName).join(" ↔ ")), h("td", { class: "small" }, Object.entries(c).filter(([k]) => !["id", "name", "kind", "between", "wall", "square"].includes(k)).map(([k, v]) => `${k.replaceAll("_", " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · "))))))),
    p.people.length ? [h("h3", {}, "People"), h("div", { class: "grid2" }, p.people.map((x) => h("div", { class: "sub" }, h("h4", {}, x.name, " ", x.tier ? h("span", { class: "chip" }, x.tier) : null), fields(x, ["name", "tier"]))))] : null,
    p.map.things.length ? [h("h3", {}, "Things"), h("div", { class: "grid2" }, p.map.things.map((t) => h("div", { class: "sub" }, h("h4", {}, t.name, t.price ? h("span", { class: "chip near" }, ` ${json(t.price)}`) : null), fields({ ...t, location: t.location?.zone ? zoneName(t.location.zone) : t.location?.held_by ?? t.location }, ["name", "price"]))))] : null,
    p.map.facts.length ? [h("h3", {}, "Facts"), h("ul", { class: "plain" }, p.map.facts.map((f) => h("li", {}, f.text, f.known === false ? h("span", { class: "chip near" }, " hidden") : null)))] : null,
    p.notes?.length ? [h("h3", {}, "DM notes"), h("ul", { class: "plain" }, p.notes.map((n) => h("li", {}, n)))] : null,
    p.clock?.events?.length || p.clock?.routines?.length ? fold("The clock", json(p.clock)) : null,
    fold("The packet as data", json(p)));
}

function sizeOf(z) {
  if (z.size) return `${z.size[0]}×${z.size[1]}`;
  if (!z.rects) return "";
  return z.rects.map((r) => `${r[2]}×${r[3]}`).join(" + ") + (z.level ? ` · level ${z.level}` : "");
}

// The laid-out room, one panel per level, a square to 18 px. Doors red, openings green.
function mapSvg(p) {
  const NS = "http://www.w3.org/2000/svg";
  const s = (tag, attrs = {}, text) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  };
  const Q = 18;
  const levels = [...new Set(p.map.zones.map((z) => z.level ?? 0))].sort((a, b) => a - b);
  const panels = levels.map((lv) => {
    const zones = p.map.zones.filter((z) => (z.level ?? 0) === lv && z.rects);
    const rects = zones.flatMap((z) => z.rects);
    const x0 = Math.min(...rects.map((r) => r[0])), y0 = Math.min(...rects.map((r) => r[1]));
    const x1 = Math.max(...rects.map((r) => r[0] + r[2])), y1 = Math.max(...rects.map((r) => r[1] + r[3]));
    return { lv, zones, x0, y0, w: x1 - x0, h: y1 - y0 };
  });
  const pad = 10, gap = 24, labelH = levels.length > 1 ? 16 : 0;
  const width = panels.reduce((t, q) => t + q.w * Q, 0) + gap * (panels.length - 1) + pad * 2;
  const height = Math.max(...panels.map((q) => q.h * Q)) + pad * 2 + labelH;
  const svg = s("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": `Map of ${p.name}` });
  let ox = pad;
  const starts = new Set(Object.values(p.start?.positions ?? {}));
  panels.forEach((q, pi) => {
    const tx = (x) => ox + (x - q.x0) * Q, ty = (y) => pad + labelH + (y - q.y0) * Q;
    if (labelH) svg.append(s("text", { x: ox, y: pad + 10 }, `level ${q.lv}`));
    q.zones.forEach((z, zi) => {
      for (const [x, y, w, hh] of z.rects) svg.append(s("rect", { x: tx(x), y: ty(y), width: w * Q, height: hh * Q, fill: zi % 2 ? "var(--map-zone2)" : "var(--map-zone)", stroke: "var(--map-edge)", "stroke-width": 1.5 }));
      const [x, y, w, hh] = z.rects[0];
      const words = z.name.replace(/^the /i, "");
      const max = Math.max(4, Math.floor((w * Q) / 6));
      svg.append(s("text", { x: tx(x) + 4, y: ty(y) + 13 }, words.length > max ? `${words.slice(0, max - 1)}…` : words));
      if (starts.has(z.id)) svg.append(s("circle", { cx: tx(x + w) - 8, cy: ty(y + hh) - 8, r: 4, fill: "var(--accent)" }));
    });
    for (const c of p.map.connections) {
      if (c.wall && c.between.some((id) => q.zones.some((z) => z.id === id))) {
        const [[ax, ay], [bx, by]] = c.wall;
        svg.append(s("line", { x1: tx(ax), y1: ty(ay), x2: tx(bx), y2: ty(by), stroke: c.kind === "door" ? "var(--map-door)" : "var(--map-open)", "stroke-width": 5, "stroke-linecap": "round" }, null));
      } else if (c.square && q.zones.some((z) => z.id === c.between[0])) {
        const [x, y] = c.square;
        svg.append(s("rect", { x: tx(x) + 4, y: ty(y) + 4, width: Q - 8, height: Q - 8, fill: "none", stroke: "var(--map-open)", "stroke-width": 2 }));
      }
    }
    ox += q.w * Q + gap;
    void pi;
  });
  return svg;
}

// ---------- the page ----------

const TABS = [["adventure", "Adventure"], ["rooms", "Rooms"]];

function render() {
  const nav = document.querySelector("nav");
  nav.replaceChildren(...TABS.map(([id, label]) => h("button", { "aria-current": S.tab === id ? "page" : false, onclick: () => ((S.tab = id), save(), render(), scrollTo(0, 0)) }, label)));
  const speed = document.getElementById("speed");
  speed.replaceChildren(...Object.keys(SPEEDS).map((k) => h("option", { value: k, selected: S.speed === k }, k)));
  const main = document.getElementById("main");
  if (!env) return;
  // Keep focus and the caret in a text box across a re-render.
  const focused = document.activeElement?.id;
  const caret = document.activeElement?.selectionStart;
  main.replaceChildren(...[S.tab === "rooms" ? roomsTab() : adventureTab()].flat(Infinity).filter(Boolean));
  if (focused) {
    const el = document.getElementById(focused);
    el?.focus?.();
    if (caret != null && el?.setSelectionRange) try { el.setSelectionRange(caret, caret); } catch {}
  }
}

async function start() {
  document.getElementById("speed").addEventListener("change", (e) => ((S.speed = e.target.value), save()));
  // A run that was cut off by a reload is marked, not left running.
  for (const r of S.rooms) if (!r.ms && !r.error) r.error = "Interrupted: the page was reloaded while it ran.";
  render();
  try {
    const text = (p) => fetch(url(p)).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${p}: ${r.status}`))));
    const [encoded, ...prompts] = await Promise.all(["fixtures/generator/encoded.json", ...PROMPTS.map((n) => `prompts/${n}.md`)].map(text));
    env = { prompts: Object.fromEntries(PROMPTS.map((n, i) => [n, prompts[i]])), examples: { encoded: JSON.parse(encoded) } };
  } catch (e) {
    document.getElementById("main").replaceChildren(h("p", { class: "err" }, `The Forge couldn't load: ${errorText(e)}`));
    return;
  }
  render();
  [sample, db] = await Promise.all([window.claude?.use("sample") ?? null, window.claude?.use("db") ?? null]);
  render();
}

start();
