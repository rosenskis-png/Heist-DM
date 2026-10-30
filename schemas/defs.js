// Shared definitions: ids, the condition language and the state-change operations (D17).
// Semantics: docs/spec/engine.md §8–9. Every other schema pulls these in through `withDefs`.

const id = { type: "string", pattern: "^[a-z][a-z0-9_]*$" };

// An id, or a binding the engine fills in when a rule runs: @self (the actor using an ability),
// @step_zone (the zone of the step being resolved).
const ref = { type: "string", pattern: "^([a-z][a-z0-9_]*|@self|@step_zone)$" };

const scalar = { type: ["string", "number", "boolean"] };
const compare = { enum: ["<", "<=", "=", ">=", ">"] };
const text = { type: "string", minLength: 1 };

const atom = (name, value) => ({
  type: "object",
  required: [name],
  additionalProperties: false,
  properties: { [name]: value },
});
const tuple = (...items) => ({ type: "array", prefixItems: items, minItems: items.length, maxItems: items.length });

const condition = {
  oneOf: [
    atom("all", { type: "array", minItems: 1, items: { $ref: "#/$defs/condition" } }),
    atom("any", { type: "array", minItems: 1, items: { $ref: "#/$defs/condition" } }),
    atom("not", { $ref: "#/$defs/condition" }),
    atom("in_zone", tuple(ref, id)),
    atom("party_all_in", id),
    atom("holds", tuple(ref, id)),
    atom("flag", tuple(ref, id, scalar)),
    atom("meter", tuple(id, compare, { type: "integer" })),
    atom("tick", tuple(compare, { type: "integer" })),
    atom("beat", tuple(id, id)),
    atom("revealed", id),
    atom("hp_below", tuple(ref, { type: "integer" })),
    atom("disposition", tuple(id, id)),
    atom("step_tagged", { $ref: "#/$defs/tag" }),
    atom("noticed_by", id),
  ],
};

const op = (name, required, properties) =>
  atom(name, { type: "object", required, additionalProperties: false, properties });

const until = { $ref: "#/$defs/condition" };
const senseChange = {
  type: "object",
  additionalProperties: false,
  properties: {
    sees_add: { type: "array", items: id },
    sees_remove: { type: "array", items: id },
    hears: { $ref: "#/$defs/hearing" },
  },
};

const operation = {
  oneOf: [
    op("move", ["entity", "to"], { entity: ref, to: id, path: { type: "array", minItems: 1, maxItems: 2, items: id } }),
    op("give", ["item", "to"], { item: id, to: ref, path: { type: "array", minItems: 1, maxItems: 2, items: id } }),
    op("place", ["item", "zone"], { item: id, zone: ref }),
    op("consume", ["item"], { item: id }),
    op("set_flag", ["entity", "key", "value"], { entity: ref, key: id, value: scalar, until }),
    op("meter_add", ["meter", "by"], { meter: id, by: { type: "integer" } }),
    op("set_disposition", ["npc", "value"], { npc: id, value: id }),
    op("edit_schedule", ["npc"], {
      npc: id,
      drop_beat: id,
      override: {
        type: "object",
        required: ["position", "ticks"],
        additionalProperties: false,
        properties: { position: ref, ticks: { type: "integer", minimum: 1 } },
      },
      until,
    }),
    op("set_sense", ["npc"], { npc: id, beat: id, change: senseChange, until }),
    op("reveal", ["id"], { id }),
    op("add_canon", ["kind", "text"], { kind: { enum: ["texture", "ruling"] }, text }),
    op("use_ability", ["actor", "ability"], { actor: ref, ability: id }),
    op("add_ticks", ["ticks"], { ticks: { type: "integer", minimum: 1 } }),
    op("start_combat", ["enemies"], { enemies: { type: "array", minItems: 1, items: id } }),
    op("damage", ["actor", "amount"], { actor: ref, amount: { type: "integer", minimum: 1 } }),
    op("end_encounter", ["outcome"], { outcome: id }),
  ],
};

// A rule run by the engine: if the condition holds, apply `then`, otherwise `else`.
const rule = {
  type: "object",
  required: ["then"],
  additionalProperties: false,
  properties: {
    if: { $ref: "#/$defs/condition" },
    then: { type: "array", items: { $ref: "#/$defs/operation" } },
    else: { type: "array", items: { $ref: "#/$defs/operation" } },
  },
};

const hearing = {
  type: "object",
  required: ["zones", "level"],
  additionalProperties: false,
  properties: {
    zones: { type: "array", items: id },
    level: { $ref: "#/$defs/noise" },
  },
};

// The part of an ability the engine tracks (D30). null uses means at will.
const ability = {
  type: "object",
  required: ["uses", "effects"],
  additionalProperties: false,
  properties: {
    uses: {
      oneOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: { encounter: { type: "integer", minimum: 1 }, rest: { type: "integer", minimum: 1 } },
        },
      ],
    },
    effects: { type: "array", items: { $ref: "#/$defs/operation" } },
    one_way: { type: "boolean" },
    traits: { type: "array", items: id },
  },
};

export const defs = {
  id,
  ability,
  ref,
  text,
  condition,
  operation,
  rule,
  hearing,
  operations: { type: "array", items: { $ref: "#/$defs/operation" } },
  tag: { enum: ["violent", "lethal", "theft", "deception", "loud", "starts_combat"] },
  // The quietest sound a listener catches, and how loud a step is.
  noise: { enum: ["silent", "quiet", "speech", "loud"] },
  size: { enum: ["tiny", "small", "medium", "large"] },
  // What the AIs judge. The engine turns a band into the number it rolls against (docs/spec/engine.md §7).
  difficulty: { enum: ["easy", "medium", "hard", "very_hard", "near_impossible"] },
  // Engine-side only: the number a band rolls against. No AI reads or writes it.
  odds: { type: "integer", minimum: 1, maximum: 100 },
};

export const withDefs = (schema) => ({ ...schema, $defs: { ...defs, ...(schema.$defs ?? {}) } });
