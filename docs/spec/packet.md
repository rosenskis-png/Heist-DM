# The encounter packet

Everything fixed for one encounter. Its shape is `schemas/packet.js`. It's built by generation (`docs/spec/generation.md`; the Cells is written by hand), validated by the engine, and fixed for the whole encounter. Live changes go in encounter state (`docs/spec/state.md`), never here.

How to design a *good* packet is in `docs/design/encounter-craft.md`. The worked example is `fixtures/cells/`.

---

## 1. Intent
- **Objective:** a condition the engine can check, written in the condition language (`docs/spec/engine.md`), such as `party_all_in: [stair_top]`.
- **Alternate objectives,** including one fail-forward ending.
- **Optional objectives,** such as `item_held: gear_sack`.
- **Purpose:** what this encounter is for, in one or two concrete sentences.
- **Expected length,** in plans committed (e.g. 1–2, 3–5).
- **No routes, ever.** The intent never lists solutions, obvious or alternative. The critique call plays approaches privately (D120), but they are never stored or sent. The engine rejects a packet with route-like fields.

- **Attachments:** for each one the hand-off carries in (an NPC travelling with the party, a companion missing from it), how it resolves in this encounter (D123).
- **Exits:** each way out carries a one-line stub for the next scene it leads to (D119).

Rooms (D22, D121) have `mode: "room"`, no objective and no deadline, may place events, and hold one outfit unless they're a campfire (D122).

The party's companions appear only by slot, `companion_a` and `companion_b`, which loading binds to the party's companions in order (D126). A packet never names one.

## 2. People
One sheet per NPC: `wants`, `fears`, `knows`, `will_never`, temper and how they react under pressure, `disposition`, position, and a `schedule` if they have one. The DM plays people from these sheets and the packet's `notes`.

## 3. Map

The map is structure: an exact layout plus the relationships the AIs reason with (D9, D28, principle 5). No call adds a zone or a connection during play. A feature the player assumes can be ruled into existence against the zone's purpose and fixed facts, as a fact in the ledger (D75).

- **Zones:** an id, a short description, and a **purpose line** saying why the zone exists and how it's used (e.g. "where the jailers eat, dice and sleep in shifts; the drain runs to the midden"). The purpose is what keeps improvised detail consistent.
- **Geometry** (D28), in 5-ft squares, read only by the engine and the UI. The AIs get derived facts ("the corridor is 30 ft long", "the peg is 10 ft behind the stool"), never coordinates.
  - Each zone is a list of rectangles `[x, y, w, h]` on a `level` (0 by default). Walls are implicit at zone edges. Zones on one level don't overlap.
  - A connection on one level is a `wall` segment `[[x1, y1], [x2, y2]]` on the edge its two zones share. A connection between levels (stairs, a grate into a gutter) is one `square` inside both zones' footprints.
  - A thing gets an `at` square only when where it sits matters or the map should show it. Otherwise it just sits in its zone.
- **Connections:** what links two zones (door, bars, grate, drain, opening, stairs, crawl), with the biggest size that `fits` through (and, for a lockable one, `fits_unlocked`, D53), `see_through`, flags (`locked`), **which side each one is operated from** and whether it can be reached from the other side, the `key` if any, plus extra travel cost in ticks.
- **Senses** (optional): per NPC, or per beat for an NPC on a routine, the zones they see and hear, for the DM to read. The party's own sight and hearing come from the map (`docs/spec/engine.md` §5).
- **Light level** per zone.
- **Things:** objects with properties (free text for the AI to judge, plus a size and any flags the engine checks), and where they are: a zone or a holder. Schedules move them through beats' `on_start` rules.
- **Fixed facts:** physical facts that rule things out, including load-bearing material facts ("the hinges of cell 1 are rotten and give way under a heavy impact") and rulings made in advance ("plants only take hold on the mossy floor at the far end").
- **Hidden things:** marked hidden. Included for the AI, never shown to the player until revealed.

## 4. Clock and how people react
- **Schedules,** written in ticks: repeating cycles of beats, one tick each. Each has an `id` and a `known` flag: whether the party knows the routine from the start. Otherwise it's learned in play, through a `reveal`. At tick *t* the beat is `beats[(t + phase) % period]`. Each beat gives the NPC's position, any senses, a cue, and `on_start` rules that run when it begins (the keys go back on the peg). **One-time events** fire `at_tick` or `when` a condition first holds, and are marked `known` if the party knows they're coming. An event marked `deadline` moves with the campaign's slack before the encounter starts (D41); a condition that depends on it should test a flag the event sets, not the tick.
- **Deadlines** are written in the DM's time (a tick is about a minute of real work, D77, D125), and leave room for some exploring and two recovered failures (D37).
- **Notes:** how people react, in plain words, for the DM to apply (`notes`; D76): "he hears a noise: he comes to look, and his suspicion rises a step". A rising alarm, a suspicion ladder or a spreading fire is written here too, with what each step changes and how it comes back down.

Semantics: `docs/spec/engine.md`. Example: `content/encounters/cells.json`.

## 5. Opening description
Written from the map after the map is final. Stored word for word and sent with every call in the encounter. The packet's `name` is what the player sees it called ("The Cells").

---

## Validation

### Consistency: a failure means the packet is rejected and regenerated
- Every id that's referenced exists.
- Every barrier says how it's operated and from which side.
- Every zone has a purpose line.
- The geometry agrees with the relationships: zones don't overlap, each connection lies on the wall its two zones share, and each thing sits inside its zone.
- No visible text names a hidden thing. A hidden zone, connection, thing or fact is described only in hidden entries and in the parts of the packet the party never sees (the intent, NPC sheets), so the party's view of the map gives nothing away.
- No route-like fields. The schema allows no unknown fields, so a `routes` field anywhere is rejected.

### Quality: warnings only, tuned after playtests (roadmap, Phase 7)
| Check | Principle (`docs/design/encounter-craft.md`) |
|---|---|
| Every element is connected to at least two others | Interlock (§3.3) |
| Zones the objective depends on have two or more routes to them, or are flagged as the deliberate chokepoint | Loops, not tubes (§5.1) |
| Every exit has a closing condition, and the notes say when the alarm closes it | Exits (§5.5) |
| All schedule periods share one tick grid; at most two independent clock sources | Few sources, one grid (§4.1) |
| At least one one-time event before the encounter's natural end | Waiting costs something (§4.2) |
| Every schedule has a cue the party can perceive from a zone they start in or can reach | Learnable cycles (§4.3) |
| Every party member's abilities interact with at least one element | Everyone has essential work (§3.4) |
| Each usable thing has at least one property beyond its description | Properties, not difficulties (§3.2) |

### Size
The engine measures each serialized packet and warns above twice the size of the Cells (D26). An encounter that big is split at a doorway, and each piece hands its state to the next.
