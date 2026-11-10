// The engine: one pure function from state and an action to the next state (D60). Every change to an
// encounter arrives as an action, so a replay log (the load inputs plus the actions) reproduces state exactly.
import { clone } from "./world.js";
import { load } from "./load.js";
import { run } from "./ops.js";
import { nextTick, objectives, press } from "./clock.js";
import { handoff } from "./handoff.js";
import { noteSeen } from "./perceive.js";
import { resolve, scene, answer, rollCard } from "./ledger.js";

export { load, checkPacket, bindParty, SLOTS } from "./load.js";
export { partyPerceives, memberPerceives } from "./perceive.js";
export { handoff, endingOf, rest } from "./handoff.js";
export { CAPTURED, ladder } from "./clock.js";
export { checkChanges, checkCard, rollCard, checkResolve, checkScene, checkAnswer, hiddenTerms, checkFactBudget, checkConditionBudget, checkThreats, withRulings, checkUses, usesLeft, usesText, toughnessOf, revealable, LEDGER } from "./ledger.js";
export { ODDS } from "./rng.js";

// Actions (the DM rules and the engine keeps the books, D75):
// - {type: "roll", card, rolls?}: roll every roll on the DM's card, before the DM plays it out (`s.dice`).
// - {type: "resolve", card, dice, out}: the card, its dice, and the DM's account of what happened.
// - {type: "scene", out, rolls?}: one exchange the DM ruled; the engine rolls its checks.
// - {type: "answer", out}: the DM answered a question; its rulings become facts (D133).
// - {type: "ops", source, ops}: apply engine-written operations, e.g. narration's texture as canon.
// - {type: "ticks", n}: time passes.
// - {type: "end", outcome}: the encounter ends without its objective (the player leaves).
export function apply(state, action) {
  const { packet, party, ...rest } = state;
  const s = { packet, party, ...clone(rest) };
  s.forced = [...(action.rolls ?? [])];
  switch (action.type) {
    case "roll":
      s.dice = rollCard(s, action.card);
      // Each failed roll moves the room's trouble on a step (D176), before the DM plays the card out.
      press(s, s.dice.filter((d) => !d.success).length);
      break;
    case "resolve":
      s.resolved = resolve(s, action.card, action.dice, action.out);
      break;
    case "scene":
      s.scene = scene(s, action.out);
      break;
    case "answer":
      answer(s, action.out);
      break;
    case "ops":
      run(s, action.ops, action.ctx ?? {});
      objectives(s);
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
  noteSeen(s);
  if (s.ended && !s.handoff) {
    s.threats = [];
    s.handoff = handoff(s);
  }
  delete s.forced;
  return s;
}

// A replay log: what started the encounter, then every action in order (D60).
export const replay = ({ start, actions }) => actions.reduce(apply, load(start));
