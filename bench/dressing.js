// The Dressing Room (D170): the designer's bench for how companions look. Pick a companion and her partner (a tie
// changes her look and outfit) and see her face and body and her outfit sorted from her file's own sentences;
// exactly what each call is sent about her appearance, from the real context functions; and her photo prompt
// (docs/spec/calls/photo.md). A draft over any field her appearance comes from re-runs all of it live, and goes to
// her notes as a change request. Notes are saved to the page's db for the design thread to read and apply.
import { companions as authored } from "../content/companions/index.js";
import { pairs } from "../content/pairs.js";
import { classes } from "../content/classes.js";
import { photo as PHOTO } from "../content/photo.js";
import { resolveParty, partyProblems } from "../src/campaign/roster.js";
import { worldOf, inWorld } from "../src/campaign/world.js";
import * as Rel from "../src/campaign/relationship.js";
import { equip, wardrobeFor, wearing } from "../src/campaign/wardrobe.js";
import { photoOf, photoPrompt } from "../src/campaign/photo.js";
import { ownProfile, encounterCases, publicProfile, campfireInput, partyInput } from "../src/context.js";
import { photoCall } from "../src/calls/photo.js";
import { CallFailed } from "../src/ask.js";
import { campfireSchema, partySchema } from "../schemas/index.js";
import { load as loadEncounter } from "../src/engine/index.js";

