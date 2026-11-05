// The encounter loop (docs/spec/architecture.md): the table and the plans. The DM rules and the engine keeps the
// books (D75): the DM makes the card, the engine rolls its dice, and the DM plays it out against the real world,
// records what changed and tells it (D78). Code decides which calls a message runs, from who it's for (D127):
//
// | The player                        | Calls                                          | Here       |
// |-----------------------------------|------------------------------------------------|------------|
// | asks the DM                       | the question call, cheap, on the slice (D133)  | `question` |
// | speaks to a person, or does a thing | the scene call, then the party call          | `talk`     |
// | talks to the party, over the rings | the party call (D132)                         | `rings`    |
// | says a private word to one        | her companion call                             | `rings`    |
// | talks the plan over               | the party call                                 | `talkOver` |
// | asks for the card, runs it        | adjudicate, then resolve                       | `makeCard`, `commit` |
//
// Each function takes the session, the runtime `io` and the prompts, makes its calls through `src/calls/`, and
// changes state only through engine actions. No DOM, so `node --test` can play it with recorded outputs.
import { nameOf, zoneOf, isParty } from "../engine/world.js";
import { ledgerText, aheadText } from "../context.js";
import { withRulings } from "../engine/index.js";
import { adjudicateCall } from "../calls/adjudicate.js";
import { resolveCall } from "../calls/resolve.js";
import { sceneCall } from "../calls/scene.js";
import { questionCall } from "../calls/question.js";
import { companionCall } from "../calls/companion.js";
import { partyCall } from "../calls/party.js";
import { post, act, envFor } from "./session.js";
import { cardView } from "./view.js";
import { planText, addItem } from "./draft.js";

export const last = (list, n) => list.slice(Math.max(0, list.length - n));

// The DM's recent narration, which the whole party witnessed.
export const narrated = (session, n = 3) => last(session.feeds.table.filter((e) => e.ch === "narration").map((e) => e.text), n);

export const exchange = (session) => {
  session.counts.exchanges += 1;
};

// Phase 4's exit test counts the exchange by which every party member has left where they started.
export function markOut(session) {
  const s = session.state;
  if (session.counts.out !== null) return;
  if (s.party.every((p) => zoneOf(s, p.id) !== s.packet.start.positions[p.id])) session.counts.out = session.counts.exchanges;
}

// The draft as everyone at the table sees it: the plan being written and the stances waiting on the player (D40).
export const draftView = (session) =>
  session.draft.items.length || session.draft.stances.length ? { plan: planText(session.draft), stances: session.draft.stances.map(({ companion, kind, text, decision }) => ({ companion, kind, text, decision })) } : null;

// The card no longer matches the draft: the player changed the plan after it was made.
export const cardStale = (session) => !!session.card && session.card.card.plan !== planText(session.draft);

// A message whose call failed is marked failed, so no later call reads it, and the page offers to send it again
// (D138). The error still goes to the page.
async function tried(entry, fn) {
  try {
    return await fn();
  } catch (e) {
    entry.failed = true;
    throw e;
  }
}
const said = (e) => e.text && !e.failed;

const live = (session) => {
  if (session.state.ended) throw new Error("The encounter is over.");
};

// ---- What each call reads of the table ----

// Who a line is to, as the companions read it.
function toText(s, e) {
  if (e.ch === "dm") return "to the DM";
  if (e.ch === "rings") return "over the rings";
  if (e.to === "do") return "doing it";
  return `aloud, to ${nameOf(s, e.to)}`;
}

// The table as the companions hear it: everything but private words and the narration, which comes on its own.
export function tableLines(session, n = 14) {
  const s = session.state;
  return last(session.feeds.table.filter((e) => said(e) && ["dm", "scene", "rings"].includes(e.ch)), n).map((e) => ({
    from: e.who,
    text: e.text,
    ...(e.who === "player" ? { to: toText(s, e) } : {}),
    ...(e.kind === "check" ? { kind: e.success ? "it worked" : "it failed" } : {}),
  }));
}

