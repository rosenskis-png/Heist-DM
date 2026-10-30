// The game page (docs/spec/ui.md): the title screen and saves, setup, and the three interfaces (Plan, Moment,
// Companions) around the map and clock. All game logic lives in src/; this file draws it and handles input.
import { html, useState, useEffect, useRef } from "./h.js";
import { MapPanel, Clock } from "./map.js";
import { openStore, prefs, SLOTS } from "./store.js";
import { newSession, serialize, restore, partyFor } from "../src/game/session.js";
import { huddle, moment, makeCard, commit, shown } from "../src/game/turns.js";
import { mapView, clockView, partyView, BAND } from "../src/game/view.js";
import { partyPerceives } from "../src/engine/perceive.js";
import { nameOf } from "../src/engine/world.js";

const PROMPTS = ["style", "step", "pricing", "world", "narration", "companion", "ruling", "moment"];
const url = (p) => new URL(`../${p}`, import.meta.url);
const STATUS = {
  step: "Writing out the steps…",
  pricing: "Weighing the risks…",
  ruling: "Making a ruling…",
  world: "The world responds…",
  narration: "The DM tells what happens…",
  moment: "The DM considers…",
  companion: "Your companions are thinking…",
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
  const party = partyFor({ name: name.trim(), class: "rogue" }, env.packet);
  const begin = () => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    onBegin(newSession({ packet: env.packet, player: { name: name.trim(), class: "rogue" }, seed }));
  };
  return html`<main className="setup gutter">
    <button className="link" style=${{ justifySelf: "start", paddingLeft: 0 }} onClick=${onBack}>Back</button>
    <h2>Who are you?</h2>
    <label className="field"><span>Your name</span><input id="player-name" value=${name} placeholder="The rogue" onChange=${(e) => setName(e.target.value)} /></label>
    <p className="muted">The Cells are built for this party. Choosing your class and companions comes later.</p>
    <div className="party">
      ${party.map((p) => html`<div key=${p.id} className="who" style=${{ "--cc": p.color ?? "var(--gold)" }}><strong>${p.id === "player" ? p.name : p.name}</strong><span>${p.id === "player" ? "You, a rogue" : p.role}</span><span>${p.blurb}</span></div>`)}
    </div>
    <button className="primary" style=${{ justifySelf: "start" }} onClick=${begin} disabled=${!env.sample}>Wake up in the cells</button>
  </main>`;
}

// ---------- the game ----------

const TABS = [
  ["plan", "Plan"],
  ["moment", "Moment"],
  ["companions", "Companions"],
];

function Game({ env, slot, initial, onQuit }) {
  const ref = useRef(initial);
  const session = ref.current;
  const [, setV] = useState(0);
  const refresh = () => setV((v) => v + 1);
  const [tab, setTab] = useState("plan");
  const [seen, setSeen] = useState({ plan: session.seq, moment: session.seq, companions: session.seq });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [menu, setMenu] = useState(false);
  const [dev, setDev] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [speed, setSpeed] = useState(prefs.get().speed);
  const [saved, setSaved] = useState(null);
  const calls = useRef([]);
  const s = session.state;

  const io = { sample: env.sample, speed, onStart: (call) => (setBusy(STATUS[call] ?? "Thinking…"), refresh()), onCall: (r) => calls.current.unshift(r) };

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
    plan: Math.max(0, ...session.feeds.plan.map((e) => e.at)),
    moment: Math.max(0, ...session.feeds.moment.map((e) => e.at)),
    companions: Math.max(0, ...[session.feeds.huddle, ...Object.values(session.feeds.private)].flat().map((e) => e.at)),
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

  return html`<div className="game">
    <header className="top">
      <div className="topbar gutter">
        <span className="where">${s.packet.name ?? "Encounter"}</span>
        <${Clock} clock=${clockView(s)} compact=${true} />
        <button className="iconbtn" aria-expanded=${menu} onClick=${() => setMenu(!menu)}>Menu</button>
      </div>
      <div className="gutter"><div className="hp" style=${{ maxWidth: "1240px", margin: "0 auto 6px" }}>${partyView(s).map((p) => html`<span key=${p.id} className=${p.down ? "down" : ""}>${p.name} ${p.hp}/${p.max} HP${p.form === "animal" ? " · a rat" : ""}${p.down ? " · down" : ""}</span>`)}</div></div>
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
        <button className="maptab" aria-pressed=${sideOpen} aria-current=${sideOpen ? "page" : null} onClick=${() => setSideOpen(!sideOpen)}>Map</button>
      </nav></div>
    </header>
    <div className="body gutter">
      <aside className=${`side${sideOpen ? "" : " closed"}`}>
        <${MapPanel} view=${mapView(s)} clock=${clockView(s)} colors=${colors} />
      </aside>
      <main className="pane">
        ${tab === "plan" ? html`<${PlanTab} session=${session} env=${env} io=${io} run=${run} busy=${busy} error=${error?.where === "plan" ? error.text : null} refresh=${refresh} onQuit=${onQuit} />` : null}
        ${tab === "moment" ? html`<${MomentTab} session=${session} env=${env} io=${io} run=${run} busy=${busy} error=${error?.where === "moment" ? error.text : null} refresh=${refresh} />` : null}
        ${tab === "companions" ? html`<${CompanionsTab} session=${session} env=${env} io=${io} run=${run} busy=${busy} error=${error?.where === "companions" ? error.text : null} colors=${colors} />` : null}
        ${dev ? html`<${DevView} session=${session} calls=${calls.current} onExport=${exportFile} />` : null}
      </main>
    </div>
  </div>`;
}