const url = (p) => new URL(`../${p}`, import.meta.url);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (k === "class") el.className = v;
    else if (k === "style") el.setAttribute("style", v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked" || k === "disabled" || k === "open") el[k] = !!v;
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
const when = (t) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const tokens = (n) => `≈${Math.round(n / 4).toLocaleString()} tokens`;
const fileOf = (id) => `content/companions/${id}.js`;

const ids = Object.keys(authored);
const world = worldOf();

// ---------- state ----------

const KEEP = ["tab", "id", "partner", "drafts", "equipped", "photo", "channel", "alone", "late"];
const S = {
  tab: "companion",
  id: ids[0],
  partner: {}, // her partner, by companion
  drafts: {}, // field path -> draft text, by companion
  equipped: {}, // the outfit she's trying on, by companion
  photo: {}, // { slots, moment, beside }, by companion
  channel: "camp",
  alone: true,
  late: false,
  ...Object.fromEntries(KEEP.map((k) => [k, store.get(`dress.${k}`, undefined)]).filter(([, v]) => v !== undefined)),
  // This visit only.
  raw: {},
  editing: {},
  reviewing: false,
  noteKind: "look",
  noteText: "",
  sendText: "",
  confirm: null,
  photoBusy: false,
  photoStatus: "",
  flash: "",
};
if (!authored[S.id]) S.id = ids[0];
const save = () => KEEP.forEach((k) => store.set(`dress.${k}`, S[k]));

let env = null; // prompts and the Cells packet, for the whole call inputs
let envError = "";
let sample = null;
let db = null;
let dbMode = "loading"; // loading | slow | db | local | error
let notes = store.get("dress.localNotes", []);

// ---------- drafts ----------

const getPath = (o, path) => path.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
function setPath(o, path, v) {
  const ks = path.split(".");
  let x = o;
  for (const k of ks.slice(0, -1)) x = x[k] ??= {};
  x[ks.at(-1)] = v;
}
const draftOf = (id) => S.drafts[id] ?? {};
// Her file with the draft applied: what every preview on the page runs on.
function drafted(id) {
  const d = draftOf(id);
  if (!Object.keys(d).length) return authored[id];
  const c = structuredClone(authored[id]);
  for (const [p, v] of Object.entries(d)) setPath(c, p, v);
  return c;
}
function setDraft(id, path, v) {
  const was = getPath(authored[id], path);
  const d = { ...draftOf(id) };
  if (v === was || (v === "" && was === undefined)) delete d[path];
  else d[path] = v;
  const all = { ...S.drafts, [id]: d };
  if (!Object.keys(d).length) delete all[id];
  S.drafts = all;
  save();
}

// ---------- the party and what the calls see ----------

const partnersOf = (id) => ids.filter((o) => o !== id && !partyProblems([authored[id], authored[o]]).length);
function partnerOf(id) {
  const ok = partnersOf(id);
  if (ok.includes(S.partner[id])) return S.partner[id];
  return Object.keys(authored[id].tie?.by ?? {}).find((o) => ok.includes(o)) ?? ok[0];
}

// Her and her partner as the game resolves them, drafts applied, with a fresh relationship state: early in the
// romance, or after her payoff; wearing what she's trying on.
function sceneOf(id) {
  const pid = partnerOf(id);
  const self = drafted(id);
  const other = drafted(pid);
  const members = resolveParty([self, other], world);
  const [me, them] = members;
  let rom = Rel.newRomance(members, pairs, { act: 1 });
  if (S.late) Object.assign(rom.rel[me.id], { heat: 9, intimacy: 8, payoff: true, involved: true, vuln: true, deep: true });
  const eq = S.equipped[id];
  if (eq && rom.wardrobe[me.id]?.owned[eq]) rom = equip(rom, me.id, eq);
  return { id, pid, self, other, members, me, them, rom };
}

// Where each part of her appearance is written, for this partner.
const tieEntry = (c, pid) => c.tie?.by?.[pid];
function lookSources(c, pid) {
  const out = [{ path: "look", label: "Her look" }];
  if (tieEntry(c, pid)) {
    if (c.tie.append?.look) out.push({ path: "tie.append.look", label: "Her tie" });
    if (tieEntry(c, pid).append?.look !== undefined) out.push({ path: `tie.by.${pid}.append.look`, label: `With ${authored[pid].name}` });
  }
  return out;
}
function outfitSource(c, pid, rom) {
  const eq = rom.wardrobe[c.id]?.equipped ?? "usual";
  if (eq !== "usual") return { path: `wardrobe.${eq}.text`, label: rom.wardrobe[c.id].owned[eq].name };
  if (tieEntry(c, pid)?.set?.outfit !== undefined) return { path: `tie.by.${pid}.set.outfit`, label: `Usual, with ${authored[pid].name}` };
  if (tieEntry(c, pid) && c.tie.set?.outfit !== undefined) return { path: "tie.set.outfit", label: "Usual, from her tie" };
  return { path: "outfit", label: "Usual outfit" };
}
const PHOTO_KEYS = ["role", "face", "identity", "garments", "expression"];
const photoSource = (c, pid, k) => (tieEntry(c, pid)?.photo?.[k] !== undefined ? { path: `tie.by.${pid}.photo.${k}`, label: `With ${authored[pid].name}` } : { path: `photo.${k}`, label: "Her picture" });
// A source's text as the calls read it: the partner's name and the world's role nouns filled in.
const shown = (text, pid) => inWorld(String(text ?? "").replaceAll("{partner}", authored[pid].name), world);

// ---------- sorting her own sentences ----------

const sentences = (t) => (String(t ?? "").match(/[^.!?]+(?:[.!?]+["”']?|$)/g) ?? []).map((s) => s.trim()).filter(Boolean);

// Display order; ties go to the earlier entry in PRIORITY. Each sentence lands in one group, word for word.
const LOOK_GROUPS = [
  { id: "age", label: "Age", re: /\b(twenty|thirty|forty|mid-twenties|late twenties|years old|centuries)/gi },
  { id: "body", label: "Build & figure", re: /\b(figure|build|body|legs?|waist|hips?|breasts?|chest|curves?|curvy|hourglass|tall|short\w*|slender|slim|petite|lithe|toned|muscle|shoulders|midriff|compact|statuesque|fine-boned|athletic|wiry)\b/gi },
  { id: "skin", label: "Skin", re: /\b(skin|complexion)\b/gi },
  { id: "face", label: "Face & eyes", re: /\b(face|features|eyes?|eyebrows?|brows?|lashes|lips|mouth|nose|cheekbones|cheeks?|jaw|chin|smile|grin|half-smile|freckles?|liner|kohl)\b/gi },
  { id: "hair", label: "Hair", re: /\b(hair|bob|bangs|curls|waves|braid\w*|locks|fringe|ponytail|platinum|blonde|brunette|auburn)\b/gi },
  { id: "marks", label: "Marks & features", re: /\b(tattoo\w*|scars?|horns?|wings?|tail|ears?|sunburst|wrist|marked)\b/gi },
  { id: "manner", label: "Manner", re: /\b(moves?|stands?|posed|languid|unhurried|stillness|watch\w*|pounce|comfortable|memorable|knows)\b/gi },
];
const PRIORITY = ["hair", "face", "body", "skin", "marks", "manner", "age"];
function classify(text, groups, priority) {
  const scores = Object.fromEntries(groups.map((g) => [g.id, (text.match(g.re) ?? []).length]));
  const best = Math.max(...Object.values(scores));
  if (!best) return { group: "other", also: [] };
  const group = priority.find((g) => scores[g] === best);
  return { group, also: priority.filter((g) => g !== group && scores[g] > 0) };
}
// Her look's sentences, grouped, each with where it's written.
function sortLook(sources) {
  return sources.flatMap((s) => sentences(s.text).map((text) => ({ text, label: s.label, path: s.path, ...classify(text, LOOK_GROUPS, PRIORITY) })));
}

// An outfit's pieces: split at semicolons, or a lead-in and a list after a colon. A comma that only continues
// a piece ("…, open at the sides") doesn't split it.
const CONT = /^(?:open|slung|cut|tied|belted|leaving|worn|so|with|that|which|almost|barely|clinging|nearly|sliding|falling|or)\b/i;
function pieces(text) {
  const out = [];
  for (const s0 of sentences(text)) {
    const s = s0.replace(/\.+$/, "");
    if (s.includes(";")) {
      out.push(...s.split(/;\s*/).filter(Boolean).map((t) => ({ text: t })));
      continue;
    }
    const m = s.match(/^(.+?):\s+(.+)$/);
    if (!m) {
      out.push({ text: s });
      continue;
    }
    out.push({ text: m[1], note: true });
    const merged = [];
    for (const p of m[2].split(/,\s+/)) {
      if (merged.length && CONT.test(p)) merged[merged.length - 1] += `, ${p}`;
      else merged.push(p.replace(/^and\s+/i, ""));
    }
    out.push(...merged.map((t) => ({ text: t })));
  }
  return out;
}
const OUTFIT_GROUPS = [
  { id: "top", label: "Top & dress", re: /\b(bodice|bandeau|top|blouse|shirt|vest|corset|bralette|bustier|tunic|vestments|dress|halter|shift|gown|robe|wrap)\b/i },
  { id: "bottom", label: "Skirt & legs", re: /\b(skirt|breeches|leggings|shorts|pants|trousers|stockings)\b/i },
  { id: "feet", label: "Feet", re: /\b(boots|sandals|bare feet|barefoot|shoes|slippers)\b/i },
  { id: "jewellery", label: "Jewellery", re: /\b(chains?|pendant|circlet|armlets?|bangles|bracelets?|cuffs|anklets?|necklace|rings?|opal|jewel\w*|bells)\b/i },
  { id: "gear", label: "Belts, gear & extras", re: /\b(belt|harness|knives|dagger|sash|cape|cloak|pouches|pencil|ribbon|pockets|face)\b/i },
  { id: "hair", label: "In her hair", re: /\b(hair|mistletoe)\b/i },
];
const sortOutfit = (text) => pieces(text).map((p) => ({ ...p, group: p.note ? "note" : OUTFIT_GROUPS.find((g) => g.re.test(p.text))?.id ?? "note" }));

// Colours, materials and features in a text, to compare her look with her picture identity.
const TELLS = /\b(black|white|gold|golden|red|crimson|scarlet|oxblood|wine|auburn|copper|brown|chestnut|brunette|blonde|platinum|grey|gray|green|blue|hazel|amber|olive|bronze|silver|saffron|cream|charcoal|ivory|pink|rose|plum|freckles|freckled|scar|tattoo|horns|wings|tail|ears|leather|silk|lace|linen|velvet|fur|gauze)\b/gi;
const SAME = { gray: "grey", golden: "gold", freckled: "freckles" };
const tellsOf = (t) => new Set((String(t ?? "").toLowerCase().match(TELLS) ?? []).map((w) => SAME[w] ?? w));
const missing = (from, to) => {
  const there = tellsOf(to);
  return [...tellsOf(from)].filter((w) => !there.has(w));
};

// A word diff, for change requests.
function diffWords(a, b) {
  const A = String(a ?? "").split(/(\s+)/);
  const B = String(b ?? "").split(/(\s+)/);
  const n = A.length;
  const m = B.length;
  if (n * m > 600000) return [["del", a], ["ins", b]];
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  const push = (t, s) => (out.at(-1)?.[0] === t ? (out.at(-1)[1] += s) : out.push([t, s]));
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) push("eq", A[(j++, i++)]);
    else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", A[i++]);
    else push("ins", B[j++]);
  }
  while (i < n) push("del", A[i++]);
  while (j < m) push("ins", B[j++]);
  return out;
}
const diffView = (a, b) => h("pre", { class: "diff" }, diffWords(a, b).map(([t, s]) => (t === "eq" ? s : h(t, {}, s))));

// ---------- small pieces ----------

let renderQueued = false;
const rerender = () => {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => ((renderQueued = false), render()));
};
const update = (fn) => (...args) => (fn(...args), save(), rerender());

async function copyText(text, btn, target) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
  } catch {
    if (target) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    btn.textContent = "Selected: copy it";
  }
  setTimeout(() => (btn.textContent = "Copy"), 1600);
}
const copyBtn = (text, target) => h("button", { class: "btn ghost small", onclick: (e) => copyText(typeof text === "function" ? text() : text, e.currentTarget, typeof target === "function" ? target() : target) }, "Copy");
const seg = (id, options, value, on) =>
  h("div", { class: "seg", role: "group", id }, options.map(([v, label]) => h("button", { "aria-pressed": String(v === value), onclick: () => on(v) }, label)));
