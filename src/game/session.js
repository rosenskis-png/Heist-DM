// A game in progress: campaign values, the engine's encounter state, and what the table has said (D11, D74).
// Plain data, so a save is a JSON snapshot. Starting one and restoring one never calls an AI.
import { load, apply, bindParty, toughnessOf } from "../engine/index.js";
import { classes } from "../../content/classes.js";
import { companions as authored } from "../../content/companions/index.js";
import { inWorld, worldOf } from "../campaign/world.js";
import { emptyDraft, draftFrom } from "./draft.js";

// The player's sheet: their name, their class's skills and abilities.
export function playerSheet(player) {
  const cls = classes[player.class];
  return { id: "player", name: player.name || cls.name, role: `The player, a ${cls.name.toLowerCase()}`, blurb: cls.blurb, skills: cls.mods, abilities: cls.abilities };
}

// The party: the player, then the two companions the player chose, which the packet places by slot (D8).
// Each companion as she is in the adventure's world: her stories' role nouns filled in (D150).
// `roster` is the companions with any live looks laid over them (src/campaign/looks.js, D171); their files by default.
export const partyFor = (player, companionIds, world = worldOf(), roster = authored) => [playerSheet(player), ...companionIds.map((id) => inWorld(roster[id], world))];

// `companions` is the two companion ids the player chose.
// `world` is the adventure's world: Gravenhold, or one the pitch call wrote (D151), kept whole in the save.
export function newSession({ packet, player, companions, seed = 1, act = packet.act ?? 1, world = worldOf(), roster = authored }) {
  const party = partyFor(player, companions, world, roster);
  const state = load({ packet, party, seed });
  const session = {
    v: 3,
    player,
    companions,
    act,
    world,
    start: { packet: packet.id, seed },
    rng: (seed ^ 0x5bd1e995) >>> 0,
    seq: 0,
    state,
    // The table is one running chat; each entry's `ch` says which: the DM's answers ("dm"), scene exchanges
    // ("scene"), party talk over the rings ("rings"), a private word with one companion ("private", `with`), and
    // the DM's narration ("narration"). Plans holds each card that ran, with its outcome (D127).
    feeds: { table: [], plans: [] },
    draft: emptyDraft(),
    card: null,
    counts: { exchanges: 0, edits: 0, out: null },
    reactions: [],
    // Where each companion stands with the player (D79): written at camp, read in encounters.
    standing: Object.fromEntries(companions.map((id) => [id, { mood: "steady", learned: [] }])),
    actions: [],
    // The last few dozen call outputs, for a playtest's post-mortem (D135). Outputs only, never inputs.
    calls: [],
  };
  post(session, "table", { ch: "narration", who: "dm", text: packet.opening });
  return session;
}

// Adds an entry to a feed: the table or plans.
export function post(session, feed, entry) {
  const list = session.feeds[feed];
  const e = { at: ++session.seq, tick: session.state.tick, ...entry };
  list.push(e);
  return e;
}

// Every change to encounter state goes through the engine as an action, and into the replay log (D60).
export function act(session, action) {
  session.state = apply(session.state, action);
  session.actions.push(action);
  return session.state;
}

// A call's output, kept in the save for a post-mortem (D135): what it said, not what it was given.
export const CALL_RECORDS = 40;
export function recordCall(session, r) {
  const { input, ...rest } = r;
  const rec = { ...rest, tick: session.state.tick };
  // The first try matters only when it was sent back.
  if (!rec.firstErrors) delete rec.first;
  (session.calls ??= []).push(rec);
  if (session.calls.length > CALL_RECORDS) session.calls.splice(0, session.calls.length - CALL_RECORDS);
}

// What the calls are given that doesn't change during an encounter (docs/spec/context.md §1).
export function envFor(session, prompts) {
  const { packet, party } = session.state;
  return {
    packet,
    party,
    get state() {
      return session.state;
    },
    act: session.act,
    world: session.world ?? worldOf(),
    prompts,
    companions: party.slice(1),
    connections: new Map(packet.map.connections.map((c) => [c.id, c])),
    standing: session.standing,
  };
}

// A save: everything but the packet and the sheets, which come back from content by id (D11). It keeps the
// replay log and the recent call outputs (D135), dropping the oldest outputs first if the save would be too big.
export const SAVE_ROOM = 200 * 1024;
export function serialize(session) {
  const { packet, party, ...state } = session.state;
  let calls = session.calls ?? [];
  let json = JSON.stringify({ ...session, calls, state });
  while (calls.length && json.length > SAVE_ROOM) {
    calls = calls.slice(Math.ceil(calls.length / 4));
    json = JSON.stringify({ ...session, calls, state });
  }
  return json;
}

export function restore(json, packet, roster = authored) {
  const saved = typeof json === "string" ? JSON.parse(json) : json;
  if (saved.start.packet !== packet.id) throw new Error(`this save is for ${saved.start.packet}, not ${packet.id}`);
  // A save from before worlds (D150) is in Gravenhold.
  const world = saved.world ?? worldOf();
  const party = partyFor(saved.player, saved.companions, world, roster);
  // A save from before fights were plans (D130) has HP instead of toughness, conditions and threats.
  const { hp, ...state } = saved.state;
  state.toughness ??= Object.fromEntries(packet.people.map((p) => [p.id, toughnessOf(p)]));
  state.conditions ??= [];
  state.threats ??= [];
  // A save from before ability uses were counted (D128).
  state.used ??= {};
  state.spent ??= {};
  return { ...tableFrom(saved), world, actions: saved.actions ?? [], calls: saved.calls ?? [], state: { ...state, packet: bindParty(packet, party), party } };
}

// A save from before the table (D127): its Plan, Moment and Companions feeds merge into one table, in the order
// they were said, and its plan text becomes a list of actions (D134).
function tableFrom(saved) {
  if (saved.feeds.table) return saved;
  const { plan = [], moment = [], huddle = [], private: priv = {} } = saved.feeds;
  const table = [
    ...plan.filter((e) => e.kind === "narration").map((e) => ({ ...e, ch: "narration" })),
    ...moment.map((e) => ({ ...e, ch: "scene", to: e.to === "dm" ? "do" : e.to })),
    ...huddle.map((e) => ({ ...e, ch: "rings", ...(e.who === "player" ? { to: "party" } : {}) })),
    ...Object.entries(priv).flatMap(([id, list]) => list.map((e) => ({ ...e, ch: "private", with: id }))),
  ].sort((a, b) => a.at - b.at);
  const plans = plan.filter((e) => e.kind === "card").map(({ who, ...e }) => e);
  return { ...saved, v: 3, feeds: { table, plans }, draft: draftFrom(saved.draft) };
}
