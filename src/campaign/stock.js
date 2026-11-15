// Taking stock when a room ends (docs/spec/campaign.md §10, D192): out of character, the player and the DM settle what
// goes on to the next room. The pack is the hand-off's, plus anything the DM grants; the player keeps up to the
// pack's limit. At most one follower goes on, chosen by the player, or none. Pure: the stock call's output arrives
// here as data.
import { setting } from "../../content/setting.js";

export const FOLLOWERS = 1;
const key = (n) => String(n ?? "").trim().toLowerCase().split(/[ ,]/)[0];
const slug = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "thing";

// The follower who came in with the party, if any.
export const followerOf = (carried = []) => carried.find((x) => x.kind === "follower") ?? null;

// A follower whose room this was has reached what they were after (D192): they part ways, and aren't offered again.
export function arrivedHere(camp) {
  const d = camp.destination;
  return d && d.room === camp.roomNo ? d.name : null;
}

// The stock as a room ends: what the hand-off carried out, who came in, and anyone who arrived.
export function openStock(camp, handoff) {
  return { items: handoff.items ?? [], talk: [], found: [], followers: [], notes: (camp.carried ?? []).filter((x) => x.kind !== "follower").map(({ kind, what }) => ({ kind, what })), arrived: arrivedHere(camp), settled: null };
}

// The stock call's answer laid over the stock. A follower who came in keeps their record whatever the call writes
// (D185): name, pronouns, looks, goal and why they want it; only how they are and what they know can change. One who
// has arrived is gone. Found things get ids that can't clash with the pack's.
export function applyStock(stock, out, camp, { said = null } = {}) {
  const before = followerOf(camp.carried);
  const followers = (out.followers ?? [])
    .filter((f) => !(stock.arrived && key(f.name) === key(stock.arrived)))
    .map((f) => {
      if (!before || key(f.name) !== key(before.name)) return f;
      return { ...f, name: before.name, pronouns: before.pronouns ?? f.pronouns, looks: before.looks ?? f.looks, goal: before.goal ?? f.goal, motive: before.motive ?? f.motive };
    });
  const taken = new Set(stock.items.map((i) => i.id));
  const found = (out.found ?? []).map((f) => {
    let id = `found_${slug(f.name)}`;
    while (taken.has(id)) id = `${id}_`;
    taken.add(id);
    return { id, name: f.name, properties: f.properties, holder: f.holder, why: f.why };
  });
  const talk = [...stock.talk, ...(said ? [{ who: "player", text: said }] : []), { who: "dm", text: out.reply }];
  return { ...stock, talk, found, followers, notes: out.notes ?? [] };
}

// Everything the player may keep: the pack as carried out, then what the DM granted.
export const packOf = (stock) => [...stock.items, ...stock.found.map(({ why, ...it }) => ({ ...it, notes: [] }))];

// The player's choices: which things to keep, by id (no more than the pack holds), and which follower goes on, by
// name, or none. Returns the items and the `carried` list for the campaign. A follower keeps the room they joined in,
// so a later seed knows how long they've travelled (D192).
export function settleStock(stock, { keep = null, follower = null } = {}, camp) {
  const pack = packOf(stock);
  const ids = keep ?? pack.slice(0, setting.items.max).map((i) => i.id);
  const unknown = ids.filter((id) => !pack.some((i) => i.id === id));
  if (unknown.length) throw new Error(`not in the pack: ${unknown.join(", ")}`);
  if (ids.length > setting.items.max) throw new Error(`the party can carry ${setting.items.max} things on, not ${ids.length}`);
  const chosen = follower ? stock.followers.find((f) => key(f.name) === key(follower)) : null;
  if (follower && !chosen) throw new Error(`${follower} isn't someone who could come along`);
  const before = followerOf(camp.carried);
  const since = before && chosen && key(before.name) === key(chosen.name) ? before.since : camp.roomNo ?? 0;
  const items = pack.filter((i) => ids.includes(i.id));
  const carried = [...(chosen ? [{ kind: "follower", ...chosen, since }] : []), ...stock.notes];
  return { items, carried };
}