const toggle = (label, on, onclick) => h("button", { class: `btn ghost small${on ? " on" : ""}`, "aria-pressed": String(!!on), onclick }, label);

// One editable field of her file: what it says now, the draft, and where it lives.
function field(id, path, label, { rows = 3, number = false, check = false } = {}) {
  const was = getPath(authored[id], path);
  const d = draftOf(id);
  const changed = path in d;
  const value = changed ? d[path] : was ?? (check ? false : "");
  const control = check
    ? h("input", { type: "checkbox", id: `ed-${id}-${path}`, checked: !!value, onchange: update((e) => setDraft(id, path, e.target.checked)) })
    : number
      ? h("input", { type: "number", id: `ed-${id}-${path}`, class: changed ? "changed" : "", value: value ?? "", min: 18, oninput: update((e) => setDraft(id, path, e.target.value === "" ? undefined : Number(e.target.value))) })
      : h("textarea", { id: `ed-${id}-${path}`, rows, class: changed ? "changed" : "", oninput: update((e) => setDraft(id, path, e.target.value)) }, value);
  return h(
    "label",
    { class: "field" },
    h("span", {}, label, h("span", { class: "path" }, path), changed ? h("button", { class: "btn ghost small", onclick: update((e) => (e.preventDefault(), setDraft(id, path, was))) }, "Undo") : null),
    control,
  );
}

// ---------- the companion view ----------

function hero(sc) {
  const { me, id, pid } = sc;
  const tied = tieEntry(authored[id], pid);
  return h(
    "section",
    { class: "card" },
    h("div", { class: "hero" }, h("span", { class: "swatch", style: `--c:${me.color}` }), h("h2", {}, me.name), h("p", { class: "muted small" }, `${me.race} · ${me.age} · ${me.role}`)),
    h("p", { class: "small" }, me.blurb),
    h(
      "div",
      { class: "ctx" },
      h("label", { class: "inline" }, "With",
        h("select", { id: "partner", onchange: update((e) => (S.partner = { ...S.partner, [id]: e.target.value })) }, partnersOf(id).map((o) => h("option", { value: o, selected: o === pid }, authored[o].name)))),
      h("span", { class: "tiny muted" }, `In ${world.name}: role nouns in her text are filled from it.`),
      tied ? h("span", { class: "chip info" }, `Her tie with ${authored[pid].name} changes her look, outfit and picture`) : null,
    ),
  );
}

function sortedList(items, groups, empty) {
  const order = [...groups.map((g) => [g.id, g.label]), ["other", "Other"], ["note", "Style"]];
  const label = Object.fromEntries(order);
  const by = Object.groupBy ? Object.groupBy(items, (x) => x.group) : items.reduce((o, x) => ((o[x.group] ??= []).push(x), o), {});
  const rows = order.filter(([g]) => by[g]?.length);
  if (!rows.length) return h("p", { class: "muted small" }, empty);
  return h(
    "dl",
    { class: "sorted" },
    rows.map(([g]) =>
      h("div", {}, h("dt", {}, label[g]), h("dd", {}, by[g].map((x) => h("span", { class: "sent" }, x.text, x.tag ? h("span", { class: "tag src" }, x.tag) : null, (x.also ?? []).length ? h("span", { class: "tag" }, `also ${x.also.map((a) => label[a].toLowerCase()).join(", ")}`) : null)))),
    ),
  );
}

function lookCard(sc) {
  const { id, pid, self, me } = sc;
  const sources = lookSources(self, pid).map((s) => ({ ...s, text: shown(getPath(self, s.path), pid) }));
  const items = sortLook(sources).map((x) => ({ ...x, tag: sources.length > 1 && x.path !== "look" ? x.label : null }));
  const raw = S.raw.look;
  const sv = me.secondVoice;
  const editing = S.editing.look;
  return h(
    "section",
    { class: "card", id: "look-card" },
    h("div", { class: "head" }, h("h2", {}, "Face & body"),
      h("div", { class: "row" }, seg("look-view", [[false, "Sorted"], [true, "As written"]], !!raw, update((v) => (S.raw.look = v))), toggle("Edit", editing, update(() => (S.editing.look = !editing))))),
    raw
      ? h("div", { class: "raw" }, sources.map((s) => h("p", {}, sources.length > 1 ? h("span", { class: "tag src" }, s.label) : null, sources.length > 1 ? " " : null, s.text)))
      : sortedList(items, LOOK_GROUPS, "No look written."),
    me.shapeshift ? h("p", { class: "small muted" }, "This is her own shape. She can take any other (shapeshift); a changed shape replaces her look in every call until she changes back.") : null,
    sv
      ? h("div", { class: "sub" }, h("h3", {}, `${sv.name}, in her own body`),
        raw ? h("div", { class: "raw" }, h("p", {}, sv.look)) : sortedList(sortLook([{ text: sv.look, path: "secondVoice.look", label: sv.name }]), LOOK_GROUPS, "No look written."))
      : null,
    editing
      ? h("div", { class: "editor" },
        h("p", { class: "tiny muted" }, `Edits to ${fileOf(id)}. Everything on the page follows the draft; nothing is saved to the file until the design thread applies it.`),
        lookSources(authored[id], pid).map((s) => field(id, s.path, s.label, { rows: 4 })),
        sv ? field(id, "secondVoice.look", `${sv.name}'s look`, { rows: 3 }) : null)
      : null,
  );
}