// The current scene conversation: the exchanges since the player last turned to someone else.
export function conversation(session, to) {
  const feed = session.feeds.table.filter((e) => e.ch === "scene" && !e.failed);
  let i = feed.length;
  while (i > 0 && feed[i - 1].to === to) i--;
  return last(feed.slice(i), 12).map((e) => ({ from: e.who, text: e.text, ...(e.kind && e.kind !== "reply" ? { kind: e.kind } : {}) }));
}

// What happened at the table lately, for the card: no private words.
const recentTable = (session, n = 6) => last(session.feeds.table.filter((e) => said(e) && ["dm", "scene", "rings"].includes(e.ch)), n).map((e) => ({ from: e.who, text: e.text }));

// ---- Asking the DM (D127, D133) ----

// One cheap call on the read-only slice. Nothing moves and no time passes; what the answer settles becomes fact.
export async function question(session, io, prompts, { text }) {
  live(session);
  const env = envFor(session, prompts);
  const recent = last(session.feeds.table.filter((e) => e.ch === "dm" && said(e)), 6).map((e) => ({ from: e.who, text: e.text }));
  const asked = post(session, "table", { ch: "dm", who: "player", to: "dm", text });
  exchange(session);
  const s = session.state;
  const out = await tried(asked, () => questionCall(io, env, s, { now: ledgerText(s, { log: false }), recent, question: text }));
  act(session, { type: "answer", out });
  post(session, "table", { ch: "dm", who: "dm", kind: "answer", text: out.reply, ...(out.rulings.length ? { rulings: out.rulings.map((f) => f.text) } : {}) });
  return out;
}

// ---- Talking to someone, or doing something ----

// One exchange the DM rules (`to` is a person, or "do"), then the companions react over the rings.
export async function talk(session, io, prompts, { to = "do", text, rolls }) {
  live(session);
  const env = envFor(session, prompts);
  let s = session.state;
  const asked = post(session, "table", { ch: "scene", who: "player", to, text });
  exchange(session);
  const c = {
    to: to === "do" ? "do" : nameOf(s, to),
    now: ledgerText(s),
    timeline: aheadText(s, { ticks: 8 }),
    draft: draftView(session),
    recent: narrated(session, 2),
    conversation: conversation(session, to),
  };
  const out = await tried(asked, () => sceneCall(io, env, s, c));
  s = act(session, { type: "scene", out, rolls });
  post(session, "table", { ch: "scene", who: to === "do" ? "dm" : to, to, kind: "reply", text: out.reply });
  (out.checks ?? []).forEach((ch, i) => {
    const { success } = s.scene.checks[i];
    post(session, "table", { ch: "scene", who: "dm", to, kind: "check", actor: ch.who, difficulty: ch.band, success, text: (success ? ch.success : ch.failure).text });
  });
  if (out.plan) post(session, "table", { ch: "scene", who: "dm", to, kind: "redirect", text: out.plan });
  if (out.ticks) post(session, "table", { ch: "scene", who: "dm", to, kind: "time", text: `${out.ticks} tick${out.ticks > 1 ? "s" : ""} pass.` });
  markOut(session);
  if (s.ended) {
    session.ended = s.handoff;
    return out;
  }
  await voices(session, io, prompts);
  return out;
}

// ---- The companions ----

const takeStance = (session, who, stance) => {
  const { kind, text, trigger } = stance;
  session.draft.stances.push({ companion: who, kind, text, ...(trigger ? { trigger } : {}), decision: null });
};

const companionContext = (session, channel) => {
  const s = session.state;
  return {
    channel,
    now: ledgerText(s, { party: true, history: false }),
    recent: narrated(session, 2),
    draft: draftView(session),
    card: session.card ? cardView(s, session.card.card) : null,
  };
};

