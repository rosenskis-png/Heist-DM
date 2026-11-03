// The encounter loop (docs/spec/architecture.md): the huddle, the Moment, the card and playing it out. The DM rules
// and the engine keeps the books (D75): the DM makes the card, the engine rolls its dice, and the DM plays it out
// against the real world, records what changed and tells it (D78). Each function takes the session, the runtime
// `io` and the prompts, makes its calls through `src/calls/`, and changes state only through engine actions. No
// DOM, so `node --test` can play it with recorded outputs.
import { d100 } from "../engine/rng.js";
import { nameOf, zoneOf } from "../engine/world.js";
import { ledgerText, aheadText } from "../context.js";
import { adjudicateCall } from "../calls/adjudicate.js";
import { resolveCall } from "../calls/resolve.js";
import { sceneCall } from "../calls/scene.js";
import { companionCall } from "../calls/companion.js";
import { post, act, envFor } from "./session.js";
import { cardView } from "./view.js";

export const all = (session) => Object.values(session.feeds).flatMap((f) => (Array.isArray(f) ? f : Object.values(f).flat()));
export const last = (list, n) => list.slice(Math.max(0, list.length - n));

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
      now: ledgerText(s, { party: true, history: false }),
      recent: narrated(session, 2),
      draft: draftView(session),
      card: session.card ? cardView(s, session.card.card) : null,
    };
    const lines = thread.filter((e) => e.text).map((e) => ({ from: e.who, text: e.text }));
    const out = await companionCall(io, env, c, self, others, lines);
    const chosen = out.candidates[pick(session, out.candidates.length)];
    post(session, feed, { who: self.id, text: chosen.message, ...(chosen.stance ? { stance: chosen.stance } : {}) });
    if (chosen.stance) {
      const { kind, text: says, trigger } = chosen.stance;
      session.draft.stances.push({ companion: self.id, kind, text: says, ...(trigger ? { trigger } : {}), decision: null });
    }
    for (const r of out.reactions) session.reactions.push({ companion: self.id, tick: s.tick, ...r });
  }
}

// ---- The Moment ----

// The current conversation: the moment feed since the player last turned to someone else.
export function conversation(session, to) {
  const feed = session.feeds.moment;
  let i = feed.length;
  while (i > 0 && (feed[i - 1].to ?? to) === to) i--;
  return last(feed.slice(i), 12).map((e) => ({ from: e.who, text: e.text, ...(e.kind && e.kind !== "reply" ? { kind: e.kind } : {}) }));
}

// ---- The card ----

const stancesOf = (session) => session.draft.stances.map(({ companion, kind, text, trigger, decision }) => ({ companion, kind, text, ...(trigger ? { trigger } : {}), decision }));

// The DM rules on the draft and makes the card. Time doesn't pass.
export async function makeCard(session, io, prompts) {
  const env = envFor(session, prompts);
  const s = session.state;
  if (s.ended) throw new Error("The encounter is over.");
  const undecided = session.draft.stances.filter((st) => !st.decision);
  if (undecided.length) throw new Error(`Decide ${nameOf(s, undecided[0].companion)}'s stance first.`);
  const plan = session.draft.plan.trim();
  if (!plan) throw new Error("Write the plan first.");
  if (session.card) session.counts.edits += 1;
  const stances = stancesOf(session);
  const recent = last(session.feeds.moment, 6).map((e) => ({ from: e.who, text: e.text }));
  const out = await adjudicateCall(io, env, s, { plan, stances, now: ledgerText(s), timeline: aheadText(s, { party: true }), recent });
  session.card = { card: { ...out, plan, stances } };
  return session.card.card;
}

// The dice as the DM reads them: which rolls succeeded, never the numbers (D33).
const diceFor = (card, dice) => dice.map((d) => ({ step: d.n, band: card.steps.find((st) => st.n === d.n).roll.band, result: d.success ? "succeeded" : "failed" }));

// Runs the card. A checkpoint ends the plan after its step (D69). The dice are rolled once and kept with the
// card, so a call that fails and is tried again can't reroll them.
export async function commit(session, io, prompts, { checkpoints = [], rolls } = {}) {
  if (!session.card) throw new Error("There's no card to run.");
  const env = envFor(session, prompts);
  const full = session.card.card;
  const cut = checkpoints.length ? Math.min(...checkpoints) : null;
  const card = cut ? { ...full, steps: full.steps.filter((st) => st.n <= cut) } : full;
  if (!session.card.dice) {
    exchange(session);
    post(session, "plan", { who: "player", kind: "card", text: card.plan, card: cardView(session.state, card) });
    session.card.dice = act(session, { type: "roll", card, rolls }).dice;
  }
  const dice = session.card.dice;
  let s = session.state;
  const { plan, stances, ...dmCard } = card;
  const out = await resolveCall(io, env, s, { plan, card: dmCard, dice: diceFor(card, dice), stances, now: ledgerText(s), timeline: aheadText(s, { ticks: card.ends_at - s.tick + 4 }) }, card, dice);
  s = act(session, { type: "resolve", card, dice, out });
  session.card = null;
  session.draft = { plan: "", stances: [] };
  // The narration comes with the account (D78): one call decides what happened, then tells it.
  if (out.narration.texture.length) act(session, { type: "ops", source: "narration", ops: out.narration.texture.map((text) => ({ add_canon: { kind: "texture", text } })) });
  post(session, "plan", { who: "dm", kind: "narration", text: out.narration.text });
  markOut(session);
  if (session.state.ended) session.ended = session.state.handoff;
  return out;
}

// One exchange in the Moment tab: a question, talk, a quick action or a fight round, ruled by the DM.
export async function talk(session, io, prompts, { to = "dm", text, rolls }) {
  const env = envFor(session, prompts);
  let s = session.state;
  if (s.ended) throw new Error("The encounter is over.");
  post(session, "moment", { who: "player", to, text });
  exchange(session);
  const c = {
    to: to === "dm" ? "dm" : nameOf(s, to),
    now: ledgerText(s),
    timeline: aheadText(s, { ticks: 8 }),
    draft: draftView(session),
    recent: narrated(session, 2),
    conversation: conversation(session, to),
  };
  const out = await sceneCall(io, env, s, c);
  s = act(session, { type: "scene", out, rolls });
  post(session, "moment", { who: to === "dm" ? "dm" : to, to, kind: "reply", text: out.reply });
  (out.checks ?? []).forEach((ch, i) => {
    const { success } = s.scene.checks[i];
    post(session, "moment", { who: "dm", to, kind: "check", actor: ch.who, difficulty: ch.band, success, text: (success ? ch.success : ch.failure).text });
  });
  if (out.plan) post(session, "moment", { who: "dm", to, kind: "redirect", text: out.plan });
  if (out.ticks) post(session, "moment", { who: "dm", to, kind: "time", text: `${out.ticks} tick${out.ticks > 1 ? "s" : ""} pass.` });
  markOut(session);
  if (s.ended) session.ended = s.handoff;
  return out;
}


// The card for review.
export const shown = (session) => (!session.card ? null : cardView(session.state, session.card.card));
