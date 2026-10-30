// The encounter loop (docs/spec/architecture.md): the huddle, moments, the card, execution and the world turn.
// Each function takes the session, the runtime `io` and the prompts, makes its calls through `src/calls/`, and
// changes state only through engine actions. No DOM, so `node --test` can play it with recorded outputs.
import { checkSteps, splitLongMoves, project, shownCard, tableRead } from "../engine/index.js";
import { d100 } from "../engine/rng.js";
import { nameOf, zoneOf } from "../engine/world.js";
import { stateFor, perceptionFor, ledgerText } from "../context.js";
import { stepCall } from "../calls/step.js";
import { pricingCall } from "../calls/pricing.js";
import { worldCall } from "../calls/world.js";
import { narrationCall } from "../calls/narration.js";
import { momentCall } from "../calls/moment.js";
import { companionCall } from "../calls/companion.js";
import { rulingCall } from "../calls/ruling.js";
import { post, act, envFor } from "./session.js";
import { cardView, ruledCardView } from "./view.js";

export const all = (session) => Object.values(session.feeds).flatMap((f) => (Array.isArray(f) ? f : Object.values(f).flat()));
export const last = (list, n) => list.slice(Math.max(0, list.length - n));

// The player's own last few words, from any interface, for the table read.
export const said = (session) => all(session).filter((e) => e.who === "player").sort((a, b) => a.at - b.at).map((e) => e.text);

// The DM's recent narration, which the whole party witnessed.
export const narrated = (session, n = 3) => last(session.feeds.plan.filter((e) => e.kind === "narration").map((e) => e.text), n);

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
  session.draft.plan || session.draft.stances.length ? { plan: session.draft.plan, stances: session.draft.stances.map(({ companion, kind, text, decision }) => ({ companion, kind, text, decision })) } : null;

// One of three candidates, picked at random (D40), from the session's own seeded generator.
function pick(session, n) {
  const box = { rng: session.rng };
  const i = Math.min(n - 1, Math.floor(((d100(box) - 1) / 100) * n));
  session.rng = box.rng;
  return i;
}

// ---- The huddle and private channels ----

// The player speaks to everyone (`to: "all"`) or to one companion through her ring. Time doesn't move.
export async function huddle(session, io, prompts, { to = "all", text }) {
  const env = envFor(session, prompts);
  const feed = to === "all" ? "huddle" : to;
  const thread = to === "all" ? session.feeds.huddle : session.feeds.private[to];
  post(session, feed, { who: "player", text });
  exchange(session);
  const speakers = to === "all" ? env.companions : env.companions.filter((c) => c.id === to);
  const s = session.state;
  for (const self of speakers) {
    const others = env.companions.filter((o) => o !== self);
    const c = {
      channel: to === "all" ? "huddle" : "private",
      now: s.ruled ? ledgerText(s, { party: true, history: false }) : stateFor(s, { party: true }),
      recent: narrated(session, 2),
      draft: draftView(session),
      card: session.card ? cardView(s, session.card.card, { brief: true }) : null,
    };
    const lines = thread.filter((e) => e.text).map((e) => ({ from: e.who, text: e.text }));
    const out = await companionCall(io, env, c, self, others, lines);
    const chosen = out.candidates[pick(session, out.candidates.length)];
    post(session, feed, { who: self.id, text: chosen.message, ...(chosen.stance ? { stance: chosen.stance } : {}) });
    if (chosen.stance) {
      const { kind, text: says, trigger } = chosen.stance;
      session.draft.stances.push({ companion: self.id, kind, text: says, ...(trigger ? { trigger } : {}), decision: null });
    }
    // Reactions are recorded, not scored, until Phase 5 ports the relationship model (D65).
    for (const r of out.reactions) session.reactions.push({ companion: self.id, tick: s.tick, ...r });
  }
}

// ---- Moments ----

function closeConversation(session) {
  if (!session.talking) return;
  act(session, { type: "talked", with: session.talking });
  session.talking = null;
}