function outfitCard(sc) {
  const { id, pid, self, me, rom } = sc;
  const w = rom.wardrobe[me.id];
  const src = outfitSource(self, pid, rom);
  const text = wearing(rom, me);
  const raw = S.raw.outfit;
  const editing = S.editing.outfit;
  const own = Object.entries(w.owned);
  const fileOutfits = Object.keys(self.wardrobe ?? {});
  const addOutfit = update(() => {
    const oid = `new_${Object.keys(self.wardrobe ?? {}).filter((k) => k.startsWith("new_")).length + 1}`;
    setDraft(id, `wardrobe.${oid}.name`, "New outfit");
    setDraft(id, `wardrobe.${oid}.text`, "");
    S.equipped = { ...S.equipped, [id]: oid };
    S.editing.outfit = true;
  });
  return h(
    "section",
    { class: "card", id: "outfit-card" },
    h("div", { class: "head" }, h("h2", {}, "Outfit"),
      h("div", { class: "row" }, seg("outfit-view", [[false, "Sorted"], [true, "As written"]], !!raw, update((v) => (S.raw.outfit = v))), toggle("Edit", editing, update(() => (S.editing.outfit = !editing))))),
    h("div", { class: "row" }, h("span", { class: "small muted" }, "Wearing"),
      own.length > 1
        ? seg("wearing", own.map(([oid, o]) => [oid, o.name]), w.equipped, update((v) => (S.equipped = { ...S.equipped, [id]: v })))
        : h("span", { class: "chip ok" }, src.label),
      h("button", { class: "btn ghost small", onclick: addOutfit }, "Try a new outfit")),
    raw ? h("div", { class: "raw" }, h("p", {}, text || "(empty)")) : sortedList(sortOutfit(text), OUTFIT_GROUPS, "Nothing written yet."),
    h("p", { class: "tiny muted" }, `Written in ${fileOf(id)} → ${src.path}. Getting wet, torn or half-undressed is texture in the scene, not a change of outfit.`),
    editing
      ? h("div", { class: "editor" },
        h("p", { class: "tiny muted" }, `Edits to ${fileOf(id)}. A new outfit becomes one more she owns from the start (her file's wardrobe).`),
        field(id, outfitSource(authored[id], pid, { wardrobe: { [id]: { equipped: "usual" } } }).path, "Her usual outfit", { rows: 4 }),
        [...new Set([...fileOutfits, ...Object.keys(authored[id].wardrobe ?? {})])].flatMap((oid) => [field(id, `wardrobe.${oid}.name`, "Outfit name", { rows: 1 }), field(id, `wardrobe.${oid}.text`, "What it looks like", { rows: 3 })]))
      : null,
  );
}

