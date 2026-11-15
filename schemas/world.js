// A world: the place an adventure escapes, and everything about it that changes with the world (docs/spec/campaign.md
// §9, D150). Gravenhold (content/worlds/gravenhold.js) is written to it, and so is a generated world (D151).
import { r, list, obj } from "./shape.js";

export const WORLD_ROLES = ["place", "kind", "builders", "builders_adj", "rulers", "commander", "master", "working", "depths", "sanctum"];
const roles = obj(WORLD_ROLES, Object.fromEntries(WORLD_ROLES.map((k) => [k, r("text")])));
// A faction's ladder of leaders (D164): a local face, a lieutenant and the top, each with a hook a player would remember. The
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
const region = obj(["name", "what", "sanctuary", "feel"], {
  name: r("text"),
  what: r("text"),
  sanctuary: r("text"),
  // Older worlds name the factions that hold it; nothing reads them now (D197).
  holders: list(r("id")),
  feel: r("text"),
});
// A mystery (D164, D168): a hidden truth that is never confirmed, an edge it quietly gives in one place later, and a
// journal someone in the world wrote about it, torn into pages. A page is a reward a room may hold; the party reads it at
// camp. The edge reaches only the packets it applies in.
const mystery = obj(["id", "truth", "edge", "journal"], {
  id: r("id"),
  truth: r("text"),
  // `at` is "climax" (that act's climax only) or the id of the faction it works on (every room from that act on, D197).
  edge: obj(["act", "at", "text"], { act: { type: "integer", minimum: 2, maximum: 5 }, at: r("text"), text: r("text") }),
  journal: obj(["author", "pages"], {
    // Who wrote it, in a phrase ("a Haskan loremaster, dying").
    author: r("text"),
    // The journal in order, torn into pages; what the truth needs is spread across them.
    pages: list(obj(["id", "text"], { id: r("id"), text: r("text") }), 3),
  }),
});

export const worldShape = obj(["id", "name", "place", "escape", "roles", "heart", "life", "tensions", "features", "factions", "regions", "mysteries", "playerSecrets", "invariants"], {
  id: r("id"),
  name: r("text"),
  place: r("text"),
  // The register the world is told in (D196): its genre and mood in a line or two, from the player's vibe. Optional, so
  // a world saved before it still loads.
  tone: r("text"),
  escape: r("text"),
  roles,
  heart: r("text"),
  life: r("text"),
  // What its powers want from each other; none when one power holds the place (D196).
  tensions: list(r("text")),
  features: { type: "object", additionalProperties: r("text") },
  // As many powers as the place really has (D196): one is fine.
  factions: { type: "object", minProperties: 1, additionalProperties: faction },
  // The five regions, one per act, in the shape every world shares (content/setting.js, `arc`).
  regions: { ...list(region, 5), maxItems: 5 },
  mysteries: list(mystery, 2),
  playerSecrets: list(r("text"), 2),
  invariants: list(obj(["id", "text"], { id: r("id"), fromAct: { type: "integer", minimum: 1, maximum: 5 }, text: r("text") })),
});
