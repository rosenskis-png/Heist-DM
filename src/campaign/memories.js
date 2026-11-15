// Her memories of rooms (docs/spec/companions.md §10, D193): each companion's own, apart from what she remembers of
// camp (the relationship state's `memories`, written only by her campfire call). The verdict writes each room's
// candidates, a short line and a longer one; they join her **leg** memories, up to `setting.memories.leg`, until a
// campfire or the sanctuary ends. Her **core** memories, up to `setting.memories.core`, last the whole game: the verdict
// fills empty places but never replaces one, and may only suggest a swap; the player promotes and removes, at the stock
// screen. Pure.
import { setting } from "../../content/setting.js";

const { leg: LEG, core: CORE } = setting.memories;
export const emptyMemories = () => ({ leg: [], core: [] });
const of = (camp, id) => camp.roomMemories?.[id] ?? emptyMemories();

// What the verdict's memories become while the player takes stock: each companion's new candidates with ids of their
// own, which ones the verdict would put in core, and any swap it suggests. `room` names the room they're from.
export function pendingMemories(camp, verdict, { room = null, ids = [] } = {}) {
  const out = {};
  const n = camp.roomNo ?? 0;
  for (const id of ids) {
    const mine = of(camp, id);
    const fresh = (verdict?.memories ?? []).filter((m) => m.from === id).map((m, i) => ({ id: `m${n}_${id}_${i}`, room, short: m.short, long: m.long, core: !!m.core, ...(m.instead_of && mine.core.some((c) => c.id === m.instead_of) ? { instead_of: m.instead_of } : {}) }));
    const forget = (verdict?.forget ?? []).filter((f) => mine.leg.some((l) => l.id === f));
    out[id] = { fresh, forget };
  }
  return out;
}

// Her core as the verdict would leave it without the player: what she had, plus each new memory it put in core while
// there's room. A swap is only ever suggested.
export function proposedCore(camp, pending, id) {
  const core = of(camp, id).core.map((c) => c.id);
  for (const m of pending[id]?.fresh ?? []) if (m.core && !m.instead_of && core.length < CORE) core.push(m.id);
  return core;
}

// The room's memories settle: her leg gains the new ones and loses what the verdict let go, oldest first past the
// limit; her core becomes `core[id]` (ids from her core, her leg or this room's), or the verdict's proposal. A core
// memory keeps its longer form; a leg memory keeps both until the leg ends.
export function remember(camp, pending, core = {}) {
  const out = structuredClone(camp.roomMemories ?? {});
  for (const [id, p] of Object.entries(pending ?? {})) {
    const was = of(camp, id);
    const pool = [...was.core, ...was.leg, ...p.fresh];
    const chosen = core[id] ?? proposedCore(camp, pending, id);
    if (chosen.length > CORE) throw new Error(`${id} keeps ${CORE} core memories, not ${chosen.length}`);
    const missing = chosen.filter((x) => !pool.some((m) => m.id === x));
    if (missing.length) throw new Error(`no such memory: ${missing.join(", ")}`);
    const keepCore = chosen.map((x) => pool.find((m) => m.id === x)).map(({ id: mid, room, short, long }) => ({ id: mid, room, short, long }));
    const leg = [...was.leg.filter((l) => !p.forget.includes(l.id)), ...p.fresh.map(({ id: mid, room, short, long }) => ({ id: mid, room, short, long }))].slice(-LEG);
    out[id] = { leg, core: keepCore };
  }
  return out;
}

// A campfire or the sanctuary is over: the leg's memories are spent; core stays.
export function legOver(memories = {}) {
  return Object.fromEntries(Object.entries(memories).map(([id, m]) => [id, { leg: [], core: m.core ?? [] }]));
}

// Her leg memories as the rooms ahead read them: the short lines, without what's already core.
export const roadLines = (memories, id) => {
  const m = memories?.[id];
  if (!m) return [];
  const core = new Set(m.core.map((c) => c.id));
  return m.leg.filter((l) => !core.has(l.id)).map((l) => l.short);
};
