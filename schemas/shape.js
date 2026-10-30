// Small builders shared by the call schemas.
export const r = (name) => ({ $ref: `#/$defs/${name}` });
export const list = (items, min = 0) => ({ type: "array", minItems: min, items });
export const obj = (required, properties) => ({ type: "object", required, additionalProperties: false, properties });
