// The ledger's changes (D75): what the DM writes. Open on purpose: any fact can be recorded, any flag set,
// anyone moved. The engine checks only that the ids are real, then keeps the record. Semantics:
// docs/spec/engine.md §2.
import { r, list, obj } from "./shape.js";

// A fact, added or (same id) replaced: one short line about how things are now.
export const fact = obj(["id", "text"], { id: r("id"), text: { type: "string", minLength: 1, maxLength: 160 }, about: list(r("id")), known: { type: "boolean" } });

export const changes = obj([], {
  // A person or thing goes to a zone (nothing checks the way there: the DM has ruled it).
  moves: list(obj(["who", "to"], { who: r("id"), to: r("id") })),
  // An item is now held by someone or something; `by: null` puts it down where it is.
  holds: list(obj(["item", "by"], { item: r("id"), by: { oneOf: [r("id"), { type: "null" }] } })),
  // A flag on a person, thing or connection, any key. Doors use `locked`; a person out of the fight is `down`.
  flags: list(obj(["on", "key", "value"], { on: r("id"), key: r("id"), value: { type: ["string", "number", "boolean"] } })),
  // A fact, added or (same id) replaced: one short line about how things are now, not what happened (that's the
  // log). Known facts are ones the party knows. The ledger holds a fixed number of them (D76).
  facts: list(fact),
  // Facts that stop being true.
  retire: list(r("id")),
  // Telling blows on a person in the encounter, never the party (D130). At no toughness left they're down.
  wounds: list(obj(["who"], { who: r("id"), n: { type: "integer", minimum: 1, maximum: 3 } })),
  // A hurt or hindrance on someone in the party, added or (same id) replaced. It lasts until they rest at a
  // campfire or `recover` ends it, and it travels with the party (D130).
  conditions: list(obj(["id", "who", "text"], { id: r("id"), who: r("id"), text: { type: "string", minLength: 1, maxLength: 80 } })),
  recover: list(r("id")),
  // Whether an NPC with a routine is following it. Moving one takes it off its routine until this puts it back.
  routine: list(obj(["npc", "follows"], { npc: r("id"), follows: { type: "boolean" } })),
  moods: list(obj(["npc", "value"], { npc: r("id"), value: r("id") })),
  // Hidden things, routines or coming events the party now knows.
  reveal: list(r("id")),
  // A limited ability someone in the party used (D128): who, and the ability's id. The engine counts each one.
  used: list(obj(["who", "ability"], { who: r("id"), ability: r("id") })),
});

export const band = { enum: ["easy", "medium", "hard", "very_hard", "near_impossible"] };

// What each person fighting the party is visibly about to do, as the party sees it (D130). It happens as shown
// unless the party's next move stops it.
export const threats = list(obj(["who", "does"], { who: r("id"), does: { type: "string", minLength: 1, maxLength: 100 } }));
