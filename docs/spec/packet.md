# The encounter packet

Everything fixed for one encounter. Its shape is `schemas/packet.js`. It's built by the generator (or by hand until Phase 7), validated by the engine, and fixed for the whole encounter. Live changes go in encounter state (`docs/spec/state.md`), never here.

How to design a *good* packet is in `docs/design/encounter-craft.md`. The worked example is `fixtures/cells/`.

---

## 1. Intent
- **Objective:** a condition the engine can check, written in the condition language (`docs/spec/engine.md`), such as `party_all_in: [stair_top]`.
- **Alternate objectives,** including one fail-forward ending.
- **Optional objectives,** such as `item_held: gear_sack`.
- **Purpose:** what this encounter is for, in one or two concrete sentences.
- **Expected length,** in plans committed (e.g. 1–2, 3–5).
- **No routes, ever.** The intent never lists solutions, obvious or alternative. The generator may privately check that at least one route exists, but that route is never stored or sent. The engine rejects a packet with route-like fields.

Rooms (D22) have `mode: "room"` and no objective.

## 2. People
One sheet per NPC: `wants`, `fears`, `knows`, `will_never`, temper and how they react under pressure, `disposition`, position, and a `schedule` if they have one. NPC reactions on world turns come from these sheets.

## 3. Map

The map is structure: an exact layout plus the relationships the AIs reason with (D9, D28, principle 5). **The map is complete** (D29): no call adds a zone, a connection or a hidden thing during play.

- **Zones:** an id, a short description, and a **purpose line** saying why the zone exists and how it's used (e.g. "where the jailers eat, dice and sleep in shifts; the drain runs to the midden"). The purpose is what keeps improvised detail consistent.
- **Geometry** (D28), in 5-ft squares, read only by the engine and the UI. The AIs get derived facts ("the corridor is 30 ft long", "the peg is 10 ft behind the stool"), never coordinates.
  - Each zone is a list of rectangles `[x, y, w, h]` on a `level` (0 by default). Walls are implicit at zone edges. Zones on one level don't overlap.
  - A connection on one level is a `wall` segment `[[x1, y1], [x2, y2]]` on the edge its two zones share. A connection between levels (stairs, a grate into a gutter) is one `square` inside both zones' footprints.
  - A thing gets an `at` square only when where it sits matters or the map should show it. Otherwise it just sits in its zone.
- **Connections:** what links two zones (door, bars, grate, drain, opening, stairs, crawl), with the biggest size that `fits` through (and, for a lockable one, `fits_unlocked`, D53), `see_through`, flags (`locked`), **which side each one is operated from** and whether it can be reached from the other side, the `key` if any, plus extra travel cost in ticks.
- **Sense links:** per NPC, or per beat for an NPC on a schedule: the zones they see, and the zones they hear with the quietest sound they catch there.
- **Light level** per zone.
- **Things:** objects with properties (free text for the AI to judge, plus a size and any flags the engine checks), and where they are: a zone or a holder. Schedules move them through beats' `on_start` rules.
- **Fixed facts:** physical facts that rule things out, including load-bearing material facts ("the hinges of cell 1 are rotten and give way under a heavy impact") and rulings made in advance ("Wild Shape ends when the party leaves the cell block").
- **Hidden things:** marked hidden. Included for the AI, never shown to the player until revealed.

## 4. Clock and reactions
- **Schedules,** written in ticks: repeating cycles of beats, one tick each. Each has an `id` and a `known` flag: whether the party knows the routine from the start. Otherwise it's learned in play, through a `reveal`. At tick *t* the beat is `beats[(t + phase) % period]`. Each beat gives the NPC's position, senses and cue, and `on_start` rules that run when it begins (the keys go back on the peg). **One-time events** fire `at_tick` or `when` a condition first holds, and are marked `known` if the party knows they're coming. An event marked `deadline` moves with the campaign's slack before the encounter starts (D41); a condition that depends on it should test a flag the event sets, not the tick.
- **Deadlines** leave room for some exploring and two recovered failures (D37).
- **Meters and their ladders,** such as suspicion. Each level applies operations; anything that should lapse when the meter falls carries `until`. Decay: `by` a step after `after_ticks` ticks in a row where `quiet_if` holds, never while `blocked_by` holds.
- **Reaction triggers:** `when` a condition holds, run rules (`once` if it fires only once). Condition → operations, with no "unless he decides" (D18).

Semantics: `docs/spec/engine.md`. Example: `content/encounters/cells.json`.

## 5. Opening description
Written from the map after the map is final. Stored word for word and sent with every call in the encounter. The packet's `name` is what the player sees it called ("The Cells").

---

## Validation

### Consistency: a failure means the packet is rejected and regenerated
- Every id that's referenced exists.
- Every barrier says how it's operated and from which side.
- Every observer says what it can see and hear.
- Every zone has a purpose line.
- The geometry agrees with the relationships: zones don't overlap, each connection lies on the wall its two zones share, and each thing sits inside its zone.
- No visible text names a hidden thing. A hidden zone, connection, thing or fact is described only in hidden entries and in the parts of the packet the party never sees (the intent, NPC sheets), so the party's view of the map gives nothing away.
- No route-like fields. The schema allows no unknown fields, so a `routes` field anywhere is rejected.

### Quality: warnings only, tuned after playtests (roadmap, Phase 7)
| Check | Principle (`docs/design/encounter-craft.md`) |
|---|---|
| Every element is connected to at least two others | Interlock (§3.3) |
| Zones the objective depends on have two or more routes to them, or are flagged as the deliberate chokepoint | Loops, not tubes (§5.1) |
| Every exit has a closing condition, and the alarm ladder refers to it | Exits (§5.5) |
| All schedule periods share one tick grid; at most two independent clock sources | Few sources, one grid (§4.1) |
| At least one one-time event before the encounter's natural end | Waiting costs something (§4.2) |
| Every schedule has a cue the party can perceive from a zone they start in or can reach | Learnable cycles (§4.3) |
| Every party member's abilities interact with at least one element | Everyone has essential work (§3.4) |
| Each usable thing has at least one property beyond its description | Properties, not difficulties (§3.2) |

### Size
The engine measures each serialized packet and warns above twice the size of the Cells (D26). An encounter that big is split at a doorway, and each piece hands its state to the next.
