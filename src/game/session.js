// A game in progress: campaign values, the engine's encounter state, and what the table has said (D11, D74).
// Plain data, so a save is a JSON snapshot. Starting one and restoring one never calls an AI.
import { load, apply } from "../engine/index.js";
import { classes } from "../../content/classes.js";
import { companions as roster } from "../../content/companions/index.js";
import { pairs } from "../../content/pairs.js";

// The player's sheet: their name, their class's skills and abilities.
export function playerSheet(player) {
  const cls = classes[player.class];
  return { id: "player", name: player.name || cls.name, role: `The player, a ${cls.name.toLowerCase()}`, blurb: cls.blurb, skills: cls.mods, abilities: cls.abilities };
}

// The party: the player, then the companions the packet places (Phase 4 plays the Cells' own party, D65).
export const companionIds = (packet) => Object.keys(packet.start.positions).filter((id) => id !== "player" && roster[id]);
export const partyFor = (player, packet) => [playerSheet(player), ...companionIds(packet).map((id) => roster[id])];

export function newSession({ packet, player, seed = 1, slack = 0, act = packet.act ?? 1 }) {
  const party = partyFor(player, packet);
  const state = load({ packet, party, slack, seed });
  const session = {
    v: 1,
    player,
    act,
    slack,
    start: { packet: packet.id, seed, slack },
    rng: (seed ^ 0x5bd1e995) >>> 0,
    seq: 0,
    state,
    feeds: { plan: [], moment: [], huddle: [], private: Object.fromEntries(companionIds(packet).map((id) => [id, []])) },
    draft: { plan: "", stances: [] },
    card: null,
    talking: null,
    counts: { exchanges: 0, edits: 0, out: null },
    reactions: [],
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
    act: session.act,
    prompts,
    companions: party.slice(1),
    connections: new Map(packet.map.connections.map((c) => [c.id, c])),
    // Relationships stay at their starting values until Phase 5 ports the model (D65).
    rel: {},
    pairFor: (a, others) => others.map((b) => pairs[`${a}|${b}`] ?? pairs[`${b}|${a}`]).find(Boolean) ?? null,
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
  return { ...saved, actions: [], state: { ...saved.state, packet, party: partyFor(saved.player, packet) } };
}
