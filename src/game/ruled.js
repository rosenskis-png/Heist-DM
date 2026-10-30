// The encounter loop in ruled mode (D75): the DM rules on a plan (the card), the engine rolls its dice, the DM
// plays it out against the real world and records what changed, and the narration call tells it. In the Moment
// tab, the DM rules on each exchange. The huddle is the same as in the engine's mode (`huddle` in turns.js).
import { stateFor, timelineFor, perceptionFor } from "../context.js";
import { nameOf } from "../engine/world.js";
import { ruledCardView } from "./view.js";
import { adjudicateCall } from "../calls/adjudicate.js";
import { resolveCall } from "../calls/resolve.js";
import { sceneCall } from "../calls/scene.js";
import { narrationCall } from "../calls/narration.js";
import { post, act, envFor } from "./session.js";
import { last, narrated, exchange, markOut, draftView, conversation } from "./turns.js";

const stancesOf = (session) => session.draft.stances.map(({ companion, kind, text, trigger, decision }) => ({ companion, kind, text, ...(trigger ? { trigger } : {}), decision }));

// The DM rules on the draft and makes the card. Time doesn't pass.
export async function ruledCard(session, io, prompts) {
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
  const out = await adjudicateCall(io, env, s, { plan, stances, now: stateFor(s), timeline: timelineFor(s, { party: true }), recent });
  session.card = { ruled: true, card: { ...out, plan, stances } };
  return session.card.card;
}

// The dice as the DM reads them: which rolls succeeded, never the numbers (D33).
const diceFor = (card, dice) => dice.map((d) => ({ step: d.n, band: card.steps.find((st) => st.n === d.n).roll.band, result: d.success ? "succeeded" : "failed" }));

// Runs the card. A checkpoint ends the plan after its step (D69). The dice are rolled once and kept with the
// card, so a call that fails and is tried again can't reroll them.
export async function ruledCommit(session, io, prompts, { checkpoints = [], rolls } = {}) {
  if (!session.card) throw new Error("There's no card to run.");
  const env = envFor(session, prompts);
  const full = session.card.card;
  const cut = checkpoints.length ? Math.min(...checkpoints) : null;
  const card = cut ? { ...full, steps: full.steps.filter((st) => st.n <= cut) } : full;
  if (!session.card.dice) {
    exchange(session);
    post(session, "plan", { who: "player", kind: "card", text: card.plan, card: ruledCardView(session.state, card) });
    session.card.dice = act(session, { type: "roll", card, rolls }).dice;
  }
  const dice = session.card.dice;
  let s = session.state;
  const end = Math.max(...card.steps.map((st) => st.at + st.takes));
  const { plan, stances, ...dmCard } = card;
  const out = await resolveCall(io, env, s, { plan, card: dmCard, dice: diceFor(card, dice), stances, now: stateFor(s), timeline: timelineFor(s, { ticks: end - s.tick + 4 }) }, card, dice);
  s = act(session, { type: "resolve", card, dice, out });
  session.card = null;
  session.draft = { plan: "", stances: [] };
  try {
    const n = await narrationCall(io, env, {
      plan,
      steps: card.steps.map(({ n, summary, who, at }) => ({ n, summary, who, at })),
      results: { dice: diceFor(card, dice), steps: out.steps.map(({ n, happened, what }) => ({ n, happened, what })), stopped: out.stopped ?? null },
      world: out.after ?? {},
      state: stateFor(s),
      recent: narrated(session, 2),
    });
    if (n.texture.length) act(session, { type: "ops", source: "narration", ops: n.texture.map((text) => ({ add_canon: { kind: "texture", text } })) });
    post(session, "plan", { who: "dm", kind: "narration", text: n.text });
  } catch (e) {
    post(session, "plan", { who: "system", text: `The narration call failed (${e.message}). What happened: ${out.steps.map((st) => st.what).join(" ")}` });
  }
  markOut(session);
  if (session.state.ended) session.ended = session.state.handoff;
  return out;
}

// One exchange in the Moment tab: a question, talk, a quick action or a fight round, ruled by the DM.
export async function ruledScene(session, io, prompts, { to = "dm", text, rolls }) {
  const env = envFor(session, prompts);
  let s = session.state;
  if (s.ended) throw new Error("The encounter is over.");
  post(session, "moment", { who: "player", to, text });
  exchange(session);
  const c = {
    to: to === "dm" ? "dm" : nameOf(s, to),
    now: stateFor(s),
    timeline: timelineFor(s, { ticks: 8 }),
    perception: perceptionFor(s),
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

