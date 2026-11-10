// The campaign between rooms (docs/spec/campaign.md, D140–D148): where the party is in the act, its gold and relics,
// what it carries to the next room, and what a room's end, a campfire and the climax do to them. Pure: the AI's part is
// the verdict (D146), which arrives here as data.
import { setting } from "../../content/setting.js";
import { startAct, exitKinds, enter, wayOn } from "./way.js";
import { endEncounter } from "./relationship.js";
import { rest } from "../engine/handoff.js";

// A new campaign at the start of `act`. `members` are the two companions' profiles; `romance` their relationship state.
export function newCampaign({ act = 1, seed = 1, members = [], romance = null } = {}) {
  return { act, way: startAct(act, seed), gold: 0, relics: [], carry: { conditions: [], spent: {} }, members: members.map((m) => m.id), romance, keep: null, used: [], usedBusy: [], usedShapes: [], usedCentres: [], premises: [], log: [], calledBack: [], hintsUsed: [], settingsUsed: [], newsUsed: [], storyShown: [], plan: null, lastExtra: null, hintLeg: null, history: [], peaks: [], memory: [], clues: [], cluesPlaced: [], roomNo: 0, seedRng: (seed ^ 0x9e3779b9) >>> 0 };
}

// The kinds of room the current room's exits lead to, for the room being written (D144).
export function drawExits(camp, n) {
  const { way, kinds } = exitKinds(camp.way, n);
  return { camp: { ...camp, way }, kinds };
}

// A separation (a companion captured, split off or sent away) may start only where it can resolve before the leg's
// campfire: in a room whose exits don't already lead to the campfire or the climax (D142).
export const canSeparate = (camp) => camp.way.left > 0 && !["climax", "sanctuary", "campfire"].includes(camp.way.here);

// A room has ended: its hand-off and its verdict (D146). Gold and relics come out of the hand-off; the verdict moves
// how everyone feels and the leg's strain; the way on is the exit the party reached, or code picks one (D144). At a
// campfire or the sanctuary the party rests and everyone is together again (D142). The climax's rating decides how many
// relics the party may keep into the next act (D148). Returns the campaign and where the party is going.
export function roomEnded(camp, { handoff, verdict, exits = [], members = [] }) {
  const out = structuredClone({ ...camp, romance: null });
  out.romance = camp.romance ? endEncounter(camp.romance, members, verdict) : null;
  out.gold = handoff.gold ?? out.gold;
  out.relics = [...out.relics, ...(handoff.relics ?? [])].slice(0, setting.relics.max);
  out.carry = { conditions: handoff.conditions ?? [], spent: handoff.spent ?? {}, companions: handoff.companions ?? out.members };
  // What the act remembers (D164): the room's log line, the clues the party came away with, and anyone memorable the
  // verdict named, whom a later room may bring back.
  // What the party has with it (D178): the verdict gives the whole list as they leave.
  out.carried = (verdict?.carried ?? out.carried ?? []).slice(0, 6);
  out.log = [...(out.log ?? []), handoff.log].filter(Boolean);
  out.clues = [...new Set([...(out.clues ?? []), ...(handoff.clues ?? [])])];
  out.memory = [...(out.memory ?? []), ...(verdict?.people ?? []).map((p) => ({ ...p, act: out.act }))].slice(-30);
  // Never more than the party has: a party with fewer relics than the climax allows keeps them all (D149).
  if (out.way.here === "climax") out.keep = Math.min(setting.relics.keptByRating[verdict.rating - 1], out.relics.length);
  const { way, exit, forced } = wayOn(out.way, exits, handoff);
  const kind = exit?.leads_to ?? exitKinds(way, 1).kinds[0];
  out.way = enter(way, kind, { rating: verdict?.rating ?? null });
  if (["campfire", "sanctuary"].includes(kind)) out.carry = { ...rest(out.carry), companions: out.members };
  return { camp: out, exit, kind, forced };
}

// The act ends at its sanctuary: the player keeps up to `camp.keep` of the act's relics, chosen by id, and the next act
// starts fresh with them. Gold carries. Anything else the act held (strain, its way) starts again.
export function endAct(camp, chosen = [], seed = 1) {
  if (camp.way.here !== "sanctuary") throw new Error("an act ends at its sanctuary");
  const kept = camp.relics.filter((r) => chosen.includes(r.id));
  if (kept.length !== chosen.length) throw new Error("only the act's own relics can be kept");
  if (kept.length > (camp.keep ?? 0)) throw new Error(`the climax lets the party keep ${camp.keep ?? 0} relics, not ${kept.length}`);
  const act = camp.act + 1;
  // The act's facts go into its history, for the next act call; what the act alone used starts again.
  const done = { act: camp.act, question: camp.plan?.question ?? null, peak: camp.plan?.peak?.who ?? null, state: camp.plan?.state ?? null, rooms: camp.premises ?? [], log: camp.log ?? [] };
  return { ...structuredClone(camp), act, way: startAct(act, seed), relics: kept, keep: null, history: [...(camp.history ?? []), done], used: [], usedBusy: [], usedShapes: [], usedCentres: [], premises: [], log: [], calledBack: [], hintsUsed: [], settingsUsed: [], newsUsed: [], storyShown: [], plan: null, lastExtra: null, hintLeg: null };
}

// An act has begun (D164): its plan, from the act call, holds the region, its busy-ness and holders, and its peak, which
// is never chosen again.
export const actBegun = (camp, plan) => ({ ...camp, plan, peaks: [...(camp.peaks ?? []), plan.peak.who] });
