// The campaign runner (docs/spec/campaign.md, D173): one room after another. When a room ends, the verdict judges it and
// the campaign moves on (`judgeRoom`); the next room is generated (`nextRoom`), beginning the act first if it has no
// plan yet; then the party walks into it (`enterRoom`). Calm rooms end when the party takes a way on (`leaveBy`); the
// sanctuary ends the act once the player picks the relics to keep (`endTheAct`). Everything lives in the session, so a
// save taken between rooms resumes where it stopped.
import { newCampaign, roomEnded, endAct, fireOut } from "../campaign/run.js";
import { newRomance, endEncounter } from "../campaign/relationship.js";
import { pairs } from "../../content/pairs.js";
import { setting } from "../../content/setting.js";
import { beginAct, generateRoom } from "./generate.js";
import { verdictCall } from "../calls/verdict.js";
import { stockCall } from "../calls/stock.js";
import { openStock, applyStock, settleStock } from "../campaign/stock.js";
import { pendingMemories, remember } from "../campaign/memories.js";
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
  // The adventure opens on a calm room with no clock (D197): where the party comes to, to talk and look about.
  camp = { ...camp, way: { ...camp.way, here: "quiet" }, first: true };
  const room = await generateRoom(io, env, { camp, world, party });
  const session = newSession({ packet: room.packet, player, companions, seed, world, roster, intro: camp.plan?.intro ?? null });
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

// Taking stock when a room ends (D192), before the verdict: the stock call opens it, and each thing the player says
// to the DM goes through it again, with the talk so far and the lists as they stand. Stored in `session.stock`, so a
// reload picks up the talk where it stopped.
export async function takeStock(session, io, prompts, said = null) {
  const camp = campaignOf(session);
  const stock = session.stock ?? openStock(camp, session.ended);
  const told = session.feeds.table.filter((e) => e.who === "dm" && e.text).map((e) => e.text);
  const lists = stock.talk.length ? { granted: stock.found.map(({ id, ...f }) => f), followers: stock.followers, notes: stock.notes } : null;
  const out = await stockCall(io, envFor(session, prompts), { now: ledgerText(session.state), told, items: stock.items, arrived: stock.arrived, lists, talk: stock.talk, said });
  session.stock = applyStock(stock, out, camp, { said });
  return session.stock;
}

// The player's choices when taking stock: the things to keep, by id; the follower who goes on, by name, or none; and
// each companion's core memories, by id (D193), checked here so a bad choice fails before anything moves.
export function settle(session, choices = {}) {
  const camp = campaignOf(session);
  const stock = session.stock ?? openStock(camp, session.ended);
  if (choices.core && session.judged) remember(camp, session.judged.pending, choices.core);
  session.stock = { ...stock, settled: settleStock(stock, choices, camp), choices };
  return session.stock;
}

// What the room was, for the record of rooms passed through.
const summaryOf = (session, verdict) => ({ name: session.state.packet.name ?? session.state.packet.id, log: session.ended.log, rating: verdict?.rating ?? null, why: verdict?.why ?? null });

// The room is over: the verdict call (D146). It runs as the room ends, beside taking stock, so the memories it writes
// are on the stock screen (D193). It moves nothing yet: `moveOn` does, once the player walks on. Stored in
// `session.judged`.
export async function judgeRoom(session, io, prompts) {
  const camp = campaignOf(session);
  // A calm room isn't rated (D187): the verdict call still runs for the companions' reactions, their memories and
  // who's worth meeting again, but its rating is set aside, so it moves no regard and no strain.
  const calm = session.state.packet.mode === "room" && camp.way.here !== "sanctuary";
  const judged = await verdictCall(io, envFor(session, prompts), { handoff: session.ended, now: ledgerText(session.state), calm, place: session.premise ?? null });
  const verdict = calm ? { ...judged, rating: null, why: null } : judged;
  const ids = session.state.party.slice(1).map((p) => p.id);
  session.judged = { verdict, pending: pendingMemories(camp, verdict, { room: session.state.packet.name ?? null, ids }) };
  return session.judged;
}

