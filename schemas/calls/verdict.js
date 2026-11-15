// Verdict call output: how a room went, and what it moved in each companion (D146). Contract:
// docs/spec/calls/verdict.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { reactionFields } from "./companion.js";

export const verdictSchema = withDefs({
  $id: "verdict",
  ...obj(["rating", "why", "reactions", "people", "memories"], {
    // How the room went for the party, 1 (brutal) to 10 (everything they could have wanted), against the anchors.
    rating: { type: "integer", minimum: 1, maximum: 10 },
    // One or two sentences on what earned the rating, from the record.
    why: r("text"),
    // What moved each companion's feelings, and why, by her own values (D20). The engine caps them.
    reactions: list(obj(["from", "field", "item", "sign", "intensity", "reason"], { from: r("id"), ...reactionFields })),
    // Up to two people from the room worth meeting again (D164): who they are, what became of them, and how they feel
    // about the party. A later room may bring one back.
    people: { ...list(obj(["name", "fate", "feels"], { name: r("text"), fate: r("text"), feels: r("text") })), maxItems: 2 },
    // What each companion will remember of the room (D193), at most two each: `short`, a line; `long`, a few sentences
    // with where they were, what they were trying, what happened and what struck her. `core` if it belongs among the
    // moments she keeps all game; `instead_of`, the core memory it would replace when hers are full.
    memories: { ...list(obj(["from", "short", "long", "core"], { from: r("id"), short: r("text"), long: r("text"), core: { type: "boolean" }, instead_of: r("id") })), maxItems: 4 },
    // Memories from earlier in the leg she can let go of, by id, to make room.
    forget: list(r("id")),
  }),
});