// The companions the player's line names, so the one asked answers it herself (D137).
export const named = (companions, text = "") => companions.filter((c) => new RegExp(`\\b${c.name.split(/[ ,]/)[0]}\\b`, "i").test(text)).map((c) => c.name);

// Both companions in one call (D132), saying one thing between them (D137). Either may pass.
async function voices(session, io, prompts, asked = null) {
  const env = envFor(session, prompts);
  const s = session.state;
  const c = { ...companionContext(session, "table"), asked: asked ? named(env.companions, asked.text) : [] };
  const out = await (asked ? tried(asked, () => partyCall(io, env, c, env.companions, tableLines(session))) : partyCall(io, env, c, env.companions, tableLines(session)));
  for (const l of out.lines) {
    post(session, "table", { ch: "rings", who: l.from, text: l.message, ...(l.stance ? { stance: l.stance } : {}) });
    if (l.stance) takeStance(session, l.from, l.stance);
  }
  for (const { from, ...r } of out.reactions) session.reactions.push({ companion: from, tick: s.tick, ...r });
}

// The player talks over the rings: to the party (both companions, one call), or privately to one companion (her
// call alone; the other never hears it). Time doesn't move.
export async function rings(session, io, prompts, { to = "party", text }) {
  const env = envFor(session, prompts);
  exchange(session);
  if (to === "party") return voices(session, io, prompts, post(session, "table", { ch: "rings", who: "player", to, text }));
  const self = env.companions.find((c) => c.id === to);
  if (!self) throw new Error(`${to} isn't in the party.`);
  const asked = post(session, "table", { ch: "private", with: to, who: "player", text });
  const thread = last(session.feeds.table.filter((e) => e.ch === "private" && e.with === to && said(e)), 14).map((e) => ({ from: e.who, text: e.text }));
  const out = await tried(asked, () => companionCall(io, env, companionContext(session, "private"), self, env.companions.filter((o) => o !== self), thread));
  post(session, "table", { ch: "private", with: to, who: to, text: out.message, ...(out.stance ? { stance: out.stance } : {}) });
  if (out.stance) takeStance(session, to, out.stance);
  for (const r of out.reactions) session.reactions.push({ companion: to, tick: session.state.tick, ...r });
}

// A message that didn't go through, sent again as it was (D138): it leaves the table and goes through its own
// route once more. `drop` just takes it off the table.
export function drop(session, entry) {
  if (!entry.failed) throw new Error("That message went through.");
  session.feeds.table = session.feeds.table.filter((e) => e !== entry);
}
export async function resend(session, io, prompts, entry) {
  drop(session, entry);
  const { ch, to, text } = entry;
  if (ch === "dm") return question(session, io, prompts, { text });
  if (ch === "scene") return talk(session, io, prompts, { to, text });
  return rings(session, io, prompts, { to: ch === "private" ? entry.with : "party", text });
}

// The player puts the draft to the party: it's said over the rings, and both companions react.
export async function talkOver(session, io, prompts) {
  if (!session.draft.items.length) throw new Error("Add an action to the plan first.");
  return rings(session, io, prompts, { to: "party", text: `Here's the plan:\n${planText(session.draft)}` });
}

// A plan the DM sent back from the table goes onto the draft, as actions.
export const addToPlan = (session, entry) => {
  addItem(session.draft, entry.text);
  entry.added = true;
};

// ---- The card ----

const stancesOf = (session) => session.draft.stances.map(({ companion, kind, text, trigger, decision }) => ({ companion, kind, text, ...(trigger ? { trigger } : {}), decision }));

