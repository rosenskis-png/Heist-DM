// The ledger's changes (D75): what a ruling DM writes. Open on purpose: any fact can be recorded, any flag
// set, anyone moved. The engine checks only that the ids are real, then keeps the record. Semantics:
// docs/spec/ruled.md.
import { r, list, obj } from "./shape.js";

export const changes = obj([], {
  // A person or thing goes to a zone (nothing checks the way there: the DM has ruled it).
  moves: list(obj(["who", "to"], { who: r("id"), to: r("id") })),
  // An item is now held by someone or something; `by: null` puts it down where it is.
  holds: list(obj(["item", "by"], { item: r("id"), by: { oneOf: [r("id"), { type: "null" }] } })),
  // A flag on a person, thing or connection, any key. Doors use `locked`.
  flags: list(obj(["on", "key", "value"], { on: r("id"), key: r("id"), value: { type: ["string", "number", "boolean"] } })),
  // A fact, added or (same id) replaced: one short line about how things are now, not what happened (that's the
  // log). Known facts are ones the party knows. The ledger holds a fixed number of them (D76).
  facts: list(obj(["id", "text"], { id: r("id"), text: { type: "string", minLength: 1, maxLength: 160 }, about: list(r("id")), known: { type: "boolean" } })),
  // Facts that stop being true.
  retire: list(r("id")),
  hp: list(obj(["who", "by"], { who: r("id"), by: { type: "integer" } })),
  // Whether an NPC with a routine is following it. Moving one takes it off its routine until this puts it back.
  routine: list(obj(["npc", "follows"], { npc: r("id"), follows: { type: "boolean" } })),
  moods: list(obj(["npc", "value"], { npc: r("id"), value: r("id") })),
  // Hidden things, routines or coming events the party now knows.
  reveal: list(r("id")),
});

export const band = { enum: ["easy", "medium", "hard", "very_hard", "near_impossible"] };
