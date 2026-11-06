// A world: the place an adventure escapes, and everything about it that changes with the world (docs/spec/campaign.md
// §9, D150). Gravenhold (content/worlds/gravenhold.js) is written to it, and so is a generated world (D151).
import { r, list, obj } from "./shape.js";

export const WORLD_ROLES = ["place", "kind", "builders", "builders_adj", "rulers", "commander", "master", "working", "depths", "sanctum"];
const roles = obj(WORLD_ROLES, Object.fromEntries(WORLD_ROLES.map((k) => [k, r("text")])));
const faction = obj(["name", "short", "desc", "rules", "goal", "boss"], {
  name: r("text"),
  short: r("text"),
  desc: r("text"),
  // How they behave, what works on them, and their alarm.
  rules: r("text"),
  // What they want from the heart.
  goal: r("text"),
  boss: r("text"),
});
const act = obj(["name", "sanctuary", "mechanics", "goal"], { name: r("text"), sanctuary: r("text"), mechanics: r("text"), goal: r("text") });

export const worldShape = obj(["id", "name", "place", "escape", "roles", "heart", "life", "tensions", "features", "factions", "acts", "playerSecrets", "roomKinds", "invariants"], {
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
  // The five acts, in the shape every world shares (content/setting.js, `arc`).
  acts: { ...list(act, 5), maxItems: 5 },
  openAct: obj(["min", "sanctuary", "mechanics", "goal"], { min: { type: "integer" }, sanctuary: r("text"), mechanics: r("text"), goal: r("text") }),
  playerSecrets: list(r("text"), 2),
  roomKinds: obj(["exploration", "social", "respite"], { exploration: r("text"), social: r("text"), respite: r("text") }),
  invariants: list(obj(["id", "text"], { id: r("id"), fromAct: { type: "integer", minimum: 1, maximum: 5 }, text: r("text") })),
});