// The player has walked on: the campaign moves on by the exit the party took, with what was kept when taking stock and
// the memories as the player settled them (D146, D192, D193). At the sanctuary the act is over instead, and waits for the
// relics to be chosen (`endTheAct`). A room ended without taking stock (an old save) keeps the pack as it came out, up
// to its limit, and whatever the party had with it. Stores what happens next in `session.between`.
export function moveOn(session) {
  const camp = campaignOf(session);
  const { verdict, pending } = session.judged ?? {};
  if (!verdict) throw new Error("the room hasn't been judged yet");
  const settled = session.stock?.settled ?? null;
  const handoff = settled ? { ...session.ended, items: settled.items } : session.ended;
  const memories = { pending, core: session.stock?.choices?.core ?? {} };
  const members = session.state.party.slice(1);
  session.past = [...session.past, summaryOf(session, verdict)].slice(-PAST);
  if (camp.way.here === "sanctuary") {
    // The sanctuary is the act's main campfire: its leg's moments are spent there (D190).
    const next = structuredClone(fireOut({ ...camp, roomMemories: remember(camp, pending, memories.core) }));
    next.romance = camp.romance ? endEncounter(camp.romance, members, verdict) : null;
    next.gold = handoff.gold ?? next.gold;
    if (settled) Object.assign(next, { items: settled.items, carried: settled.carried });
    session.camp = next;
    session.between = { verdict, actOver: true, last: camp.act >= setting.arc.length };
    return session.between;
  }
  const { camp: moved, exit, kind, forced } = roomEnded(camp, { handoff, verdict, carried: settled?.carried ?? null, exits: session.state.packet.intent.exits ?? [], members, name: session.state.packet.name ?? null, place: session.premise ?? null, memories });
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

// The next room, made ahead while the player takes stock (D199). Once the verdict is in, the way on and the next
// room's kind are known, so the room can be written then, from the campaign as it will be after the player walks on,
// with what the room's end handed over in place of what the player will settle. `session.ahead` keeps it, with what
// generating it changed in the campaign, for `nextRoom` to use if the player walks on by the same way. A room made
// ahead that fails is simply made again later. Not at the sanctuary, whose next act is planned first.
const making = new WeakMap();
const changed = (before, after) => Object.fromEntries(Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k])).map((k) => [k, after[k]]));
export function prepareNext(session, io, env, roster = authored) {
  if (making.has(session) || session.ahead || !session.judged || !session.ended) return making.get(session) ?? null;
  const camp = campaignOf(session);
  if (camp.way.here === "sanctuary" || !camp.plan) return null;
  const party = partyFor(session.player, session.companions, session.world, roster);
  const members = session.state.party.slice(1);
  const { camp: moved, exit, kind, forced } = roomEnded(camp, { handoff: session.ended, verdict: session.judged.verdict, exits: session.state.packet.intent.exits ?? [], members, name: session.state.packet.name ?? null, place: session.premise ?? null });
  const handoff = exit?.stub || forced ? { stub: exit?.stub ?? "the party was carried on", conditions: moved.carry.conditions } : null;
  const job = generateRoom(io, env, { camp: moved, world: session.world, party, handoff, log: (moved.log ?? []).slice(-3) })
    .then((room) => {
      session.ahead = { exit: exit?.id ?? null, kind, packet: room.packet, premise: room.camp.premises?.at(-1) ?? null, patch: changed(moved, room.camp) };
      return session.ahead;
    })
    .catch(() => null)
    .finally(() => making.delete(session));
  making.set(session, job);
  return job;
}

// The next room, generated while the closing narration is read (docs/spec/generation.md): the act call first when the
// act has no plan yet, then the room from the way on the party took. A room made ahead by the same way is used as it
// is (D199). `env` has the prompts and the worked example.
export async function nextRoom(session, io, env, roster = authored) {
  const party = partyFor(session.player, session.companions, session.world, roster);
  if (making.has(session)) await making.get(session);
  const b = session.between ?? {};
  const ahead = session.ahead;
  session.ahead = null;
  if (ahead && ahead.kind === b.kind && ahead.exit === (b.exit?.id ?? null) && session.camp?.plan) {
    session.camp = { ...session.camp, ...ahead.patch };
    const { resume, ...rest } = b;
    session.between = { ...rest, packet: ahead.packet, premise: ahead.premise };
    return ahead.packet;
  }
  let camp = campaignOf(session);
  if (!camp.plan) camp = session.camp = await beginAct(io, env, { camp, world: session.world, party });
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
  // The premise the room was built on, for what kind of place it was (D193).
  session.between = { ...rest, packet: room.packet, premise: room.camp.premises?.at(-1) ?? null };
  return room.packet;
}

// The party walks into the generated room: the engine loads it with what they carry (hurts, spent uses, gold and
// relics), the table starts fresh with its opening, and the replay log starts again for the new room (D60).
export function enterRoom(session, roster = authored) {
  const packet = session.between?.packet;
  if (!packet) throw new Error("the next room isn't ready");
  const camp = session.camp;
  // A new act's first room opens under the act's own narration (D197).
  const intro = session.between?.newAct ? camp.plan?.intro ?? null : null;
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
    // What kind of place this room is (D193), for the companions' road.
    premise: session.between?.premise ?? null,
    ended: null,
    between: null,
    stock: null,
    judged: null,
    ahead: null,
    // The last campfire's scene is over (D190).
    fire: null,
  });
  if (intro) post(session, "table", { ch: "narration", who: "dm", text: intro });
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
