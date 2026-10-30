// The condition language (docs/spec/engine.md §8). `ctx` carries the bindings and the step being resolved.
import { bind, zoneOf, partyIds, isParty } from "./world.js";
import { beatOf } from "./clock.js";

const cmp = { "<": (a, b) => a < b, "<=": (a, b) => a <= b, "=": (a, b) => a === b, ">=": (a, b) => a >= b, ">": (a, b) => a > b };

export function test(s, c, ctx = {}) {
  const [k, v] = Object.entries(c)[0];
  const b = (x) => bind(x, ctx);
  switch (k) {
    case "all": return v.every((x) => test(s, x, ctx));
    case "any": return v.some((x) => test(s, x, ctx));
    case "not": return !test(s, v, ctx);
    case "in_zone": return zoneOf(s, b(v[0])) === b(v[1]);
    case "party_all_in": return partyIds(s).every((id) => zoneOf(s, id) === b(v));
    case "holds": {
      const h = s.holder[v[1]];
      return v[0] === "party" ? isParty(s, h) : h === b(v[0]);
    }
    case "flag": {
      const got = s.flags[b(v[0])]?.[v[1]];
      return (typeof v[2] === "boolean" ? got ?? false : got) === v[2];
    }
    case "meter": return cmp[v[1]](s.meters[v[0]] ?? 0, v[2]);
    case "tick": return cmp[v[0]](s.tick, v[1]);
    case "beat": return beatOf(s, v[0])?.id === v[1];
    case "revealed": return s.known.revealed.includes(v);
    case "hp_below": return (s.hp[b(v[0])] ?? Infinity) < v[1];
    case "disposition": return s.disposition[v[0]] === v[1];
    case "step_tagged": return (ctx.step?.tags ?? []).includes(v);
    case "noticed_by": return s.noticed.includes(v);
  }
  throw new Error(`unknown condition ${k}`);
}

// Every entity id a condition is about, for perception (D39).
export function subjects(c, ctx = {}, out = []) {
  const [k, v] = Object.entries(c)[0];
  if (k === "all" || k === "any") v.forEach((x) => subjects(x, ctx, out));
  else if (k === "not") subjects(v, ctx, out);
  else if (["in_zone", "holds", "flag", "hp_below"].includes(k)) out.push(bind(v[0], ctx), ...(k === "holds" ? [v[1]] : []));
  else if (k === "beat" || k === "disposition") out.push(v[0]);
  else if (k === "party_all_in") out.push(bind(v, ctx));
  return out;
}

// The routine or event ids a condition relies on the party knowing (D35).
export const beatsNamed = (c, out = []) => {
  const [k, v] = Object.entries(c)[0];
  if (k === "all" || k === "any") v.forEach((x) => beatsNamed(x, out));
  else if (k === "not") beatsNamed(v, out);
  else if (k === "beat") out.push(v);
  return out;
};
