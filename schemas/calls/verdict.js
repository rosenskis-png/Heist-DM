// Verdict call output: how a room went, and what it moved in each companion (D146). Contract:
// docs/spec/calls/verdict.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { reactionFields } from "./companion.js";

export const verdictSchema = withDefs({
  $id: "verdict",
  ...obj(["rating", "why", "reactions", "people"], {
    // How the room went for the party, 1 (brutal) to 10 (everything they could have wanted), against the anchors.
    rating: { type: "integer", minimum: 1, maximum: 10 },
    // One or two sentences on what earned the rating, from the record.
    why: r("text"),
    // What moved each companion's feelings, and why, by her own values (D20). The engine caps them.
    reactions: list(obj(["from", "field", "item", "sign", "intensity", "reason"], { from: r("id"), ...reactionFields })),
    // Up to two people from the room worth meeting again (D164): who they are, what became of them, and how they feel
    // about the party. A later room may bring one back.
    people: { ...list(obj(["name", "fate", "feels"], { name: r("text"), fate: r("text"), feels: r("text") })), maxItems: 2 },
  }),
});