// What each call is sent about her appearance, from the real context functions.
const CHANNELS = [["camp", "At camp"], ["room", "In a room"], ["other", "To her partner"], ["dm", "The DM"]];
function channelRows(sc) {
  const { me, members, rom, them } = sc;
  if (S.channel === "camp") {
    const own = ownProfile(me, rom, members, { private: S.alone, inPerson: true }, { planning: false });
    return {
      where: `Her own campfire call, in "## You are". ${S.alone ? "Alone with him." : `With ${them.name} at the fire too.`}`,
      rows: [
        ["look", own.look],
        ["outfit", own.outfit],
        own.second_voice?.may_take_her_own_body ? ["second_voice.may_take_her_own_body", own.second_voice.may_take_her_own_body] : null,
        own.shapeshift ? ["shapeshift", own.shapeshift] : null,
        ["## Your outfits (its own block)", JSON.stringify(wardrobeFor(rom, me))],
      ].filter(Boolean),
      absent: me.secondVoice && !own.second_voice?.may_take_her_own_body ? `${me.secondVoice.name}'s own body isn't sent here yet: ${S.alone ? "she can take it only after the payoff" : "in company, she needs her in-company gate"}. Try "After her payoff"${S.alone ? "" : " and alone"}.` : null,
      guide: env?.prompts.campfire.split("\n").filter((l) => /\b(look|outfit|form|wearing)\b/i.test(l) && !/^#/.test(l)),
    };
  }
  if (S.channel === "room") {
    const cases = encounterCases(me, rom, members, { private: false, inPerson: false });
    return {
      where: `The party call (both companions over the rings) and her private channel, in her brief.`,
      rows: [["outfit", cases.outfit], cases.look ? ["look", cases.look] : null].filter(Boolean),
      absent: `Her look isn't sent in a room (D79): only what she has on${me.shapeshift ? ", or her look while she's changed her shape" : ""}.`,
      guide: [],
    };
  }
  if (S.channel === "other") {
    const pub = publicProfile(me, rom);
    return {
      where: `${them.name}'s campfire call, when both of them are at the fire ("with_you"), and what a shapeshifter copies when she comes wearing her face.`,
      rows: [["looks", pub.looks], ["wearing", pub.wearing]],
      absent: `In a room, ${them.name} gets only her name, role, blurb, voice and abilities.`,
      guide: [],
    };
  }
  return {
    where: "The DM's calls: adjudicate, resolve, scene, question and verdict.",
    rows: [],
    absent: "Nothing. The DM gets her name, role, skills, abilities, voice and mood, never her look or outfit. If the DM is to describe her, it has to come from somewhere else.",
    guide: [],
  };
}

// The whole input of the channel's call, as it would be sent, for the fold.
const playerOf = () => {
  const cls = classes.rogue;
  return { id: "player", name: cls.name, role: "The player", skills: cls.mods, abilities: cls.abilities };
};
function wholeInput(sc) {
  if (!env) return null;
  const { self, other, rom, me, them } = sc;
  const base = { prompts: env.prompts, act: 1, world, romance: rom };
  if (S.channel === "camp") return campfireInput(base, { with: S.alone ? [me.id] : [me.id, them.id], scene: [] }, self, [other], campfireSchema);
  if (S.channel === "other") return campfireInput(base, { with: [them.id, me.id], scene: [] }, other, [self], campfireSchema);
  if (S.channel === "room") {
    const party = [playerOf(), self, other];
    return partyInput({ ...base, packet: env.packet, party, state: loadEncounter({ packet: env.packet, party }) }, { draft: null }, [self, other], [], partySchema);
  }
  return null;
}
function marked(text, needles) {
  const ranges = [];
  for (const n of needles.filter((x) => x && x.length > 2)) for (let i = text.indexOf(n); i >= 0; i = text.indexOf(n, i + n.length)) ranges.push([i, i + n.length]);
  ranges.sort((a, b) => a[0] - b[0]);
  const out = [];
  let at = 0;
  for (const [a, b] of ranges) {
    if (a < at) continue;
    out.push(text.slice(at, a), h("mark", {}, text.slice(a, b)));
    at = b;
  }
  out.push(text.slice(at));
  return out;
}

function sendsCard(sc) {
  const { them } = sc;
  const ch = channelRows(sc);
  const input = S.channel === "dm" ? null : wholeInput(sc);
  const chars = ch.rows.reduce((n, [, v]) => n + String(v ?? "").length, 0);
  const needles = ch.rows.map(([k, v]) => (k.startsWith("##") ? v : JSON.stringify(String(v ?? "")).slice(1, -1)));
  return h(
    "section",
    { class: "card", id: "sends-card" },
    h("div", { class: "head" }, h("h2", {}, "What the game sends")),
    seg("channel", CHANNELS.map(([v, l]) => [v, v === "other" ? `To ${them.name}` : l]), S.channel, update((v) => (S.channel = v))),
    S.channel === "camp"
      ? h("div", { class: "row" }, seg("alone", [[true, "Alone with him"], [false, "Both at the fire"]], S.alone, update((v) => (S.alone = v))), toggle("After her payoff", S.late, update(() => (S.late = !S.late))))
      : null,
    h("p", { class: "small muted" }, ch.where),
    ch.rows.length
      ? h("div", { class: "sent-rows" }, ch.rows.map(([k, v]) => {
        const q = h("pre", { class: "quote" }, String(v ?? ""));
        return h("div", { class: "sent-row" }, h("div", { class: "key" }, h("span", {}, k), copyBtn(String(v ?? ""), q)), q);
      }))
      : null,
    ch.absent ? h("p", { class: "absent" }, ch.absent) : null,
    ch.guide?.length ? h("div", { class: "sub" }, h("h3", {}, "How her prompt tells her to use it"), ch.guide.map((l) => h("p", { class: "guide" }, l.replace(/\*\*/g, "")))) : null,
    h("div", { class: "meter" }, h("span", {}, `Her appearance: ${chars.toLocaleString()} chars (${tokens(chars)})`), input ? h("span", {}, `of a ${(input.length / 1024).toFixed(1)} KB input`) : null),
    input
      ? h("details", { class: "fold", open: S.showInput, ontoggle: (e) => { if (S.showInput !== e.currentTarget.open) { S.showInput = e.currentTarget.open; rerender(); } } }, h("summary", {}, "The whole input, with her appearance marked"), S.showInput ? h("pre", {}, marked(input, needles)) : h("pre", {}, ""))
      : envError && S.channel !== "dm" ? h("p", { class: "err small" }, `The whole input needs the prompts: ${envError}`) : null,
  );
}

// ---------- photo ----------

const photoState = (id) => (S.photo[id] ??= { slots: {}, moment: "", beside: false });
const SLOT_FIELDS = [
  ["setting", "Setting", PHOTO.defaults.setting],
  ["light", "Light", PHOTO.defaults.light],
  ["position", "Position", PHOTO.defaults.position],
  ["face_extra", "Marks on her face", "none"],
  ["action", "Action (one clause, mid-moment)", PHOTO.defaults.action],
  ["surroundings", "Surroundings", PHOTO.defaults.surroundings],
  ["light_source", "The one light source", PHOTO.defaults.light_source],
];

async function fillPhoto(sc) {
  const ps = photoState(sc.id);
  S.photoBusy = true;
  S.photoStatus = "Filling the slots…";
  render();
  try {
    const out = await photoCall({ sample, speed: "balanced" }, { prompts: env.prompts, world, romance: sc.rom }, { moment: ps.moment, beside: ps.beside }, sc.self, [sc.other]);
    ps.slots = out;
    S.photoStatus = "Filled from the moment. Change any slot by hand.";
  } catch (e) {
    S.photoStatus = e instanceof CallFailed ? `The answer didn't fit: ${e.errors.slice(0, 2).join("; ")}` : errorText(e);
  }
  S.photoBusy = false;
  save();
  render();
}

function photoCard(sc) {
  const { id, pid, self, me, rom } = sc;
  const pic = photoOf(me, rom);
  const ps = photoState(id);
  const editing = S.editing.photo;
  const prompt = photoPrompt(pic, ps.slots, { beside: ps.beside });
  const out = h("pre", { class: "prompt-out", id: "photo-prompt" }, prompt);
  const lookGap = missing(me.look, `${pic.role} ${pic.face} ${pic.identity}`);
  const usual = (rom.wardrobe[me.id]?.equipped ?? "usual") === "usual";
  const outfitGap = usual && me.photo?.garments ? missing(wearing(rom, me), pic.garments) : [];
  const setSlot = (k) => update((e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    ps.slots = { ...ps.slots, [k]: v };
    if (v === "") delete ps.slots[k];
  });
  const preset = update((e) => {
    const p = PHOTO.scenes[Number(e.target.value)];
    if (p) ps.slots = { ...ps.slots, setting: p.setting, light: p.light, surroundings: p.surroundings, light_source: p.light_source, grit: p.grit };
  });
  const ageEditable = typeof authored[id].age !== "number" || authored[id].photo?.age !== undefined;
  return h(
    "section",
    { class: "card", id: "photo-card" },
    h("div", { class: "head" }, h("h2", {}, "Photo"), toggle("Edit her picture", editing, update(() => (S.editing.photo = !editing)))),
    h("p", { class: "small muted" }, "Gravenhold's photo prompt: fixed words that keep her the same in every picture, around slots for the moment. Paste the result into any image generator."),
    h("dl", { class: "sorted" },
      [["Picture", `a ${pic.age}yo ${pic.role}`], ["Face", pic.face], ["Identity", pic.identity], ["Garments", pic.garments + (usual ? "" : "  (what she has on now)")], ["Register", pic.bold ? 'Bold: her main garment keeps the word "sexy"' : 'Soft: never "sexy"; sensuality from the garment\'s state'], ["Expression", pic.expression], pic.beside ? ["Beside her", pic.beside] : null]
        .filter(Boolean).map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, v)))),
    h("div", { class: "chips" },
      lookGap.length ? h("span", { class: "chip near" }, `In her look, not her picture: ${lookGap.join(", ")}`) : h("span", { class: "chip ok" }, "Her picture covers her look's colours and features"),
      outfitGap.length ? h("span", { class: "chip info" }, `Left out of her garments line: ${outfitGap.join(", ")}`) : null,
      !authored[id].photo ? h("span", { class: "chip bad" }, "No picture identity in her file: defaults in use") : null),
    editing
      ? h("div", { class: "editor" },
        h("p", { class: "tiny muted" }, `Edits to ${fileOf(id)}. Ordinary words, short and concrete: these go to an image model, not a reader.`),
        ageEditable ? field(id, "photo.age", "Age in the picture", { number: true }) : null,
        PHOTO_KEYS.map((k) => {
          const s = photoSource(authored[id], pid, k);
          return field(id, s.path, `${k[0].toUpperCase()}${k.slice(1)}${s.label === "Her picture" ? "" : ` (${s.label})`}`, { rows: k === "role" || k === "face" ? 2 : 3 });
        }),
        field(id, "photo.bold", 'Bold (keeps "sexy")', { check: true }),
        me.secondVoice ? field(id, "secondVoice.photo", `${me.secondVoice.name} beside her`, { rows: 2 }) : null)
      : null,
    h("h3", {}, "The moment"),
    h("div", { class: "row" },
      h("select", { id: "photo-preset", onchange: preset }, [h("option", { value: "" }, "Start from a scene…"), ...PHOTO.scenes.map((p, i) => h("option", { value: i }, p.name))]),
      h("button", { class: "btn ghost small", onclick: update(() => (ps.slots = {})) }, "Clear the slots")),
    h("textarea", { id: "photo-moment", rows: 2, placeholder: "Where she is and what's happening, in a sentence or two. The photo call fills the slots from it.", oninput: (e) => ((ps.moment = e.target.value), save(), rerender()) }, ps.moment),
    h("div", { class: "row" },
      h("button", { class: "btn", disabled: !sample || !env || !ps.moment.trim() || S.photoBusy, onclick: () => fillPhoto(sc) }, S.photoBusy ? "Filling…" : "Fill from the moment"),
      h("span", { class: "status" }, !sample ? "Open on claude.ai to fill slots with Claude; you can fill them by hand here." : S.photoStatus)),
    h("div", { class: "slots" },
      SLOT_FIELDS.map(([k, label, ph]) => h("label", { class: `field${k === "action" ? " wide" : ""}` }, h("span", {}, label), h("input", { type: "text", id: `slot-${k}`, value: ps.slots[k] ?? "", placeholder: ph, oninput: setSlot(k) }))),
      h("label", { class: "field wide" }, h("span", {}, "Garments (her line, or what the moment changes)"), h("input", { type: "text", id: "slot-garments", value: ps.slots.garments ?? "", placeholder: pic.garments, oninput: setSlot("garments") })),
      h("label", { class: "field wide" }, h("span", {}, "Expression"), h("input", { type: "text", id: "slot-expression", value: ps.slots.expression ?? "", placeholder: pic.expression, oninput: setSlot("expression") })),
      h("div", { class: "row wide" },
        h("label", { class: "check" }, h("input", { type: "checkbox", id: "slot-grit", checked: ps.slots.grit !== false, onchange: setSlot("grit") }), "Grime and wear"),
        pic.beside ? h("label", { class: "check" }, h("input", { type: "checkbox", id: "slot-beside", checked: ps.beside, onchange: update((e) => (ps.beside = e.target.checked)) }), `${me.secondVoice.name} beside her`) : null)),
    h("div", { class: "head" }, h("h3", {}, "The prompt"), h("div", { class: "row" }, copyBtn(prompt, out), h("button", { class: "btn ghost small", onclick: () => saveNote({ kind: "photo", text: ps.moment || "A photo prompt", prompt }) }, "Save to notes"))),
    out,
    h("p", { class: "meter" }, `${prompt.length.toLocaleString()} characters`),
  );
}

