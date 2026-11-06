// A world's role nouns in companion text (docs/spec/campaign.md §9, D150). Companion files say `{place}`, `{master}`,
// `{Builders}` and so on where their stories name the place they're escaping; the world fills them, so the same
// hand-written companion works in any world, and no AI rewrites her. A capitalised slot (`{Master}`) starts a sentence.
import { worlds, defaultWorld } from "../../content/worlds/index.js";

export const ROLES = ["place", "kind", "builders", "builders_adj", "rulers", "commander", "master", "working", "depths", "sanctum"];
export const worldOf = (id = defaultWorld) => worlds[id];

// A slot may be followed by a possessive. `{master}'s` is always 's ("the fortress's"); a bare `{rulers}'` suits the noun:
// "the occupiers'", but "the household's".
const SLOT = new RegExp(`\\{(${ROLES.map((r) => `${r}|${r[0].toUpperCase()}${r.slice(1)}`).join("|")})\\}('s|')?`, "g");

// Every string in `x`, with its slots filled from `world`'s roles.
export function inWorld(x, world = worldOf()) {
  if (typeof x === "string")
    return x.replace(SLOT, (_, slot, poss) => {
      const v = world.roles[slot.toLowerCase()] ?? world.roles[slot];
      const word = slot[0] === slot[0].toUpperCase() ? v[0].toUpperCase() + v.slice(1) : v;
      return poss === "'" && !word.endsWith("s") ? `${word}'s` : word + (poss ?? "");
    });
  if (Array.isArray(x)) return x.map((v) => inWorld(v, world));
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, inWorld(v, world)]));
  return x;
}

// The roster as it is in `world`.
export const rosterIn = (roster, world = worldOf()) => Object.fromEntries(Object.entries(roster).map(([id, c]) => [id, inWorld(c, world)]));

// What a world is missing for these companions: a role any slot needs, or a feature a companion's story needs
// (`needs`, each one a key of the world's `features`). A generated world with problems goes back (D150).
export function worldProblems(world, members) {
  const problems = ROLES.filter((r) => !world.roles?.[r]).map((r) => `the world has no ${r}`);
  for (const c of members) for (const need of c.needs ?? []) if (!world.features?.[need]) problems.push(`${c.name} needs ${need.replaceAll("_", " ")}`);
  return problems;
}
