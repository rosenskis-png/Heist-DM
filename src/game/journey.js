// The campaign runner (docs/spec/campaign.md, D173): one room after another. When a room ends, the verdict judges it and
// the campaign moves on (`judgeRoom`); the next room is generated (`nextRoom`), beginning the act first if it has no
// plan yet; then the party walks into it (`enterRoom`). Calm rooms end when the party takes a way on (`leaveBy`); the
// sanctuary ends the act once the player picks the relics to keep (`endTheAct`). Everything lives in the session, so a
// save taken between rooms resumes where it stopped.
import { newCampaign, roomEnded, endAct } from "../campaign/run.js";
import { newRomance, endEncounter } from "../campaign/relationship.js";
import { pairs } from "../../content/pairs.js";
import { setting } from "../../content/setting.js";
import { beginAct, generateRoom } from "./generate.js";
import { verdictCall } from "../calls/verdict.js";
import { ledgerText } from "../context.js";
import { load, bindParty } from "../engine/index.js";
import { act, envFor, post, partyFor, newSession } from "./session.js";
import { companions as authored } from "../../content/companions/index.js";
import { emptyDraft } from "./draft.js";

// The rooms the party has been through, kept for the page: name, how it ended, and the verdict's rating and reason.
const PAST = 40;

// The campaign for a session, made once: its random position from the session's seed, the two companions and how they
// stand with each other (D88).
export function campaignOf(session) {
  if (!session.camp) {
    const members = session.state.party.slice(1);
    session.camp = newCampaign({ act: session.act ?? 1, seed: session.start.seed, members, romance: newRomance(members, pairs, { act: session.act ?? 1 }) });
  }
  session.past ??= [];
  return session.camp;
}

// A new adventure in a generated world (D151): the act call, then the first room, before the party wakes. `env` has the
// prompts and the worked example; `roster` the companions with any live looks over them. Returns the session.
export async function startAdventure(io, env, { player, companions, world, seed, roster = authored }) {
  const party = partyFor(player, companions, world, roster);
  const members = party.slice(1);
  let camp = newCampaign({ seed, members, romance: newRomance(members, pairs, { act: 1 }) });
  camp = await beginAct(io, env, { camp, world, party });
  const room = await generateRoom(io, env, { camp, world, party });
  const session = newSession({ packet: room.packet, player, companions, seed, world, roster });
  Object.assign(session, { camp: room.camp, packet: room.packet, past: [] });
  return session;
}

// The party leaves a calm room by one of its ways on, or ends it where it stands (`exitId` null): the room is over,
// with the exit it was left by. At the sanctuary, which has no way on, this is resting and ending the act.
export function leaveBy(session, exitId = null) {
  if (session.ended) return;
  // Leaving by a way on, everyone goes: the party ends the room together where it leaves from (D185).
  const exit = exitId ? (session.state.packet.intent.exits ?? []).find((e) => e.id === exitId) : null;
  if (exit) act(session, { type: "ops", source: "leave", ops: session.state.party.map((p) => ({ move: { entity: p.id, to: exit.zone } })) });
  act(session, { type: "end", outcome: exitId ? "left" : session.state.packet.mode === "room" ? "rested" : "left" });
  session.ended = { ...session.state.handoff, way_on: exitId ?? session.state.handoff.way_on };
}

// What the room was, for the record of rooms passed through.
const summaryOf = (session, verdict) => ({ name: session.state.packet.name ?? session.state.packet.id, log: session.ended.log, rating: verdict?.rating ?? null, why: verdict?.why ?? null });

// The room is over: the verdict call, then the campaign moves on by the exit the party took (D146). At the sanctuary the
// act is over instead, and waits for the relics to be chosen (`endTheAct`). Stores what happens next in `session.between`.
export async function judgeRoom(session, io, prompts) {
  const camp = campaignOf(session);
  const handoff = session.ended;
  const members = session.state.party.slice(1);
  // A calm room isn't judged (D186): no call, no rating, nothing moved; what the party has with it goes on as it was.
  const calm = session.state.packet.mode === "room" && camp.way.here !== "sanctuary";
  const verdict = calm
    ? { rating: null, why: null, reactions: [], people: [], carried: camp.carried ?? [] }
    : await verdictCall(io, envFor(session, prompts), { handoff, now: ledgerText(session.state) });
  session.past = [...session.past, summaryOf(session, verdict)].slice(-PAST);
  if (camp.way.here === "sanctuary") {
    const next = structuredClone(camp);
    next.romance = camp.romance ? endEncounter(camp.romance, members, verdict) : null;
    next.gold = handoff.gold ?? next.gold;
    session.camp = next;
    session.between = { verdict, actOver: true, last: camp.act >= setting.arc.length };
    return session.between;
  }
  const { camp: moved, exit, kind, forced } = roomEnded(camp, { handoff, verdict, exits: session.state.packet.intent.exits ?? [], members });
  session.camp = moved;
  session.between = { verdict, kind, forced, exit: exit ? { id: exit.id, stub: exit.stub ?? null } : null };
  return session.between;
}

