// The game page (docs/spec/ui.md): the title screen and saves, setup, and the two tabs (the table and plans) around
// the map, the clock and the party's sheet. All game logic lives in src/; this file draws it and handles input.
import { html, useState, useEffect, useRef } from "./h.js";
import { MapPanel, Clock } from "./map.js";
import { openStore, prefs, SLOTS } from "./store.js";
import { newSession, serialize, restore, partyFor, recordCall } from "../src/game/session.js";
import { question, talk, rings, talkOver, addToPlan, makeCard, commit, shown, cardStale, speaker, resend, drop } from "../src/game/turns.js";
import { addItem, editItem, moveItem, removeItem, clearDraft } from "../src/game/draft.js";
import { companions as authored } from "../content/companions/index.js";
import { rosterIn, worldOf, pitchSeed } from "../src/campaign/world.js";
import { pitchCall } from "../src/calls/pitch.js";
// The companions as they are in this world: their stories' role nouns filled in (D150).
const roster = rosterIn(authored);
import { partyProblems } from "../src/campaign/roster.js";
import { mapView, clockView, partyView, sheetView, BAND } from "../src/game/view.js";
import { partyPerceives } from "../src/engine/perceive.js";
import { nameOf } from "../src/engine/world.js";
import { LEDGER } from "../src/engine/ledger.js";

const PROMPTS = ["style", "companion", "party", "campfire", "adjudicate", "resolve", "scene", "question", "pitch"];
const url = (p) => new URL(`../${p}`, import.meta.url);
const STATUS = {
  step: "Writing out the steps…",
  pricing: "Weighing the risks…",
  ruling: "Making a ruling…",
  world: "The world responds…",
  narration: "The DM tells what happens…",
  moment: "The DM considers…",
  companion: "Your companions are thinking…",
  party: "Your companions are thinking…",
  question: "The DM considers…",
  adjudicate: "The DM rules on your plan…",
  resolve: "The dice are down. The DM plays it out…",
  scene: "The DM considers…",
  pitch: "Imagining your adventure…",
};

const SPEED = [
  ["faster", "Faster", "Quicker, cheaper calls. The DM misses more."],
  ["balanced", "Balanced", "The tiers the bench settled on."],
  ["smarter", "Smarter", "Slower calls on bigger models, charged to your usage."],
];

const errorText = (e) => (e?.code === "not_granted" ? "This page isn't allowed to ask Claude. Check the artifact's permissions." : e?.code === "rate_limited" ? "Claude is busy right now. Wait a minute and try again." : e?.message ?? String(e));
const paras = (t) => (t ?? "").split(/\n+/).filter(Boolean);

// ---------- loading ----------

async function loadAll() {
  const text = (p) => fetch(url(p)).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${p}: ${r.status}`))));
  const [packetText, ...prompts] = await Promise.all([text("content/encounters/cells.json"), ...PROMPTS.map((n) => text(`prompts/${n}.md`))]);
  const [sample, downloads, store] = await Promise.all([window.claude?.use("sample") ?? null, window.claude?.use("downloads") ?? null, openStore()]);
  return { packet: JSON.parse(packetText), prompts: Object.fromEntries(PROMPTS.map((n, i) => [n, prompts[i]])), sample, downloads, store };
}

// ---------- the app ----------

function App() {
  const [env, setEnv] = useState(null);
  const [failed, setFailed] = useState(null);
  const [screen, setScreen] = useState({ name: "title" });
  useEffect(() => {
    loadAll().then(setEnv, (e) => setFailed(errorText(e)));
  }, []);
  if (failed) return html`<div className="title gutter"><h1 className="wordmark">Heist-DM</h1><p className="error">The game couldn't load: ${failed}</p></div>`;
  if (!env) return html`<p className="gutter muted" style=${{ paddingTop: "24px" }}>Loading the Cells…</p>`;
  if (screen.name === "setup") return html`<${Setup} env=${env} slot=${screen.slot} onBack=${() => setScreen({ name: "title" })} onBegin=${(session) => setScreen({ name: "game", slot: screen.slot, session })} />`;
  if (screen.name === "game") return html`<${Game} env=${env} slot=${screen.slot} initial=${screen.session} onQuit=${() => setScreen({ name: "title" })} />`;
  return html`<${Title} env=${env} onNew=${(slot) => setScreen({ name: "setup", slot })} onLoad=${(slot, session) => setScreen({ name: "game", slot, session })} />`;
}

