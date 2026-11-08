// A world: the place an adventure escapes, and everything about it that changes with the world (docs/spec/campaign.md
// §9, D150). Gravenhold (content/worlds/gravenhold.js) is written to it, and so is a generated world (D151).
import { r, list, obj } from "./shape.js";

export const WORLD_ROLES = ["place", "kind", "builders", "builders_adj", "rulers", "commander", "master", "working", "depths", "sanctum"];
const roles = obj(WORLD_ROLES, Object.fromEntries(WORLD_ROLES.map((k) => [k, r("text")])));
// A faction's ladder of leaders (D164): a local face, a lieutenant and the top, each with a hook a player can see. The
// act call picks each act's peak from the ladders of whoever blocks the party, climbing them across the acts.
const rung = obj(["name", "hook"], { name: r("text"), hook: r("text") });
const faction = obj(["name", "short", "desc", "rules", "goal", "ladder"], {
  name: r("text"),
  short: r("text"),
  desc: r("text"),
  // How they behave, and what works on them.
  rules: r("text"),
  // What they want from the heart.
  goal: r("text"),
  ladder: { ...list(rung, 3), maxItems: 3 },
});
// A region: the part of the place one act crosses (D164). The act call writes what it's like when the act starts.
const region = obj(["name", "what", "sanctuary", "holders", "feel"], {
  name: r("text"),
  what: r("text"),
  sanctuary: r("text"),
  // The ids of the factions that hold it at first; the act call may change them.
  holders: list(r("id"), 1),
  feel: r("text"),
});
// A mystery (D164): a hidden truth that is never confirmed, an edge it quietly gives in one place later, and partial
// clues that say part of it outright. Clues are rewards a room may hold; the edge reaches only the packets it applies in.
const mystery = obj(["id", "truth", "edge", "clues"], {
  id: r("id"),
  truth: r("text"),
  // `at` is "climax" (that act's climax) or a faction id (that faction's rooms, from that act on).
  edge: obj(["act", "at", "text"], { act: { type: "integer", minimum: 2, maximum: 5 }, at: r("text"), text: r("text") }),
  clues: list(obj(["id", "says"], { id: r("id"), says: r("text") }), 3),
});

export const worldShape = obj(["id", "name", "place", "escape", "roles", "heart", "life", "tensions", "features", "factions", "regions", "mysteries", "playerSecrets", "invariants"], {
  id: r("id"),
  name: r("text"),
  place: r("text"),
  escape: r("text"),
  roles,
  heart: r("text"),
  life: r("text"),
  tensions: list(r("text"), 2),
  features: { type: "object", additionalProperties: r("text") },
  factions: { type: "object", minProperties: 2, additionalProperties: faction },
  // The five regions, one per act, in the shape every world shares (content/setting.js, `arc`).
  regions: { ...list(region, 5), maxItems: 5 },
  mysteries: list(mystery, 2),
  playerSecrets: list(r("text"), 2),
  invariants: list(obj(["id", "text"], { id: r("id"), fromAct: { type: "integer", minimum: 1, maximum: 5 }, text: r("text") })),
});