// ---------- notes ----------

const KINDS = [["look", "Face & body"], ["outfit", "Outfit"], ["photo", "Photo"], ["other", "Other"]];
const KIND = Object.fromEntries([...KINDS, ["change", "Change request"]]);

async function saveNote(n) {
  const note = { who: S.id, at: Date.now(), status: "open", ...n };
  const nid = newId();
  if (db && dbMode !== "error") {
    try {
      await db.collection("notes").doc(nid).set(note);
      S.flash = "Saved to her notes.";
    } catch (e) {
      S.flash = `Couldn't save: ${errorText(e)}`;
      render();
      return false;
    }
  } else {
    notes = [...notes, { id: nid, ...note }];
    store.set("dress.localNotes", notes);
    S.flash = "Saved in this browser.";
  }
  render();
  return true;
}
async function patchNote(nid, patch) {
  if (db && dbMode !== "error") {
    try {
      await db.collection("notes").doc(nid).update(patch);
    } catch (e) {
      S.flash = `Couldn't save: ${errorText(e)}`;
      render();
    }
    return;
  }
  notes = notes.map((n) => (n.id === nid ? { ...n, ...patch } : n));
  store.set("dress.localNotes", notes);
  render();
}
async function dropNote(nid) {
  S.confirm = null;
  if (db && dbMode !== "error") {
    try {
      await db.collection("notes").doc(nid).delete();
    } catch (e) {
      S.flash = `Couldn't delete: ${errorText(e)}`;
      render();
    }
    return;
  }
  notes = notes.filter((n) => n.id !== nid);
  store.set("dress.localNotes", notes);
  render();
}

