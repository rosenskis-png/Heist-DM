// Companion call output. Contract: docs/spec/calls/companion.md; scoring: docs/spec/companions.md §5.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const companionSchema = withDefs({
  $id: "companion",
  ...obj(["message", "reactions"], {
    // null is a pass.
    message: { oneOf: [r("text"), { type: "null" }] },
    stance: obj(["kind", "text", "traced_to"], {
      kind: { enum: ["refuse", "insist", "conditional"] },
      text: r("text"),
      traced_to: obj(["field", "item"], { field: { enum: ["beliefs", "despises", "rules", "limits"] }, item: r("text") }),
      trigger: r("condition"),
    }),
    reactions: list(
      obj(["field", "item", "sign", "intensity", "reason"], {
        field: { enum: ["heatActs", "turnoffs", "admires", "despises", "darkTriggers", "suppressed"] },
        item: r("text"),
        sign: { enum: [1, -1] },
        intensity: { enum: [1, 2] },
        reason: r("text"),
      }),
    ),
  }),
});
