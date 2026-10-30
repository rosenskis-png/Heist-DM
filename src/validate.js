// A small JSON Schema validator for the subset the contracts in schemas/ use. Pure; no dependencies (D12).
// Returns a list of errors, each "path: message". An empty list means valid.

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const isType = (v, t) => t === typeOf(v) || (t === "number" && typeof v === "number");

export function validate(schema, value) {
  const errors = [];
  check(schema, value, "$", schema, errors);
  return errors;
}

function resolve(schema, root) {
  if (!schema.$ref) return schema;
  const name = schema.$ref.replace("#/$defs/", "");
  const target = root.$defs?.[name];
  if (!target) throw new Error(`unknown $ref ${schema.$ref}`);
  return target;
}

function check(schema, v, path, root, errors) {
  schema = resolve(schema, root);
  const fail = (msg) => errors.push(`${path}: ${msg}`);

  if (schema.oneOf || schema.anyOf) {
    const branches = schema.oneOf ?? schema.anyOf;
    const results = branches.map((b) => {
      const e = [];
      check(b, v, path, root, e);
      return e;
    });
    const passed = results.filter((e) => e.length === 0).length;
    if (passed === 0) {
      // Report the closest branch; for single-key objects, the branch named by the key.
      const key = v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v)[0] : undefined;
      const named = branches.findIndex((b) => resolve(b, root).required?.[0] === key);
      const best = named >= 0 ? results[named] : results.reduce((a, b) => (b.length < a.length ? b : a));
      errors.push(...best);
    } else if (schema.oneOf && passed > 1) fail("matches more than one alternative");
    return;
  }

  if (schema.const !== undefined && v !== schema.const) return fail(`must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(v)) return fail(`must be one of ${schema.enum.join(", ")}`);
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => isType(v, t))) return fail(`must be ${types.join(" or ")}, got ${typeOf(v)}`);
  }

  if (typeof v === "string") {
    if (schema.minLength !== undefined && v.length < schema.minLength) fail("must not be empty");
    if (schema.pattern && !new RegExp(schema.pattern).test(v)) fail(`"${v}" must match ${schema.pattern}`);
  }
  if (typeof v === "number") {
    if (schema.minimum !== undefined && v < schema.minimum) fail(`must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && v > schema.maximum) fail(`must be at most ${schema.maximum}`);
  }
  if (Array.isArray(v)) {
    if (schema.minItems !== undefined && v.length < schema.minItems) fail(`needs at least ${schema.minItems} items`);
    if (schema.maxItems !== undefined && v.length > schema.maxItems) fail(`allows at most ${schema.maxItems} items`);
    v.forEach((item, i) => {
      const s = schema.prefixItems?.[i] ?? schema.items;
      if (s) check(s, item, `${path}[${i}]`, root, errors);
    });
  }
  if (typeOf(v) === "object") {
    const keys = Object.keys(v);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) fail(`needs at least ${schema.minProperties} fields`);
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) fail(`allows at most ${schema.maxProperties} fields`);
    for (const k of schema.required ?? []) if (!(k in v)) fail(`missing "${k}"`);
    for (const k of keys) {
      const p = `${path}.${k}`;
      if (schema.propertyNames?.pattern && !new RegExp(schema.propertyNames.pattern).test(k)) errors.push(`${p}: field name not allowed`);
      if (schema.properties?.[k]) check(schema.properties[k], v[k], p, root, errors);
      else if (schema.additionalProperties === false) errors.push(`${p}: unknown field`);
      else if (typeof schema.additionalProperties === "object") check(schema.additionalProperties, v[k], p, root, errors);
    }
  }
}