function noteView(n) {
  const done = n.status === "done";
  const confirming = S.confirm === `note:${n.id}`;
  const q = n.prompt ? h("pre", { class: "quote" }, n.prompt) : null;
  return h(
    "div",
    { class: `note${done ? " done" : ""}` },
    h("div", { class: "meta" }, h("span", { class: `chip ${n.kind === "change" ? "info" : "ok"}` }, KIND[n.kind] ?? n.kind), h("span", {}, when(n.at)), n.partner ? h("span", {}, `with ${authored[n.partner]?.name ?? n.partner}`) : null, done ? h("span", {}, "done") : null),
    n.text ? h("p", { class: "text" }, n.text) : null,
    (n.changes ?? []).map((c) => h("div", { class: "field" }, h("span", { class: "path" }, `${n.file ?? fileOf(n.who)} → ${c.path}`), diffView(c.from ?? "", c.to ?? ""))),
    q ? h("div", { class: "sent-row" }, h("div", { class: "key" }, h("span", {}, "prompt"), copyBtn(n.prompt, q)), q) : null,
    h("div", { class: "row" },
      h("button", { class: "btn ghost small", onclick: () => patchNote(n.id, { status: done ? "open" : "done", doneAt: Date.now() }) }, done ? "Reopen" : "Mark done"),
      n.changes?.length && authored[n.who] ? h("button", { class: "btn ghost small", onclick: update(() => { for (const c of n.changes) setDraft(n.who, c.path, c.to); S.id = n.who; if (n.partner) S.partner = { ...S.partner, [n.who]: n.partner }; }) }, "Load as a draft") : null,
      confirming
        ? [h("span", { class: "small" }, "Delete this note?"), h("button", { class: "btn danger small", onclick: () => dropNote(n.id) }, "Delete"), h("button", { class: "btn ghost small", onclick: update(() => (S.confirm = null)) }, "Keep")]
        : h("button", { class: "btn danger small", onclick: update(() => (S.confirm = `note:${n.id}`)) }, "Delete")),
  );
}

function notesCard(sc) {
  const mine = notes.filter((n) => n.who === sc.id).sort((a, b) => (a.status === "done") - (b.status === "done") || b.at - a.at);
  const open = mine.filter((n) => n.status !== "done").length;
  const add = async () => {
    if (!S.noteText.trim()) return;
    if (await saveNote({ kind: S.noteKind, text: S.noteText.trim(), partner: sc.pid })) {
      S.noteText = "";
      render();
    }
  };
  return h(
    "section",
    { class: "card", id: "notes-card" },
    h("div", { class: "head" }, h("h2", {}, "Notes"), h("span", { class: "small muted" }, mine.length ? `${open} open of ${mine.length}` : "")),
    h("p", { class: "small muted" }, dbMode === "db" || dbMode === "loading" || dbMode === "slow" ? `Changes you'd like to see for ${sc.me.name}. They're saved for the design thread, which reads them and makes the changes in her file.` : `Changes you'd like to see for ${sc.me.name}. Saved in this browser only: open the page on claude.ai to share them with the design thread.`),
    seg("note-kind", KINDS, S.noteKind, update((v) => (S.noteKind = v))),
    h("textarea", { id: "note-text", rows: 3, placeholder: `e.g. "Her hair should read as copper, not auburn, everywhere" or "Give her a travelling cloak for the road"`, oninput: (e) => (S.noteText = e.target.value) }, S.noteText),
    h("div", { class: "row" }, h("button", { class: "btn", onclick: add }, "Save note"), S.flash ? h("span", { class: "status" }, S.flash) : null),
    mine.length ? h("div", { class: "notes" }, mine.map(noteView)) : h("p", { class: "muted small" }, "No notes yet. The first one you save appears here, and in the design thread."),
  );
}

// ---------- drafts ----------

function draftCard(sc) {
  const d = draftOf(sc.id);
  const changes = Object.entries(d).map(([path, to]) => ({ path, from: getPath(authored[sc.id], path) ?? "", to: to ?? "" }));
  const send = async () => {
    const ok = await saveNote({ kind: "change", text: S.sendText.trim(), partner: sc.pid, file: fileOf(sc.id), changes });
    if (!ok) return;
    S.drafts = Object.fromEntries(Object.entries(S.drafts).filter(([k]) => k !== sc.id));
    S.sendText = "";
    S.reviewing = false;
    save();
    render();
  };
  return h(
    "section",
    { class: "card", id: "draft-card" },
    h("div", { class: "head" }, h("h2", {}, `Draft for ${sc.me.name}`), h("button", { class: "btn ghost small", onclick: update(() => (S.reviewing = false)) }, "Close")),
    changes.map((c) => h("div", { class: "field" }, h("span", { class: "path" }, `${fileOf(sc.id)} → ${c.path}`), diffView(String(c.from), String(c.to)))),
    h("textarea", { id: "send-text", rows: 2, placeholder: "Anything the design thread should know (optional)", oninput: (e) => (S.sendText = e.target.value) }, S.sendText),
    h("div", { class: "row" }, h("button", { class: "btn", onclick: send }, "Send to her notes"), h("span", { class: "tiny muted" }, "Sending clears the draft; the note keeps it, and can load it back.")),
  );
}

