// The encounter packet. Meaning of each part: docs/spec/packet.md. Example: fixtures/cells/packet.json.
import { withDefs } from "./defs.js";

const r = (name) => ({ $ref: `#/$defs/${name}` });
const list = (items, min = 0) => ({ type: "array", minItems: min, items });
const obj = (required, properties) => ({ type: "object", required, additionalProperties: false, properties });

// A grid point (a corner between squares) or a square, in 5-ft units. Only the engine and the UI read these (D9).
const point = { type: "array", prefixItems: [{ type: "integer" }, { type: "integer" }], minItems: 2, maxItems: 2 };
const rect = {
  type: "array",
  prefixItems: [{ type: "integer" }, { type: "integer" }, { type: "integer", minimum: 1 }, { type: "integer", minimum: 1 }],
  minItems: 4,
  maxItems: 4,
};

const location = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  maxProperties: 2,
  properties: { zone: r("id"), holder: r("id"), at: point },
};

const zone = obj(["id", "name", "purpose", "light", "rects"], {
  id: r("id"),
  name: r("text"),
  purpose: r("text"),
  description: r("text"),
  light: { enum: ["dark", "dim", "bright"] },
  level: { type: "integer" },
  rects: list(rect, 1),
  hidden: { type: "boolean" },
});

const connection = obj(["id", "kind", "between", "fits", "operated_from"], {
  id: r("id"),
  kind: { enum: ["door", "bars", "grate", "drain", "opening", "stairs", "crawl"] },
  name: r("text"),
  between: { type: "array", items: r("id"), minItems: 2, maxItems: 2 },
  // Same level: a segment on the shared wall. Between levels: one square inside both footprints.
  wall: { type: "array", items: point, minItems: 2, maxItems: 2 },
  square: point,
  fits: r("size"),
  see_through: { type: "boolean" },
  flags: { type: "object", additionalProperties: { type: ["string", "number", "boolean"] } },
  operated_from: { anyOf: [r("id"), { const: "both" }] },
  reachable_from_other_side: { type: "boolean" },
  key: r("id"),
  ticks: { type: "integer", minimum: 0 },
  hidden: { type: "boolean" },
});

const thing = obj(["id", "name", "properties", "location"], {
  id: r("id"),
  name: r("text"),
  properties: r("text"),
  size: r("size"),
  flags: { type: "object", additionalProperties: { type: ["string", "number", "boolean"] } },
  location,
  hidden: { type: "boolean" },
});

const senses = obj(["sees", "hears"], { sees: list(r("id")), hears: r("hearing") });

const beat = obj(["id", "position", "senses"], {
  id: r("id"),
  label: r("text"),
  position: r("id"),
  senses,
  cue: r("text"),
  on_start: list(r("rule")),
});

const schedule = obj(["id", "period", "phase", "beats"], {
  // The id a `reveal` uses when the party learns the routine.
  id: r("id"),
  // Whether the party knows the routine from the start. Foreseen observers depend on it (D36).
  known: { type: "boolean" },
  // Ticks per beat is 1, so period = number of beats. At tick t the beat is beats[(t + phase) % period].
  period: { type: "integer", minimum: 1 },
  phase: { type: "integer", minimum: 0 },
  beats: list(beat, 1),
});

const npc = obj(["id", "name", "wants", "fears", "knows", "will_never", "temper", "under_pressure", "disposition", "position"], {
  id: r("id"),
  name: r("text"),
  tier: { enum: ["minion", "guard", "elite", "civilian"] },
  wants: r("text"),
  fears: r("text"),
  knows: r("text"),
  will_never: r("text"),
  temper: r("text"),
  under_pressure: r("text"),
  disposition: r("id"),
  // null: not in the encounter yet (arrives by an event).
  position: { oneOf: [r("id"), { type: "null" }] },
  senses,
  schedule,
});

const event = obj(["id", "do"], {
  id: r("id"),
  // Whether the party knows it's coming (Uzga's arrival is announced in the opening).
  known: { type: "boolean" },
  at_tick: { type: "integer", minimum: 0 },
  when: r("condition"),
  do: list(r("rule"), 1),
});

const meter = obj(["id", "scope", "start", "max", "levels"], {
  id: r("id"),
  name: r("text"),
  scope: { anyOf: [r("id"), { enum: ["encounter", "campaign"] }] },
  start: { type: "integer", minimum: 0 },
  max: { type: "integer", minimum: 1 },
  // Ops applied on reaching each level. Anything that should lapse when the meter falls carries `until`.
  levels: { type: "object", propertyNames: { pattern: "^[1-9][0-9]*$" }, additionalProperties: r("operations") },
  decay: obj(["by", "after_ticks", "quiet_if"], {
    by: { type: "integer", minimum: 1 },
    after_ticks: { type: "integer", minimum: 1 },
    quiet_if: r("condition"),
    blocked_by: r("condition"),
  }),
});

const trigger = obj(["id", "when", "do"], {
  id: r("id"),
  when: r("condition"),
  once: { type: "boolean" },
  do: list(r("rule"), 1),
});

const objective = obj(["id", "condition"], {
  id: r("id"),
  label: r("text"),
  condition: r("condition"),
});

export const packetSchema = withDefs({
  $id: "packet",
  type: "object",
  required: ["id", "mode", "act", "intent", "people", "map", "clock", "start", "opening"],
  additionalProperties: false,
  properties: {
    id: r("id"),
    mode: { enum: ["encounter", "room"] },
    act: { type: "integer", minimum: 1 },
    intent: obj(["purpose"], {
      objective,
      alternates: list(objective),
      fail_forward: objective,
      optional: list(objective),
      purpose: r("text"),
      expected_plans: { type: "array", prefixItems: [{ type: "integer" }, { type: "integer" }], minItems: 2, maxItems: 2 },
    }),
    people: list(npc),
    map: obj(["zones", "connections", "things", "facts"], {
      zones: list(zone, 1),
      connections: list(connection),
      things: list(thing),
      facts: list(obj(["id", "text"], { id: r("id"), text: r("text"), hidden: { type: "boolean" } })),
    }),
    clock: obj(["events", "meters", "triggers"], {
      events: list(event),
      meters: list(meter),
      triggers: list(trigger),
    }),
    start: obj(["tick", "positions"], {
      tick: { type: "integer", minimum: 0 },
      positions: { type: "object", additionalProperties: r("id") },
      ops: list(r("operation")),
    }),
    opening: r("text"),
  },
});