// The act is over at its sanctuary: keep the chosen relics (no more than the climax allows, D148) and start the next.
export function endTheAct(session, chosen = []) {
  const camp = campaignOf(session);
  const seed = (session.start.seed + 104729 * camp.act) >>> 0;
  session.camp = endAct(camp, chosen, seed);
  session.between = { ...session.between, actOver: false, kind: "encounter", exit: null, newAct: session.camp.act };
}

// The next room, generated while the closing narration is read (docs/spec/generation.md): the act call first when the
// act has no plan yet, then the room from the way on the party took. `env` has the prompts and the worked example.
export async function nextRoom(session, io, env, roster = authored) {
  const party = partyFor(session.player, session.companions, session.world, roster);
  let camp = campaignOf(session);
  if (!camp.plan) camp = session.camp = await beginAct(io, env, { camp, world: session.world, party });
  const b = session.between ?? {};
  const handoff = b.exit?.stub || b.forced ? { stub: b.exit?.stub ?? "the party was carried on", conditions: camp.carry.conditions } : null;
  let room;
  try {
    room = await generateRoom(io, env, { camp, world: session.world, party, handoff, log: (camp.log ?? []).slice(-3), resume: b.resume ?? null });
  } catch (e) {
    // Kept for "Try again", which starts from the same seed and sketch (D185).
    if (e.resume) session.between = { ...b, resume: e.resume };
    throw e;
  }
  session.camp = room.camp;
  const { resume, ...rest } = b;
  session.between = { ...rest, packet: room.packet };
  return room.packet;
}

// The party walks into the generated room: the engine loads it with what they carry (hurts, spent uses, gold and
// relics), the table starts fresh with its opening, and the replay log starts again for the new room (D60).
export function enterRoom(session, roster = authored) {
  const packet = session.between?.packet;
  if (!packet) throw new Error("the next room isn't ready");
  const camp = session.camp;
  const seed = (session.start.seed * 31 + 7 * (session.past?.length ?? 0) + 1) >>> 0 || 1;
  const party = partyFor(session.player, session.companions, session.world, roster);
  session.state = load({ packet, party, seed, conditions: camp.carry.conditions, spent: camp.carry.spent, gold: camp.gold, relics: camp.relics, carried: camp.carried ?? [], items: camp.items ?? [] });
  Object.assign(session, {
    // What was in the pack coming into this room (D184), so a save can put it back.
    pack: camp.items ?? [],
    act: camp.act,
    packet,
    start: { packet: packet.id, seed: session.start.seed, room: seed },
    actions: [],
    feeds: { table: [], plans: [] },
    draft: emptyDraft(),
    card: null,
    counts: { exchanges: 0, edits: 0, out: null },
    ended: null,
    between: null,
  });
  post(session, "table", { ch: "narration", who: "dm", text: packet.opening });
  return session;
}

// Where the campaign is, for the page's header: the act, and the leg and the rooms left before its campfire.
export function whereView(session) {
  const camp = session.camp;
  if (!camp) return null;
  const arc = setting.arc[camp.act - 1];
  return { act: camp.act, acts: setting.arc.length, leg: camp.way.leg, legs: camp.way.legs ?? arc?.legs ?? null, here: camp.way.here, gold: camp.gold, relics: camp.relics };
}

// The live looks changed mid-room (D171): the party is rebuilt from the new roster, and the room bound to it again.
// Nothing else in the room changes. `packet` is the room as written (the Cells, or the generated one in the session).
export function relook(session, roster, packet) {
  const party = partyFor(session.player, session.companions, session.world, roster);
  session.state = { ...session.state, party, packet: bindParty(session.packet ?? packet, party) };
  return session;
}