// The current conversation: the moment feed since the player last turned to someone else.
export function conversation(session, to) {
  const feed = session.feeds.moment;
  let i = feed.length;
  while (i > 0 && (feed[i - 1].to ?? to) === to) i--;
  return last(feed.slice(i), 12).map((e) => ({ from: e.who, text: e.text, ...(e.kind && e.kind !== "reply" ? { kind: e.kind } : {}) }));
}

// The player asks the DM (`to: "dm"`, free) or talks to a person in the encounter (D69). During a fight, the
// message is what everyone does this round.
export async function moment(session, io, prompts, { to = "dm", text, rolls }) {
  const env = envFor(session, prompts);
  let s = session.state;
  if (s.ended) throw new Error("The encounter is over.");
  if (session.talking && session.talking !== to) closeConversation(session);
  if (to !== "dm") session.talking = to;
  post(session, "moment", { who: "player", to, text });
  exchange(session);
  s = session.state;
  const c = {
    to: to === "dm" ? "dm" : nameOf(s, to),
    now: stateFor(s),
    perception: perceptionFor(s),
    fight: s.combat ? { party_hp: { ...s.hp } } : null,
    draft: draftView(session),
    recent: narrated(session, 2),
    conversation: conversation(session, to),
  };
  const out = await momentCall(io, env, s, c);
  s = act(session, { type: "moment", out, rolls });
  const r = s.moment;
  post(session, "moment", { who: to === "dm" ? "dm" : to, to, kind: "reply", text: out.reply });
  if (out.check) {
    const { actor, skill, difficulty } = out.check;
    const o = r.check.success ? out.check.on_success : out.check.on_failure;
    post(session, "moment", { who: "dm", to, kind: "check", text: o.text, actor, skill, difficulty, success: r.check.success });
    // A check ends a conversation; it costs its own tick (D69).
    closeConversation(session);
  }
  if (out.combat) {
    out.combat.actions.forEach((a, i) => {
      const res = r.round?.actions[i];
      if (!res || res.moot) return;
      post(session, "moment", { who: "dm", to, kind: "action", actor: a.actor, difficulty: a.difficulty, success: res.success, text: (res.success ? a.on_success : a.on_failure).text });
    });
    const hits = (r.round?.hits ?? []).map((h) => `${nameOf(s, h.by)} hits ${nameOf(s, h.to)}`);
    if (hits.length) post(session, "moment", { who: "dm", to, kind: "hits", text: `${hits.join(". ")}.` });
  }
  if (out.redirect) post(session, "moment", { who: "dm", to, kind: "redirect", text: out.redirect.step });
  // A fight that just ended gets a world turn, so the people in the encounter can respond to how it went.
  if (r.round?.over) {
    post(session, "moment", { who: "dm", to, kind: "over", text: r.round.over === "won" ? "The fight is over." : "The party is down." });
    await worldTurn(session, io, prompts, {});
  }
  markOut(session);
  if (s.ended) session.ended = session.state.handoff;
  return out;
}

// ---- The card ----

