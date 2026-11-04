// The condition language (docs/spec/engine.md §8). `ctx` carries the bindings.
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
    case "tick": return cmp[v[0]](s.tick, v[1]);
    case "beat": return beatOf(s, v[0])?.id === v[1];
    case "revealed": return s.known.revealed.includes(v);
    case "disposition": return s.disposition[v[0]] === v[1];
  }
  throw new Error(`unknown condition ${k}`);
}