// ---------- Plan ----------

function Narration({ text }) {
  return html`<div className="narr">${paras(text).map((p, i) => html`<p key=${i}>${p}</p>`)}</div>`;
}

function PlanTab({ session, env, io, run, busy, error, refresh, onQuit }) {
  const s = session.state;
  const [editing, setEditing] = useState(false);
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [session.feeds.plan.length]);
  const showCard = session.card && !editing;
  return html`<section className="feed" aria-label="Plan">
    ${session.feeds.plan.map((e) =>
      e.kind === "narration"
        ? html`<${Narration} key=${e.at} text=${e.text} />`
        : e.kind === "card"
          ? html`<details key=${e.at} className="check"><summary><span className="pill gold">Plan</span> ${e.text.length > 90 ? `${e.text.slice(0, 90)}…` : e.text}</summary><${CardBody} view=${e.card} /></details>`
          : html`<p key=${e.at} className="system">${e.text}</p>`,
    )}
    <div ref=${end}></div>
    ${session.ended
      ? html`<${Ending} session=${session} onQuit=${onQuit} />`
      : s.combat
        ? html`<p className="check">You're in a fight. Say what everyone does in the Moment tab, a round at a time.</p>`
        : showCard
          ? html`<${CardSheet} session=${session} busy=${busy} error=${error} onEdit=${() => setEditing(true)} onRun=${(checkpoints) => run("plan", () => commit(session, io, env.prompts, { checkpoints }))} />`
          : html`<${Draft} session=${session} busy=${busy} error=${error} refresh=${refresh} editing=${!!session.card} onCancel=${() => setEditing(false)}
              onMake=${() => run("plan", async () => (await makeCard(session, io, env.prompts), setEditing(false)))} />`}
  </section>`;
}

function Stances({ session, refresh }) {
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
        ].map(([d, label, note]) => html`<button key=${d} title=${note} aria-pressed=${st.decision === d} onClick=${() => ((st.decision = d), refresh())}>${label}</button>`)}
        <button className="link" onClick=${() => (session.draft.stances.splice(i, 1), refresh())}>Drop</button>
      </div>
    </div>`)}
  </div>`;
}

function Draft({ session, busy, error, refresh, editing, onCancel, onMake }) {
  return html`<div className="composer">
    <label htmlFor="plan-draft" className="small muted">The plan, in your words. Number the steps if you like, and say when ("when he sits down…") and what if ("if the cask is unguarded…, otherwise…").</label>
    <textarea id="plan-draft" rows="6" value=${session.draft.plan} disabled=${!!busy} onChange=${(e) => ((session.draft.plan = e.target.value), refresh())}
      placeholder="1. While Snag is at the cask, Fern turns into a rat…"></textarea>
    <${Stances} session=${session} refresh=${refresh} />
    ${error ? html`<p className="error">${error}</p>` : null}
    <div className="row">
      <span className="status">${busy ?? ""}</span>
      <span style=${{ display: "flex", gap: "8px" }}>
        ${editing ? html`<button className="ghost" disabled=${!!busy} onClick=${onCancel}>Back to the card</button>` : null}
        <button className="primary" disabled=${!!busy || !session.draft.plan.trim()} onClick=${onMake}>${editing ? "Remake the card" : "Make the card"}</button>
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
          ${!st.risks.length && !(st.mitigations ?? []).length ? html`<span className="covered">No risk the party can see.</span>` : null}
          ${toggle && st.n < view.steps.length ? html`<label className="pause"><input id=${`pause-${st.n}`} type="checkbox" checked=${checkpoints.has(st.n)} onChange=${() => toggle(st.n)} /> Pause after this step</label>` : null}
        </div>
      </li>`)}
    </ol>
    ${view.rulings?.length ? html`<div className="small muted">${view.rulings.map((r, i) => html`<div key=${i}>Ruling: ${r}</div>`)}</div>` : null}
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

// ---------- Moment ----------

function MomentTab({ session, env, io, run, busy, error, refresh }) {
  const s = session.state;
  const [to, setTo] = useState(session.talking ?? "dm");
  const [text, setText] = useState("");
  const fight = !!s.combat;
  const { seen, heard } = partyPerceives(s);
  const people = s.packet.people.filter((p) => s.at[p.id] && (seen.has(s.at[p.id]) || heard.has(s.at[p.id])) && !s.flags[p.id]?.down);
  const target = fight ? "dm" : people.some((p) => p.id === to) ? to : "dm";
  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    run("moment", () => moment(session, io, env.prompts, { to: target, text: t }));
  };
  const addToPlan = (e) => {
    session.draft.plan = `${session.draft.plan.trim()}${session.draft.plan.trim() ? "\n" : ""}${e.text}`;
    e.added = true;
    refresh();
  };
  const who = (id) => (id === "dm" ? "DM" : id === "player" ? "You" : nameOf(s, id));
  return html`<section className="feed" aria-label="Moment">
    ${!session.feeds.moment.length ? html`<p className="muted">Ask the DM anything about where you are, or talk to someone you can see or hear. Questions are free; checks and conversations take a little time. Anything that moves someone or changes the world goes on the plan.</p>` : null}
    ${session.feeds.moment.map((e) => {
      if (e.who === "player") return html`<div key=${e.at} className="say player"><span className="from">You${e.to && e.to !== "dm" ? ` to ${who(e.to)}` : ""}</span><span className="text">${e.text}</span></div>`;
      if (e.kind === "check" || e.kind === "action")
        return html`<div key=${e.at} className="check"><span><span className=${`pill ${e.success ? "ok" : "bad"}`}>${e.success ? "Success" : "Failure"}</span> <span className="small muted">${who(e.actor)}${e.skill ? `, ${e.skill}` : ""}, ${BAND[e.difficulty]}</span></span><span>${e.text}</span></div>`;
      if (e.kind === "redirect")
        return html`<div key=${e.at} className="redirect"><span className="small muted">For the plan:</span><q>${e.text}</q>${e.added ? html`<span className="small muted">Added to your draft.</span>` : html`<button className="ghost" onClick=${() => addToPlan(e)}>Add to the plan</button>`}</div>`;
      if (e.kind === "hits" || e.kind === "over") return html`<p key=${e.at} className="system">${e.text}</p>`;
      return html`<div key=${e.at} className="say"><span className="from">${who(e.who)}</span><span className="text">${e.text}</span></div>`;
    })}
    <div className="composer">
      ${fight
        ? html`<span className="small"><b>This round.</b> Say what everyone in the party does.</span>`
        : html`<div className="to" role="group" aria-label="Talk to">
            <button aria-pressed=${target === "dm"} onClick=${() => setTo("dm")}>Ask the DM</button>
            ${people.map((p) => html`<button key=${p.id} aria-pressed=${target === p.id} onClick=${() => setTo(p.id)}>${p.name.split(",")[0]}</button>`)}
          </div>`}
      <textarea id="moment-input" rows="2" value=${text} disabled=${!!busy || !!session.ended} onChange=${(e) => setText(e.target.value)}
        onKeyDown=${(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
        placeholder=${fight ? "I go for his knees; Lyra…" : target === "dm" ? "From her cell, could Lyra see the key peg?" : "What do you say?"}></textarea>
      ${error ? html`<p className="error">${error}</p>` : null}
      <div className="row"><span className="status">${busy ?? ""}</span><button className="primary" disabled=${!!busy || !text.trim() || !!session.ended} onClick=${send}>${fight ? "Go" : "Send"}</button></div>
    </div>
  </section>`;
}

// ---------- Companions ----------

function CompanionsTab({ session, env, io, run, busy, error, colors }) {
  const s = session.state;
  const [channel, setChannel] = useState("all");
  const [text, setText] = useState("");
  const companions = s.party.slice(1);
  const feed = channel === "all" ? session.feeds.huddle : session.feeds.private[channel];
  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    run("companions", () => huddle(session, io, env.prompts, { to: channel, text: t }));
  };
  const name = (id) => (id === "player" ? "You" : nameOf(s, id));
  return html`<section className="feed" aria-label="Companions">
    <div className="to" role="group" aria-label="Channel">
      <button aria-pressed=${channel === "all"} onClick=${() => setChannel("all")}>Everyone</button>
      ${companions.map((c) => html`<button key=${c.id} aria-pressed=${channel === c.id} onClick=${() => setChannel(c.id)}>${c.name}, privately</button>`)}
    </div>
    ${!feed.length ? html`<p className="muted">${channel === "all" ? "Time stops while you talk it over. Nothing said here moves the world; only the plan you commit does." : "Only she hears this, through her ring."}</p>` : null}
    ${feed.map((e) =>
      e.who === "player"
        ? html`<div key=${e.at} className="say player"><span className="from">You</span><span className="text">${e.text}</span></div>`
        : html`<div key=${e.at} className=${`say comp${e.text ? "" : " pass"}`} style=${{ "--cc": colors[e.who] }}>
            <span className="from">${name(e.who)}</span>
            <span className="text">${e.text ?? `${name(e.who)} lets it go.`}</span>
            ${e.stance ? html`<span className="stance">${e.stance.kind === "refuse" ? "Refuses" : e.stance.kind === "insist" ? "Insists" : "On one condition"}: ${e.stance.text}. It's on your draft for you to decide.</span>` : null}
          </div>`,
    )}
    <div className="composer">
      <textarea id="huddle-input" rows="2" value=${text} disabled=${!!busy} onChange=${(e) => setText(e.target.value)}
        onKeyDown=${(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder=${channel === "all" ? "Fern, could you get the keys as a rat?" : "Just between us…"}></textarea>
      ${error ? html`<p className="error">${error}</p>` : null}
      <div className="row"><span className="status">${busy ?? ""}</span><button className="primary" disabled=${!!busy || !text.trim()} onClick=${send}>Send</button></div>
    </div>
  </section>`;
}

// ---------- Developer view ----------

function DevView({ session, calls, onExport }) {
  const c = session.counts;
  const replay = () => JSON.stringify({ start: { ...session.start, party: session.state.party.map((p) => p.id), player: session.player }, actions: session.actions });
  return html`<section className="dev" aria-label="Developer view">
    <h3 style=${{ margin: 0 }}>Developer view</h3>
    <div className="counts"><span>Exchanges: <b>${c.exchanges}</b></span><span>Card edits: <b>${c.edits}</b></span><span>Everyone out of their starting zone at exchange: <b>${c.out ?? "not yet"}</b></span><span>Tick: <b>${session.state.tick}</b></span></div>
    <div className="row" style=${{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button className="ghost" onClick=${() => onExport(`heist-dm-replay-tick${session.state.tick}.json`, replay())}>Export this session's replay log</button>
    </div>
    ${session.reactions.length ? html`<details><summary>Companion reactions (recorded, not scored yet): ${session.reactions.length}</summary><pre>${JSON.stringify(session.reactions, null, 1)}</pre></details>` : null}
    <details><summary>State, canon and event log</summary><pre>${JSON.stringify({ tick: session.state.tick, pending: session.state.pending, flags: session.state.flags, meters: session.state.meters, dispositions: session.state.disposition, revealed: session.state.known.revealed, canon: session.state.canon, log: session.state.log }, null, 1)}</pre></details>
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