// Builds the card from the draft: the world catches up on time spent talking first (D66), then the step call,
// rulings on named routes that don't fit (D55), the engine's projection, and the pricing call.
export async function makeCard(session, io, prompts) {
  const env = envFor(session, prompts);
  if (session.state.combat) throw new Error("You're in a fight. Act in the Moment tab.");
  if (session.state.ended) throw new Error("The encounter is over.");
  const undecided = session.draft.stances.filter((st) => !st.decision);
  if (undecided.length) throw new Error(`Decide ${nameOf(session.state, undecided[0].companion)}'s stance first.`);
  const plan = session.draft.plan.trim();
  if (!plan) throw new Error("Write the plan first.");
  closeConversation(session);
  if (session.state.pending > 0) await worldTurn(session, io, prompts, {});
  if (session.state.ended) return null;
  if (session.card) session.counts.edits += 1;
  const stances = session.draft.stances.map(({ companion, kind, text, trigger, decision }) => ({ companion, kind, text, ...(trigger ? { trigger } : {}), decision }));
  let s = session.state;
  const recent = last(session.feeds.moment, 6).map((e) => ({ from: e.who, text: e.text }));
  const stepOut = await stepCall(io, env, s, { plan, stances, now: stateFor(s), recent });
  const asked = new Set();
  for (const fit of checkSteps(s, stepOut).fits) {
    const key = `${fit.who}|${fit.connection}`;
    if (asked.has(key)) continue;
    asked.add(key);
    const r = await rulingCall(io, env, { ...fit, canon: s.canon });
    if (r.answer === "yes") s = act(session, { type: "ruling", who: fit.who, connection: fit.connection, text: r.text });
  }
  const steps = splitLongMoves(s, stepOut.steps);
  const step_call = { ...stepOut, steps };
  const facts = project(s, steps, stepOut.internal_checks);
  const pricing_call = await pricingCall(io, env, s, { plan, step_call, facts, now: stateFor(s) });
  const card = { packet: s.packet.id, tick: s.tick, plan, stances, checkpoints: [], step_call, facts, pricing_call };
  session.card = { card };
  return card;
}

// Runs the card, then the world turn. `checkpoints` are the steps the player wants to pause after (D68).
export async function commit(session, io, prompts, { checkpoints = [], rolls } = {}) {
  if (!session.card) throw new Error("There's no card to run.");
  const card = { ...session.card.card, checkpoints };
  exchange(session);
  post(session, "plan", { who: "player", kind: "card", text: card.plan, card: cardView(session.state, card) });
  const s = act(session, { type: "execute", card, rolls });
  const results = s.results;
  const rulings = [...card.step_call.rulings.map((r) => r.text), ...card.pricing_call.rulings];
  if (rulings.length) act(session, { type: "ops", source: "card", ops: rulings.map((text) => ({ add_canon: { kind: "ruling", text } })) });
  session.card = null;
  session.draft = { plan: "", stances: [] };
  await worldTurn(session, io, prompts, { card, results });
  markOut(session);
  return results;
}

// ---- The world turn ----

// Pending ticks pass one at a time; the world call decides how people respond, and the narration call tells it.
// A call that fails leaves the engine's results standing, and says so plainly.
export async function worldTurn(session, io, prompts, { card, results }) {
  const env = envFor(session, prompts);
  const from = session.state.log.length;
  if (session.state.pending > 0) act(session, { type: "ticks" });
  let s = session.state;
  const happened = results ?? s.log.slice(from);
  let world = { actions: [] };
  if (!s.ended) {
    try {
      world = await worldCall(io, env, s, { results: happened, state: stateFor(s), table: tableRead(s, said(session)) });
      const ops = world.actions.flatMap((a) => a.ops);
      if (ops.length) s = act(session, { type: "ops", source: "world", ops });
    } catch (e) {
      post(session, "plan", { who: "system", text: `The world call failed (${e.message}). Nobody responds this turn.` });
    }
  }
  try {
    const n = await narrationCall(io, env, {
      plan: card?.plan ?? "(No plan: time passed while the party talked and looked around.)",
      steps: card?.step_call.steps ?? [],
      results: happened,
      world: world.actions,
      state: stateFor(s),
      recent: narrated(session, 2),
    });
    if (n.texture.length) s = act(session, { type: "ops", source: "narration", ops: n.texture.map((text) => ({ add_canon: { kind: "texture", text } })) });
    post(session, "plan", { who: "dm", kind: "narration", text: n.text });
  } catch (e) {
    post(session, "plan", { who: "system", text: `The narration call failed (${e.message}). What happened is in the log.` });
  }
  if (s.ended) session.ended = s.handoff;
}

// The card's steps for review, with what's internal stripped (D36).
export const shown = (session) => (!session.card ? null : session.card.ruled ? ruledCardView(session.state, session.card.card) : cardView(session.state, shownCard(session.card.card)));