function draftBar() {
  const bar = document.getElementById("draftbar");
  const n = Object.keys(draftOf(S.id)).length;
  if (S.tab !== "companion" || !n) return bar.replaceChildren();
  const confirming = S.confirm === "discard";
  bar.replaceChildren(
    h("div", { class: "draftbar" }, h("div", { class: "wrap" },
      h("span", { class: "grow" }, `Draft: ${n} change${n === 1 ? "" : "s"} to ${authored[S.id].name}. Everything above shows it.`),
      confirming
        ? [h("button", { class: "btn danger small", onclick: update(() => { S.drafts = Object.fromEntries(Object.entries(S.drafts).filter(([k]) => k !== S.id)); S.confirm = null; S.reviewing = false; }) }, "Discard it"), h("button", { class: "btn ghost small", onclick: update(() => (S.confirm = null)) }, "Keep")]
        : [h("button", { class: "btn small", onclick: update(() => { S.reviewing = true; scrollTo({ top: 0, behavior: "smooth" }); }) }, "Review and send"), h("button", { class: "btn ghost small", onclick: update(() => (S.confirm = "discard")) }, "Discard")])),
  );
}

// ---------- lineup ----------

function lineup() {
  return h(
    "div",
    { class: "lineup" },
    ids.map((id) => {
      const sc = sceneOf(id);
      const looks = sortLook(lookSources(sc.self, sc.pid).map((s) => ({ ...s, text: shown(getPath(sc.self, s.path), sc.pid) })));
      const first = (g) => looks.find((x) => x.group === g)?.text;
      const top = sortOutfit(wearing(sc.rom, sc.me)).find((p) => p.group === "top")?.text;
      return h(
        "button",
        { class: "card", onclick: update(() => ((S.tab = "companion"), (S.id = id))) },
        h("div", { class: "row" }, h("span", { class: "dot", style: `--c:${sc.me.color}` }), h("b", {}, sc.me.name), tieEntry(authored[id], sc.pid) ? h("span", { class: "tiny muted" }, `with ${sc.them.name}`) : null),
        h("dl", {}, [["Hair", first("hair")], ["Face & eyes", first("face")], ["Build", first("body")], ["Wearing", top]].map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, v ?? h("span", { class: "muted" }, "not described"))))),
      );
    }),
  );
}

// ---------- render ----------

function strip() {
  document.getElementById("strip").replaceChildren(
    ...ids.map((id) => {
      const c = authored[id];
      const open = notes.filter((n) => n.who === id && n.status !== "done").length;
      return h("button", { class: "pick", "aria-pressed": String(S.tab === "companion" && S.id === id), onclick: update(() => ((S.tab = "companion"), (S.id = id), (S.reviewing = false), (S.confirm = null), (S.flash = ""), (S.photoStatus = ""))) },
        h("span", { class: "dot", style: `--c:${c.color}` }), c.name,
        open ? h("span", { class: "badge", title: `${open} open notes` }, open) : null,
        draftOf(id) && Object.keys(draftOf(id)).length ? h("span", { class: "badge draft" }, "draft") : null);
    }),
  );
  document.getElementById("tabs").replaceChildren(
    ...[["companion", "Companion"], ["lineup", "Lineup"]].map(([t, l]) => h("button", { "aria-current": S.tab === t ? "page" : "false", onclick: update(() => (S.tab = t)) }, l)),
  );
  document.getElementById("dbstate").textContent = { loading: "Connecting…", slow: "Notes are slow to load", db: "Notes saved for the design thread", local: "Notes in this browser", error: "Notes couldn't load" }[dbMode];
}

function render() {
  const main = document.getElementById("main");
  const focused = document.activeElement;
  const fid = focused?.id;
  const sel = fid && focused.selectionStart != null ? [focused.selectionStart, focused.selectionEnd] : null;
  strip();
  let parts;
  try {
    if (S.tab === "lineup") parts = [h("p", { class: "small muted" }, "Every companion at a glance, with her first partner where a tie changes her: the first sentence of each group, to spot two who read alike."), lineup()];
    else {
      const sc = sceneOf(S.id);
      parts = [S.reviewing && Object.keys(draftOf(S.id)).length ? draftCard(sc) : null, hero(sc), lookCard(sc), outfitCard(sc), sendsCard(sc), photoCard(sc), notesCard(sc)];
    }
  } catch (e) {
    console.error(e);
    parts = [h("section", { class: "card" }, h("h2", {}, "This draft doesn't run"), h("p", { class: "err" }, errorText(e)), h("button", { class: "btn ghost", onclick: update(() => (S.drafts = Object.fromEntries(Object.entries(S.drafts).filter(([k]) => k !== S.id)))) }, "Discard the draft"))];
  }
  main.replaceChildren(...parts.filter(Boolean));
  draftBar();
  if (fid) {
    const el = document.getElementById(fid);
    if (el && el !== document.activeElement) {
      el.focus({ preventScroll: true });
      if (sel && el.setSelectionRange) try { el.setSelectionRange(...sel); } catch {}
    }
  }
}

// ---------- start ----------

async function connect() {
  [sample, db] = await Promise.all([window.claude?.use?.("sample") ?? null, window.claude?.use?.("db") ?? null]);
  if (!db) {
    dbMode = "local";
    render();
    return;
  }
  const local = notes;
  notes = [];
  const timer = setTimeout(() => dbMode === "loading" && ((dbMode = "slow"), render()), 10000);
  db.collection("notes").onSnapshot(
    (snap) => {
      if (!snap.metadata.fromCache) clearTimeout(timer);
      notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      dbMode = "db";
      render();
    },
    (e) => {
      clearTimeout(timer);
      dbMode = "error";
      notes = local;
      S.flash = `Notes couldn't load (${errorText(e)}); saving in this browser instead.`;
      render();
    },
  );
  render();
}

async function start() {
  render();
  try {
    const text = (p) => fetch(url(p)).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${p}: ${r.status}`))));
    const names = ["style", "campfire", "party", "photo"];
    const [packet, ...prompts] = await Promise.all(["content/encounters/cells.json", ...names.map((n) => `prompts/${n}.md`)].map(text));
    env = { packet: JSON.parse(packet), prompts: Object.fromEntries(names.map((n, i) => [n, prompts[i]])) };
  } catch (e) {
    envError = errorText(e);
  }
  render();
  connect();
}

start();