function Title({ env, onNew, onLoad }) {
  const [slots, setSlots] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);
  const file = useRef(null);
  const refresh = () => env.store.list().then(setSlots);
  useEffect(() => {
    refresh();
  }, []);
  const open = async (slot) => {
    try {
      onLoad(slot, restore(await env.store.load(slot), env.packet));
    } catch (e) {
      setError(`That save couldn't be loaded: ${errorText(e)}`);
    }
  };
  const importSave = async (ev) => {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const session = restore(await f.text(), env.packet);
      const free = SLOTS.find((s) => !slots?.[s]) ?? SLOTS[0];
      onLoad(free, session);
    } catch (e) {
      setError(`That file isn't a save this game can load: ${errorText(e)}`);
    }
  };
  return html`<main className="title gutter">
    <h1 className="wordmark">Heist-DM</h1>
    <p className="tagline">Three prisoners, a goblin with the keys, and a sergeant coming down at the watch change.</p>
    ${!env.sample ? html`<p className="error">Claude isn't reachable from this view, so the DM and the companions can't speak. Open the page on claude.ai to play.</p>` : null}
    ${error ? html`<p className="error">${error}</p>` : null}
    <div className="slots">
      ${!slots ? html`<p className="muted">Looking for saves…</p>` : SLOTS.map((slot, i) => {
        const m = slots[slot];
        if (!m) return html`<button key=${slot} className="slot empty slotmain" onClick=${() => onNew(slot)}><span className="slotname">New game</span><span className="slotmeta">Slot ${i + 1}</span></button>`;
        return html`<div key=${slot} className="slot">
          <button className="slotmain" onClick=${() => open(slot)}><span className="slotname">${m.name || "Unnamed"}</span><span className="slotmeta">${m.summary ?? ""} · ${new Date(m.updated).toLocaleString()}</span></button>
          ${confirm === slot
            ? html`<span><button className="link danger" onClick=${async () => (await env.store.remove(slot), setConfirm(null), refresh())}>Delete it</button><button className="link" onClick=${() => setConfirm(null)}>Keep</button></span>`
            : html`<button className="link" onClick=${() => setConfirm(slot)}>Delete</button>`}
        </div>`;
      })}
    </div>
    <div className="row" style=${{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <button className="ghost" onClick=${() => file.current?.click()}>Import a save</button>
      <input id="import-save" ref=${file} type="file" accept=".json,application/json" hidden onChange=${importSave} />
      <span className="muted small">Saves are kept in ${env.store.where}.</span>
    </div>
  </main>`;
}

