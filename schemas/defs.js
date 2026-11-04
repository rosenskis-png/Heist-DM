// Shared definitions: ids, the condition language and the state-change operations (D17).
// Semantics: docs/spec/engine.md §8–9. Every other schema pulls these in through `withDefs`.

const id = { type: "string", pattern: "^[a-z][a-z0-9_]*$" };

// An id, or @self: the companion an ability's effects are about.
const ref = { type: "string", pattern: "^([a-z][a-z0-9_]*|@self)$" };

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
    atom("tick", tuple(compare, { type: "integer" })),
    atom("beat", tuple(id, id)),
    atom("revealed", id),
    atom("disposition", tuple(id, id)),
  ],
};

const op = (name, required, properties) =>
  atom(name, { type: "object", required, additionalProperties: false, properties });

const operation = {
  oneOf: [
    op("move", ["entity", "to"], { entity: ref, to: id }),
    op("give", ["item", "to"], { item: id, to: ref }),
    op("place", ["item", "zone"], { item: id, zone: ref }),
    op("set_flag", ["entity", "key", "value"], { entity: ref, key: id, value: scalar }),
    op("reveal", ["id"], { id }),
    op("add_canon", ["kind", "text"], { kind: { enum: ["texture", "ruling"] }, text }),
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
  // The quietest sound a listener catches, and how loud a step is.
  noise: { enum: ["silent", "quiet", "speech", "loud"] },
  size: { enum: ["tiny", "small", "medium", "large"] },
};

export const withDefs = (schema) => ({ ...schema, $defs: { ...defs, ...(schema.$defs ?? {}) } });
