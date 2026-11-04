// Companion call output. Contract: docs/spec/calls/companion.md; scoring: docs/spec/companions.md §5.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

// A stance on the plan, traced to her profile. Shared with the party call.
export const stance = obj(["kind", "text", "traced_to"], {
  kind: { enum: ["refuse", "insist", "conditional"] },
  text: r("text"),
  traced_to: obj(["field", "item"], { field: { enum: ["beliefs", "despises", "rules", "limits"] }, item: r("text") }),
  trigger: r("condition"),
});

// A reaction to something that just happened (D20). Shared with the party call.
export const reactionFields = {
  field: { enum: ["heatActs", "turnoffs", "admires", "despises", "darkTriggers", "suppressed"] },
  item: r("text"),
  sign: { enum: [1, -1] },
  intensity: { enum: [1, 2] },
  reason: r("text"),
};

// One thing she might say, and the stance it takes, if any.
const candidate = obj(["message"], {
  // null is a pass.
  message: { oneOf: [r("text"), { type: "null" }] },
  stance,
});

export const companionSchema = withDefs({
  $id: "companion",
  ...obj(["candidates", "reactions"], {
    // Three genuinely different things she might say. The engine picks one at random (D40).
    candidates: { ...list(candidate, 3), maxItems: 3 },
    reactions: list(obj(["field", "item", "sign", "intensity", "reason"], reactionFields)),
  }),
});