function Setup({ env, slot, onBack, onBegin }) {
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState([]);
  const pick = (id) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 2 ? [...c, id] : [c[1], id]));
  const party = chosen.length === 2 ? partyFor({ name: name.trim(), class: "rogue" }, chosen) : null;
  const problems = party ? partyProblems(party.slice(1)) : [];
  // The adventure's world (D151): Gravenhold unless the player asks for a pitch from a vibe. A pitch is written for
  // the two companions chosen, so choosing again clears it.
  const [vibe, setVibe] = useState("");
  const [pitched, setPitched] = useState(null);
  const [rejected, setRejected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => (setPitched(null), setRejected([])), [chosen.join()]);
  const pitch = async () => {
    setBusy(true);
    setError(null);
    try {
      const io = { sample: env.sample, speed: prefs.get().speed };
      const out = await pitchCall(io, { prompts: env.prompts }, { companions: chosen.map((id) => authored[id]), vibe: vibe.trim(), rejected, seed: pitchSeed((Math.random() * 2 ** 31) >>> 0) });
      if (pitched) setRejected((r) => [...r, pitched.pitch].slice(-3));
      setPitched(out);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const begin = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    onBegin(newSession({ packet: env.packet, player: { name: name.trim(), class: "rogue" }, companions: chosen, seed, world: pitched?.world ?? worldOf() }));
  };
  return html`<main className="setup gutter">
    <button className="link" style=${{ justifySelf: "start", paddingLeft: 0 }} onClick=${onBack}>Back</button>
    <h2>Who are you?</h2>
    <label className="field"><span>Your name</span><input id="player-name" value=${name} placeholder="The rogue" onChange=${(e) => setName(e.target.value)} /></label>
    <p className="muted">You're a rogue. Choose the two companions who wake in the cells beside you.</p>
    <div className="modes">
      ${Object.values(roster).map((c) => html`<button key=${c.id} className="who mode" aria-pressed=${chosen.includes(c.id)} style=${{ "--cc": c.color ?? "var(--gold)" }} onClick=${() => pick(c.id)}><strong>${c.name}</strong><span>${c.role}</span><span>${c.blurb}</span></button>`)}
    </div>
    ${problems.length ? html`<p className="error">${problems.join(" ")}</p>` : null}
    <h2>Where?</h2>
    <p className="muted">Gravenhold, unless you'd like an adventure of your own: type a vibe ("trapped in a creepy noble's masquerade, gothic and eldritch", "an epic escape from hell") and ask for a pitch.</p>
    <label className="field"><span>Your vibe</span><input id="vibe" value=${vibe} placeholder="Leave empty to be surprised" onChange=${(e) => setVibe(e.target.value)} /></label>
    <div style=${{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button onClick=${pitch} disabled=${!env.sample || !party || problems.length > 0 || busy}>${busy ? STATUS.pitch : pitched ? "Pitch me another" : "Pitch me an adventure"}</button>
      ${pitched ? html`<button className="link" onClick=${() => setPitched(null)}>Back to Gravenhold</button>` : null}
    </div>
    ${error ? html`<p className="error">${error}</p>` : null}
    ${pitched ? html`<div className="pitch"><strong>${pitched.world.name}</strong>${paras(pitched.pitch).map((t, i) => html`<p key=${i}>${t}</p>`)}<p className="muted small">Until encounters are generated, the first encounter is still Gravenhold's cells; the companions' stories and the world's facts follow this world.</p></div>` : null}
    <button className="primary" style=${{ justifySelf: "start" }} onClick=${begin} disabled=${!env.sample || !party || problems.length > 0 || busy}>${pitched ? `Wake up in ${pitched.world.name}` : "Wake up in the cells"}</button>
  </main>`;
}

// ---------- the game ----------

const TABS = [
  ["table", "Table"],
  ["plans", "Plans"],
];

function Game({ env, slot, initial, onQuit }) {
  const ref = useRef(initial);
  const session = ref.current;
  const [, setV] = useState(0);
  const refresh = () => setV((v) => v + 1);
  const [tab, setTab] = useState("table");
  const [seen, setSeen] = useState({ table: session.seq, plans: session.seq });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [menu, setMenu] = useState(false);
  const [dev, setDev] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [speed, setSpeed] = useState(prefs.get().speed);
  const [saved, setSaved] = useState(null);
  // The plan whose dice are being shown one step at a time.
  const [fresh, setFresh] = useState(null);
  const calls = useRef([]);
  const later = useRef(null);
  const s = session.state;

  // A call whose input crossed its budget is recorded in the save, so growth never goes unnoticed (D76).
  const onOver = (w) => (session.warnings ??= []).push({ ...w, tick: session.state.tick, at: Date.now() });
  const io = { sample: env.sample, speed, onStart: (call) => (setBusy(STATUS[call] ?? "Thinking…"), refresh()), onCall: (r) => (calls.current.unshift(r), recordCall(session, r)), onOver };

  const save = async () => {
    try {
      const where = await env.store.save(slot, { name: session.player.name || "The rogue", summary: `${s.packet.name ?? s.packet.id}, tick ${session.state.tick}${session.ended ? ", finished" : ""}` }, serialize(session));
      setSaved(where === "db" ? "Saved." : "Saved in this browser only.");
    } catch (e) {
      setSaved(errorText(e));
    }
  };
  useEffect(() => {
    save();
  }, []);
  // Editing the draft calls nothing, so it's saved a moment after the last change.
  const touch = () => {
    refresh();
    clearTimeout(later.current);
    later.current = setTimeout(save, 1200);
  };

  const run = async (where, fn) => {
    if (busy) return;
    setError(null);
    setBusy("…");
    try {
      await fn();
    } catch (e) {
      setError({ where, text: errorText(e) });
    } finally {
      setBusy(null);
      refresh();
      save();
    }
  };

  const feedSeq = {
    table: Math.max(0, ...session.feeds.table.map((e) => e.at)),
    plans: Math.max(0, ...session.feeds.plans.map((e) => e.at)),
  };
  useEffect(() => {
    setSeen((x) => ({ ...x, [tab]: feedSeq[tab] }));
  }, [tab, feedSeq[tab]]);

  const colors = Object.fromEntries(s.party.map((p) => [p.id, p.color ?? "#d8a94e"]));
  const exportFile = async (filename, data) => {
    if (!env.downloads) return setSaved("Downloads aren't available in this view.");
    try {
      await env.downloads.save({ filename, data });
    } catch (e) {
      if (e?.code !== "declined") setSaved(errorText(e));
    }
  };
  const props = { session, env, io, run, busy, refresh, touch, colors, onQuit };

  return html`<div className="game">
    <header className="top">
      <div className="topbar gutter">
        <span className="where">${s.packet.name ?? "Encounter"}</span>
        <${Clock} clock=${clockView(s)} compact=${true} />
        <button className="iconbtn" aria-expanded=${menu} onClick=${() => setMenu(!menu)}>Menu</button>
      </div>
      <div className="gutter"><div className="roster" style=${{ maxWidth: "1240px", margin: "0 auto 6px" }}>${partyView(s).map((p) => html`<span key=${p.id} className=${p.down ? "down" : ""}>${p.name}${p.form ? ` · ${p.form === "animal" ? "in animal form" : p.form}` : ""}${p.down ? " · down" : ""}${p.conditions.map((c) => ` · ${c}`).join("")}</span>`)}</div></div>
      ${menu
        ? html`<div className="gutter"><div className="menu">
            <div><b>Speed and quality.</b> <span className="muted small">Every call is charged to your own Claude usage.</span></div>
            <div className="speed">${SPEED.map(([id, label, note]) => html`<button key=${id} aria-pressed=${speed === id} title=${note} onClick=${() => (setSpeed(id), prefs.set({ speed: id }))}>${label}</button>`)}</div>
            <div className="row">
              <button className="ghost" onClick=${save}>Save now</button>
              <button className="ghost" onClick=${() => exportFile(`heist-dm-${session.player.name || "save"}-tick${s.tick}.json`, serialize(session))}>Export save</button>
              <button className="ghost" aria-pressed=${dev} onClick=${() => setDev(!dev)}>${dev ? "Hide" : "Show"} developer view</button>
              <button className="link" onClick=${onQuit}>Back to the title screen</button>
            </div>
            ${saved ? html`<span className="muted small">${saved}</span>` : null}
          </div></div>`
        : null}
      <div className="gutter"><nav className="tabs" aria-label="Interfaces">
        ${TABS.map(([id, label]) => html`<button key=${id} aria-current=${tab === id ? "page" : null} onClick=${() => setTab(id)}>${label}${tab !== id && feedSeq[id] > seen[id] ? html`<span className="dot" aria-label="new"></span>` : null}</button>`)}
        <button className="maptab" aria-pressed=${sideOpen} aria-current=${sideOpen ? "page" : null} onClick=${() => setSideOpen(!sideOpen)}>Map & party</button>
      </nav></div>
    </header>
    <div className="body gutter">
      <aside className=${`side${sideOpen ? "" : " closed"}`}>
        <${MapPanel} view=${mapView(s)} clock=${clockView(s)} colors=${colors} />
        <${PartySheet} sheet=${sheetView(s)} colors=${colors} />
      </aside>
      <main className="pane">
        ${tab === "table" ? html`<${TableTab} ...${props} error=${error?.where === "table" ? error.text : null} goPlans=${() => setTab("plans")} />` : null}
        ${tab === "plans" ? html`<${PlansTab} ...${props} error=${error?.where === "plans" ? error.text : null} fresh=${fresh} setFresh=${setFresh} />` : null}
        ${dev ? html`<${DevView} session=${session} calls=${calls.current} onExport=${exportFile} />` : null}
      </main>
    </div>
  </div>`;
}

// The party's abilities and what's left of them (D128), and what each is carrying until a rest.
function PartySheet({ sheet, colors }) {
  return html`<section className="partysheet" aria-label="The party">
    ${sheet.map((p) => html`<div key=${p.id} className="member" style=${{ "--cc": colors[p.id] }}>
      <b>${p.id === "player" ? `${p.name} (you)` : p.name}</b>
      ${p.abilities.map((a) => html`<details key=${a.id} className="ab"><summary><span>${a.name}</span><span className="left">${a.left}</span></summary><span className="muted">${a.effect}</span></details>`)}
      ${p.conditions.length ? html`<span className="cond">${p.conditions.join(" · ")}</span>` : null}
    </div>`)}
  </section>`;
}

function Narration({ text }) {
  return html`<div className="narr">${paras(text).map((p, i) => html`<p key=${i}>${p}</p>`)}</div>`;
}

// ---------- The table ----------

// What each addressee means, under the picker.
function hintFor(target, s) {
  if (target === "dm") return "A question. Nothing happens in the world, and what the DM tells you holds from now on.";
  if (target === "do") return "Something quick. The DM rules on it, and it may take time.";
  if (target === "party") return "Over the rings: only the party hears, and time stands still.";
  if (s.party.some((p) => p.id === target)) return "Only she hears this, through her ring.";
  return "Said aloud. They hear it, and so might anyone nearby.";
}
const PLACEHOLDER = { dm: "From her cell, could she see the key peg?", do: "I feel along the bench for a loose nail.", party: "How do we get those keys?" };

function TableTab({ session, env, io, run, busy, error, refresh, colors, onQuit, goPlans }) {
  const s = session.state;
  const [to, setTo] = useState("dm");
  const [text, setText] = useState("");
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [session.feeds.table.length]);
  const { seen, heard } = partyPerceives(s);
  const people = s.packet.people.filter((p) => s.at[p.id] && (seen.has(s.at[p.id]) || heard.has(s.at[p.id])) && !s.flags[p.id]?.down);
  const companions = s.party.slice(1);
  const valid = ["dm", "do", "party", ...people.map((p) => p.id), ...companions.map((c) => c.id)];
  const target = valid.includes(to) ? to : "dm";
  const ringed = target === "party" || companions.some((c) => c.id === target);
  const ended = !!session.ended;
  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    run("table", () => (target === "dm" ? question(session, io, env.prompts, { text: t }) : ringed ? rings(session, io, env.prompts, { to: target, text: t }) : talk(session, io, env.prompts, { to: target, text: t })));
  };
  const who = (id) => speaker(s, id);
  const mine = (e) => (e.ch === "dm" ? "You, to the DM" : e.ch === "rings" ? "You, over the rings" : e.ch === "private" ? `You, privately to ${who(e.with)}` : e.to === "do" ? "You" : `You, to ${who(e.to)}`);
  const chip = (id, label) => html`<button key=${id} aria-pressed=${target === id} onClick=${() => setTo(id)}>${label}</button>`;
  return html`<section className="feed" aria-label="Table">
    ${session.feeds.table.map((e) => {
      if (e.ch === "narration") return html`<${Narration} key=${e.at} text=${e.text} />`;
      if (e.who === "player")
        return html`<div key=${e.at} className=${`say player${e.failed ? " failed" : ""}`}><span className="from">${mine(e)}</span><span className="text">${e.text}</span>
          ${e.failed ? html`<span className="retry small">Didn't go through. <button className="link" disabled=${!!busy} onClick=${() => run("table", () => resend(session, io, env.prompts, e))}>Send again</button><button className="link" disabled=${!!busy} onClick=${() => (drop(session, e), refresh())}>Remove</button></span>` : null}
        </div>`;
      if (e.kind === "check")
        return html`<div key=${e.at} className="check"><span><span className=${`pill ${e.success ? "ok" : "bad"}`}>${e.success ? "Success" : "Failure"}</span> <span className="small muted">${who(e.actor)}, ${BAND[e.difficulty]}</span></span><span>${e.text}</span></div>`;
      if (e.kind === "redirect")
        return html`<div key=${e.at} className="redirect"><span className="small muted">That's a plan:</span><q>${e.text}</q>${e.added ? html`<button className="link" onClick=${goPlans}>On your plan</button>` : html`<button className="ghost" onClick=${() => (addToPlan(session, e), refresh())}>Add to the plan</button>`}</div>`;
      if (e.kind === "time") return html`<p key=${e.at} className="small muted">${e.text}</p>`;
      if (s.party.some((p) => p.id === e.who))
        return html`<div key=${e.at} className=${`say comp${e.text ? "" : " pass"}`} style=${{ "--cc": colors[e.who] }}>
          <span className="from">${who(e.who)}${e.ch === "private" ? ", privately" : ""}</span>
          <span className="text">${e.text ?? `${who(e.who)} lets it go.`}</span>
          ${e.stance ? html`<span className="stance">${e.stance.kind === "refuse" ? "Refuses" : e.stance.kind === "insist" ? "Insists" : "On one condition"}: ${e.stance.text}. It's on your plan for you to decide.</span>` : null}
        </div>`;
      return html`<div key=${e.at} className="say"><span className="from">${who(e.who)}</span><span className="text">${e.text}</span>${e.rulings ? html`<span className="ruled">${e.rulings.map((r, i) => html`<span key=${i}>Holds from now on: ${r}</span>`)}</span>` : null}</div>`;
    })}
    <div ref=${end}></div>
    ${ended
      ? html`<${Ending} session=${session} onQuit=${onQuit} />`
      : html`<div className="composer">
          <div className="to" role="group" aria-label="Who it's for">
            ${chip("dm", "Ask the DM")}${chip("do", "Do something")}
            ${people.map((p) => chip(p.id, p.name.split(",")[0]))}
            <span className="sep" aria-hidden="true"></span>
            ${chip("party", "The party")}
            ${companions.map((c) => chip(c.id, `${c.name}, privately`))}
          </div>
          <span className="hint">${hintFor(target, s)}</span>
          <textarea id="table-input" rows="2" value=${text} disabled=${!!busy} onChange=${(e) => setText(e.target.value)}
            onKeyDown=${(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder=${PLACEHOLDER[target] ?? (ringed ? "Just between us…" : "What do you say?")}></textarea>
          ${error ? html`<p className="error">${error}</p>` : null}
          <div className="row"><span className="status">${busy ?? ""}</span><button className="primary" disabled=${!!busy || !text.trim()} onClick=${send}>Send</button></div>
        </div>`}
  </section>`;
}

// ---------- Plans ----------

const HAPPENED = { yes: "Done", partly: "Partly done", no: "Didn't happen" };

// A plan that ran: its steps one at a time, each with its roll (already rolled, so showing them costs nothing),
// then the DM's telling.
function Outcome({ o, animate, onDone }) {
  const total = o.steps.length;
  const [n, setN] = useState(animate ? 0 : total);
  useEffect(() => {
    if (n >= total) return void (animate && onDone?.());
    const t = setTimeout(() => setN(n + 1), 900);
    return () => clearTimeout(t);
  }, [n, total]);
  return html`<div className="outcome">
    <ol className="steps">
      ${o.steps.slice(0, n).map((st) => html`<li key=${st.n} className="step reveal">
        <span className="n">${st.n}</span>
        <div className="main">
          <span>${st.summary}</span>
          <div className="timing">
            ${st.roll ? html`<span className=${`pill ${st.roll.success ? "ok" : "bad"}`}>${BAND[st.roll.band]} · ${st.roll.success ? "made it" : "failed"}</span>` : html`<span className="pill">No roll</span>`}
            <span className="small muted">${HAPPENED[st.happened]}</span>
          </div>
          ${o.stopped?.at === st.n ? html`<span className="fails">The plan stopped here: ${o.stopped.why}</span>` : null}
        </div>
      </li>`)}
    </ol>
    ${n < total ? html`<div className="row"><span className="status">Rolling…</span><button className="link" onClick=${() => setN(total)}>Show it all</button></div>` : html`<${Narration} text=${o.narration} />`}
  </div>`;
}

function PlanRun({ entry, open, animate, onDone }) {
  return html`<details className="check" open=${open}>
    <summary><span className="pill gold">Plan</span> ${entry.text.length > 90 ? `${entry.text.slice(0, 90)}…` : entry.text}</summary>
    ${entry.outcome ? html`<${Outcome} o=${entry.outcome} animate=${animate} onDone=${onDone} />` : html`<${CardBody} view=${entry.card} />`}
  </details>`;
}

function PlansTab({ session, env, io, run, busy, error, refresh, touch, onQuit, fresh, setFresh }) {
  const [onCard, setOnCard] = useState(true);
  const stale = cardStale(session);
  const runs = session.feeds.plans;
  const make = () => run("plans", async () => (await makeCard(session, io, env.prompts), setOnCard(true)));
  const play = (checkpoints) =>
    run("plans", async () => {
      await commit(session, io, env.prompts, { checkpoints });
      setFresh(session.feeds.plans.at(-1)?.at ?? null);
    });
  return html`<section className="feed" aria-label="Plans">
    ${runs.map((e, i) => html`<${PlanRun} key=${e.at} entry=${e} open=${i === runs.length - 1} animate=${fresh === e.at} onDone=${() => setFresh(null)} />`)}
    ${fresh !== null
      ? null
      : session.ended
      ? html`<${Ending} session=${session} onQuit=${onQuit} />`
      : session.card && !stale && onCard
        ? html`<${CardSheet} session=${session} busy=${busy} error=${error} onEdit=${() => setOnCard(false)} onRun=${play} />`
        : html`<${DraftBuilder} session=${session} busy=${busy} error=${error} touch=${touch} stale=${stale}
            onBack=${session.card && !stale ? () => setOnCard(true) : null} onMake=${make}
            onTalk=${() => run("plans", () => talkOver(session, io, env.prompts))} />`}
  </section>`;
}

function Stances({ session, touch }) {
  const s = session.state;
  if (!session.draft.stances.length) return null;
  const color = (id) => s.party.find((p) => p.id === id)?.color;
  return html`<div className="stances">
    <span className="small muted">Stances on this plan. Decide each before the card is made.</span>
    ${session.draft.stances.map((st, i) => html`<div key=${i} className="stancebox" style=${{ "--cc": color(st.companion) }}>
      <span><b>${nameOf(s, st.companion)} ${st.kind === "refuse" ? "refuses" : st.kind === "insist" ? "insists" : "has a condition"}:</b> ${st.text}</span>
      <div className="choices">
        ${[
          ["keep", "Keep it", "It stands: if it trips, she won't do that step."],
          ["resolved", "It's handled", "The plan already deals with it."],
          ["override", "Override", "Go ahead anyway. She'll remember."],
        ].map(([d, label, note]) => html`<button key=${d} title=${note} aria-pressed=${st.decision === d} onClick=${() => ((st.decision = d), touch())}>${label}</button>`)}
        <button className="link" onClick=${() => (session.draft.stances.splice(i, 1), touch())}>Drop</button>
      </div>
    </div>`)}
  </div>`;
}

// The plan as a list of actions (D134): Enter adds one, nothing is sent until the card is made, and the list stays
// as written after the plan runs.
function DraftBuilder({ session, busy, error, touch, stale, onBack, onMake, onTalk }) {
  const d = session.draft;
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(null);
  const [clearing, setClearing] = useState(false);
  const add = () => {
    if (!text.trim()) return;
    addItem(d, text);
    setText("");
    touch();
  };
  const saveEdit = () => {
    if (editing) editItem(d, editing.id, editing.text);
    setEditing(null);
    touch();
  };
  const n = d.items.length;
  return html`<div className="composer">
    <div className="row"><b>The plan</b>${n ? html`<span className="small muted">Tap an action to change it.</span>` : null}</div>
    ${n
      ? html`<ol className="plan-list">
          ${d.items.map((x, i) =>
            editing?.id === x.id
              ? html`<li key=${x.id} className="plan-item"><span className="n">${i + 1}</span>
                  <input id=${`plan-edit-${x.id}`} autoFocus value=${editing.text} onChange=${(e) => setEditing({ id: x.id, text: e.target.value })} onBlur=${saveEdit}
                    onKeyDown=${(e) => (e.key === "Enter" ? (e.preventDefault(), saveEdit()) : e.key === "Escape" ? setEditing(null) : null)} />
                  <span className="tools"><button aria-label="Done" onMouseDown=${(e) => e.preventDefault()} onClick=${saveEdit}>✓</button></span></li>`
              : html`<li key=${x.id} className="plan-item"><span className="n">${i + 1}</span>
                  <button className="text" disabled=${!!busy} onClick=${() => setEditing({ id: x.id, text: x.text })}>${x.text}</button>
                  <span className="tools">
                    <button aria-label="Move up" disabled=${!!busy || i === 0} onClick=${() => (moveItem(d, x.id, -1), touch())}>↑</button>
                    <button aria-label="Move down" disabled=${!!busy || i === n - 1} onClick=${() => (moveItem(d, x.id, 1), touch())}>↓</button>
                    <button aria-label="Delete" disabled=${!!busy} onClick=${() => (removeItem(d, x.id), touch())}>×</button>
                  </span></li>`,
          )}
        </ol>`
      : html`<p className="small muted" style=${{ margin: 0 }}>Add the plan one action at a time: who does what, in order, with any "when" or "if". Nothing goes to the DM until you make the card.</p>`}
    ${stale ? html`<p className="small muted" style=${{ margin: 0 }}>You've changed the plan since its card was made. Make the card again to price it.</p>` : null}
    <textarea id="plan-input" rows="2" value=${text} disabled=${!!busy} onChange=${(e) => setText(e.target.value)}
      onKeyDown=${(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), add())} placeholder="Fern turns into a rat while Snag drinks."></textarea>
    <${Stances} session=${session} touch=${touch} />
    ${error ? html`<p className="error">${error}</p>` : null}
    <div className="row">
      <span style=${{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <button className="ghost" disabled=${!!busy || !text.trim()} onClick=${add}>Add</button>
        ${clearing
          ? html`<span><button className="link danger" onClick=${() => (clearDraft(d), setClearing(false), touch())}>Clear it all</button><button className="link" onClick=${() => setClearing(false)}>Keep</button></span>`
          : html`<button className="link" disabled=${!!busy || !n} onClick=${() => setClearing(true)}>Clear the plan</button>`}
      </span>
      <span style=${{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span className="status">${busy ?? ""}</span>
        <button className="ghost" disabled=${!!busy || !n} title="Say it over the rings; both companions react." onClick=${onTalk}>Talk it over</button>
        ${onBack ? html`<button className="ghost" disabled=${!!busy} onClick=${onBack}>Back to the card</button>` : null}
        <button className="primary" disabled=${!!busy || !n} onClick=${onMake}>${session.card ? "Make the card again" : "Make the card"}</button>
      </span>
    </div>
  </div>`;
}

function CardBody({ view, checkpoints, toggle }) {
  return html`<div style=${{ display: "grid", gap: "10px" }}>
    <ol className="steps">
      ${view.steps.map((st) => html`<li key=${st.n} className="step">
        <span className="n">${st.n}</span>
        <div className="main">
          <span>${st.summary}</span>
          <div className="timing">
            ${(st.on ?? []).map((o) => html`<span key=${o} className="pill">${o}</span>`)}
            ${st.waits ? html`<span className="pill gold">${st.waits}</span>` : null}
            ${st.if ? html`<span className="pill gold">${st.if}</span>` : null}
          </div>
          ${st.risks.map((r, i) => html`<div key=${i} className="risk"><span><span className=${`pill ${r.band === "Easy" ? "ok" : r.band === "Medium" ? "gold" : "bad"}`}>${r.band}</span> ${r.reason}</span><span className="fails">If it fails: ${r.fails}${r.stops ? " The plan stops there." : ""}</span></div>`)}
          ${(st.mitigations ?? []).map((m, i) => html`<span key=${"m" + i} className="covered">Covered: ${m}</span>`)}
          ${!st.risks.length && !(st.mitigations ?? []).length ? html`<span className="covered">No roll.</span>` : null}
          ${toggle && st.n < view.steps.length ? html`<label className="pause"><input id=${`pause-${st.n}`} type="checkbox" checked=${checkpoints.has(st.n)} onChange=${() => toggle(st.n)} /> Pause after this step</label>` : null}
        </div>
      </li>`)}
    </ol>
    ${view.done ? html`<div className="small"><b>${view.done}.</b></div>` : null}
    ${view.rulings?.length ? html`<div className="small muted">${view.rulings.map((r, i) => html`<div key=${i}>Ruling: ${r}</div>`)}</div>` : null}
    ${view.notes?.length ? html`<div className="small muted">${view.notes.map((r, i) => html`<div key=${i}>${r}</div>`)}</div>` : null}
  </div>`;
}

function CardSheet({ session, busy, error, onEdit, onRun }) {
  const view = shown(session);
  const [checkpoints, setCheckpoints] = useState(new Set());
  const toggle = (n) => setCheckpoints((c) => (c.has(n) ? (c.delete(n), new Set(c)) : new Set(c.add(n))));
  return html`<div className="sheet-wrap"><div className="sheet gutter"><section className="card" aria-label="The card">
    <h3>The card</h3>
    <p className="small muted" style=${{ margin: 0 }}>${view.plan}</p>
    <${CardBody} view=${view} checkpoints=${checkpoints} toggle=${toggle} />
    ${view.stances.length ? html`<div className="small muted">${view.stances.map((st, i) => html`<div key=${i}>${nameOf(session.state, st.companion)}: ${st.text} (${st.decision})</div>`)}</div>` : null}
    ${error ? html`<p className="error">${error}</p>` : null}
    <div className="cardfoot">
      <span className="status" style=${{ marginRight: "auto" }}>${busy ?? ""}</span>
      <button className="ghost" disabled=${!!busy} onClick=${onEdit}>Edit the plan</button>
      <button className="primary" disabled=${!!busy} onClick=${() => onRun([...checkpoints])}>Run the plan</button>
    </div>
  </section></div></div>`;
}

function Ending({ session, onQuit }) {
  const h = session.ended;
  const s = session.state;
  const label = [s.packet.intent.objective, ...(s.packet.intent.alternates ?? []), s.packet.intent.fail_forward].find((o) => o?.id === h.outcome)?.label ?? h.outcome;
  return html`<section className="ending">
    <h2>${label}</h2>
    <p className="muted">${h.log}</p>
    <p className="small muted">The next encounter isn't built yet. Your save keeps this ending.</p>
    <button className="primary" style=${{ justifySelf: "start" }} onClick=${onQuit}>Back to the title screen</button>
  </section>`;
}

// ---------- Developer view ----------

function DevView({ session, calls, onExport }) {
  const c = session.counts;
  const replay = () => JSON.stringify({ start: { ...session.start, party: session.state.party.map((p) => p.id), player: session.player }, actions: session.actions });
  return html`<section className="dev" aria-label="Developer view">
    <h3 style=${{ margin: 0 }}>Developer view</h3>
    <div className="counts"><span>Exchanges: <b>${c.exchanges}</b></span><span>Card edits: <b>${c.edits}</b></span><span>Everyone out of their starting zone at exchange: <b>${c.out ?? "not yet"}</b></span><span>Tick: <b>${session.state.tick}</b></span>${session.state.facts ? html`<span>Facts: <b>${session.state.facts.length}/${LEDGER.facts}</b></span>` : null}<span>Input sent this session: <b>${(calls.reduce((n, r) => n + r.size, 0) / 1024).toFixed(0)} KB</b> in ${calls.length} calls</span></div>
    ${session.warnings?.length ? html`<p className="error">${session.warnings.length} call${session.warnings.length > 1 ? "s" : ""} went over budget: ${session.warnings.slice(-3).map((w) => `${w.call} ${(w.size / 1024).toFixed(1)} KB of ${(w.budget / 1024).toFixed(0)} KB at tick ${w.tick}`).join("; ")}. Worth a look: something is growing.</p>` : null}
    <div className="row" style=${{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button className="ghost" onClick=${() => onExport(`heist-dm-replay-tick${session.state.tick}.json`, replay())}>Export this session's replay log</button>
      <button className="ghost" onClick=${() => onExport(`heist-dm-postmortem-tick${session.state.tick}.json`, serialize(session))}>Export for a post-mortem (save, replay log, last ${session.calls?.length ?? 0} call outputs)</button>
    </div>
    ${session.reactions.length ? html`<details><summary>Companion reactions (recorded, not scored yet): ${session.reactions.length}</summary><pre>${JSON.stringify(session.reactions, null, 1)}</pre></details>` : null}
    <details><summary>State, canon and event log</summary><pre>${JSON.stringify({ tick: session.state.tick, pending: session.state.pending, facts: session.state.facts, off_routine: session.state.offRoutine, flags: session.state.flags, meters: session.state.meters, dispositions: session.state.disposition, revealed: session.state.known.revealed, canon: session.state.canon, log: session.state.log }, null, 1)}</pre></details>
    ${calls.map((r, i) => html`<details key=${r.at + "-" + i}>
      <summary><b>${r.call}</b><span>${r.tier}</span><span>${(r.size / 1024).toFixed(1)} KB</span><span>${r.ms ?? "…"} ms</span>${r.firstErrors ? html`<span className="pill gold">retried</span>` : null}${r.errors?.length || r.error ? html`<span className="pill bad">failed</span>` : null}</summary>
      ${r.error ? html`<p className="error">${r.error}</p>` : null}
      ${r.firstErrors ? html`<pre>First try's problems:\n${r.firstErrors.join("\n")}</pre>` : null}
      <pre>${JSON.stringify(r.out ?? r.first ?? null, null, 1)}</pre>
      <details><summary>Input</summary><pre>${r.input}</pre></details>
    </details>`)}
  </section>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
