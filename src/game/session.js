// A game in progress: campaign values, the engine's encounter state, and what the table has said (D11, D74).
// Plain data, so a save is a JSON snapshot. Starting one and restoring one never calls an AI.
import { load, apply, bindParty, toughnessOf } from "../engine/index.js";
import { classes } from "../../content/classes.js";
import { companions as roster } from "../../content/companions/index.js";

// The player's sheet: their name, their class's skills and abilities.
export function playerSheet(player) {
  const cls = classes[player.class];
  return { id: "player", name: player.name || cls.name, role: `The player, a ${cls.name.toLowerCase()}`, blurb: cls.blurb, skills: cls.mods, abilities: cls.abilities };
}

// The party: the player, then the two companions the player chose, which the packet places by slot (D8).
export const partyFor = (player, companionIds) => [playerSheet(player), ...companionIds.map((id) => roster[id])];

// `companions` is the two companion ids the player chose.
export function newSession({ packet, player, companions, seed = 1, slack = 0, act = packet.act ?? 1 }) {
  const party = partyFor(player, companions);
  const state = load({ packet, party, slack, seed });
  const session = {
    v: 2,
    player,
    companions,
    act,
    slack,
    start: { packet: packet.id, seed, slack },
    rng: (seed ^ 0x5bd1e995) >>> 0,
    seq: 0,
    state,
    feeds: { plan: [], moment: [], huddle: [], private: Object.fromEntries(companions.map((id) => [id, []])) },
    draft: { plan: "", stances: [] },
    card: null,
    counts: { exchanges: 0, edits: 0, out: null },
    reactions: [],
    // Where each companion stands with the player (D79): written at camp, read in encounters.
    standing: Object.fromEntries(companions.map((id) => [id, { mood: "steady", learned: [] }])),
    actions: [],
  };
  post(session, "plan", { who: "dm", kind: "narration", text: packet.opening });
  return session;
}

// Adds an entry to a feed: plan, moment, huddle, or a companion's private channel.
export function post(session, feed, entry) {
  const list = session.feeds[feed] ?? session.feeds.private[feed];
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
    prompts,
    companions: party.slice(1),
    connections: new Map(packet.map.connections.map((c) => [c.id, c])),
    standing: session.standing,
  };
}

// A save: everything but the packet and the sheets, which come back from content by id (D11).
export function serialize(session) {
  const { packet, party, ...state } = session.state;
  const { actions, ...rest } = session;
  return JSON.stringify({ ...rest, state });
}

export function restore(json, packet) {
  const saved = typeof json === "string" ? JSON.parse(json) : json;
  if (saved.start.packet !== packet.id) throw new Error(`this save is for ${saved.start.packet}, not ${packet.id}`);
  const party = partyFor(saved.player, saved.companions);
  // A save from before fights were plans (D130) has HP instead of toughness, conditions and threats.
  const { hp, ...state } = saved.state;
  state.toughness ??= Object.fromEntries(packet.people.map((p) => [p.id, toughnessOf(p)]));
  state.conditions ??= [];
  state.threats ??= [];
  return { ...saved, actions: [], state: { ...state, packet: bindParty(packet, party), party } };
}