// The DM rules on the draft and makes the card. Time doesn't pass.
export async function makeCard(session, io, prompts) {
  live(session);
  const env = envFor(session, prompts);
  const s = session.state;
  const undecided = session.draft.stances.filter((st) => !st.decision);
  if (undecided.length) throw new Error(`Decide ${nameOf(s, undecided[0].companion)}'s stance first.`);
  const plan = planText(session.draft);
  if (!plan.trim()) throw new Error("Add an action to the plan first.");
  if (session.card) session.counts.edits += 1;
  const stances = stancesOf(session);
  const out = await adjudicateCall(io, env, s, { plan, stances, now: ledgerText(s), timeline: aheadText(s, { party: true }), recent: recentTable(session) });
  session.card = { card: { ...out, plan, stances } };
  return session.card.card;
}

// The dice as the DM reads them: which rolls succeeded, never the numbers (D33).
const diceFor = (card, dice) => dice.map((d) => ({ step: d.n, band: card.steps.find((st) => st.n === d.n).roll.band, result: d.success ? "succeeded" : "failed" }));

// What the Plans tab shows once a card has run: each step as the card put it, with its roll and whether it happened,
// where it stopped (as the party sees it), and the DM's telling. Never the DM's own record of a step, which can
// name what the party hasn't found.
function outcomeOf(card, dice, out) {
  return {
    steps: out.steps.map((st) => {
      const c = card.steps.find((x) => x.n === st.n);
      const d = dice.find((x) => x.n === st.n);
      return { n: st.n, summary: c.summary, happened: st.happened, ...(d ? { roll: { band: c.roll.band, success: d.success } } : {}) };
    }),
    stopped: out.stopped ?? null,
    narration: out.narration.text,
  };
}

// Runs the card. A checkpoint ends the plan after its step (D69). The dice are rolled once and kept with the
// card, so a call that fails and is tried again can't reroll them. The draft stays as written (D134).
export async function commit(session, io, prompts, { checkpoints = [], rolls } = {}) {
  if (!session.card) throw new Error("There's no card to run.");
  if (cardStale(session) && !session.card.dice) throw new Error("The plan changed since this card was made. Remake the card first.");
  const env = envFor(session, prompts);
  const full = session.card.card;
  const cut = checkpoints.length ? Math.min(...checkpoints) : null;
  const card = session.card.cut ?? (cut ? { ...full, steps: full.steps.filter((st) => st.n <= cut) } : full);
  if (!session.card.dice) {
    exchange(session);
    session.card.cut = card;
    session.card.entry = post(session, "plans", { kind: "card", text: card.plan, card: cardView(session.state, card) }).at;
    session.card.dice = act(session, { type: "roll", card, rolls }).dice;
  }
  const dice = session.card.dice;
  let s = session.state;
  // The card's rulings are read as facts in the ledger, not as part of the card, so they aren't recorded twice (D138).
  const { plan, stances, rulings, ...dmCard } = card;
  const out = await resolveCall(io, env, s, { plan, card: dmCard, dice: diceFor(card, dice), stances, now: ledgerText(withRulings(s, card)), timeline: aheadText(s, { ticks: card.ends_at - s.tick + 4 }) }, card, dice);
  s = act(session, { type: "resolve", card, dice, out });
  const entry = session.feeds.plans.find((e) => e.at === session.card.entry);
  if (entry) entry.outcome = outcomeOf(card, dice, out);
  session.card = null;
  session.draft.stances = [];
  // The narration comes with the account (D78): one call decides what happened, then tells it.
  if (out.narration.texture.length) act(session, { type: "ops", source: "narration", ops: out.narration.texture.map((text) => ({ add_canon: { kind: "texture", text } })) });
  post(session, "table", { ch: "narration", who: "dm", text: out.narration.text });
  markOut(session);
  if (session.state.ended) session.ended = session.state.handoff;
  return out;
}

// The card for review.
export const shown = (session) => (!session.card ? null : cardView(session.state, session.card.card));

// Who an entry is from, for the page.
export const speaker = (s, id) => (id === "dm" ? "DM" : id === "player" ? "You" : isParty(s, id) ? nameOf(s, id) : nameOf(s, id));
