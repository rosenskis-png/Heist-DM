// The engine: one pure function from state and an action to the next state (D60). Every change to an
// encounter arrives as an action, so a replay log (the load inputs plus the actions) reproduces state exactly.
import { clone } from "./world.js";
import { load } from "./load.js";
import { run } from "./ops.js";
import { nextTick, triggers, objectives } from "./clock.js";
import { execute } from "./plan.js";
import { handoff } from "./handoff.js";
import { applyMoment, endConversation } from "./moment.js";
import { record } from "./table.js";

export { load, checkPacket, deadlineTick } from "./load.js";
export { checkSteps, splitLongMoves, project, checkPricing, shownCard } from "./plan.js";
export { partyPerceives, whoPerceives } from "./perceive.js";
export { layoutFacts } from "./map.js";
export { handoff } from "./handoff.js";
export { checkMoment, checkWorld, checkOps, fighting } from "./moment.js";
export { tableRead } from "./table.js";
export { ODDS } from "./rng.js";

// Actions:
// - {type: "execute", card, rolls?}: run a committed card (step call, facts, pricing, stances). `rolls` forces d100s.
// - {type: "ops", source, ops}: apply a validated AI write, e.g. the world call's NPC actions (docs/spec/state.md).
// - {type: "ruling", who, connection, text}: the ruling call said yes; that thing may pass that connection (D55).
// - {type: "moment", out, rolls?}: apply a validated Moment output: what the party learns, a check, a combat round.
// - {type: "talked", with}: a conversation with an NPC has ended, which costs a tick (D69).
// - {type: "ticks", n}: time passes (a wait, a world turn's pending ticks).
// - {type: "end", outcome}: the encounter ends without its objective (the player leaves, a fight is lost).
export function apply(state, action) {
  const { packet, party, ...rest } = state;
  const s = { packet, party, ...clone(rest) };
  s.forced = [...(action.rolls ?? [])];
  s.firedNow = [];
  switch (action.type) {
    case "execute":
      s.results = execute(s, action.card);
      record(s, action.card, s.results);
      break;
    case "moment":
      s.moment = applyMoment(s, action.out);
      break;
    case "talked":
      endConversation(s, action.with);
      break;
    case "ops":
      run(s, action.ops, action.ctx ?? {});
      triggers(s);
      objectives(s);
      break;
    case "ruling":
      s.exceptions.push(`${action.who}|${action.connection}`);
      s.canon.push({ kind: "ruling", text: action.text });
      break;
    case "ticks": {
      const n = action.n ?? s.pending;
      s.pending = Math.max(0, s.pending - n);
      for (let i = 0; i < n && !s.ended; i++) nextTick(s);
      break;
    }
    case "end":
      s.ended ??= { outcome: action.outcome, tick: s.tick };
      break;
    default:
      throw new Error(`unknown action ${action.type}`);
  }
  if (s.ended && !s.handoff) s.handoff = handoff(s);
  delete s.forced;
  s.firedNow = [];
  return s;
}

// A replay log: what started the encounter, then every action in order (D60).
export const replay = ({ start, actions }) => actions.reduce(apply, load(start));
