// Pricing call output. Contract: docs/spec/calls/pricing.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

// Every step is priced as the party expects the world to be (D36). Things the party doesn't foresee
// are not priced here; they interrupt the plan during execution.
export const pricingSchema = withDefs({
  $id: "pricing",
  ...obj(["steps", "rulings"], {
    steps: list(
      obj(["n", "risks", "mitigations"], {
        n: { type: "integer", minimum: 1 },
        risks: list(
          obj(["id", "covers", "difficulty", "reason", "on_fail"], {
            id: r("id"),
            // Observer, barrier or hazard ids from the engine's foreseen facts for this step.
            covers: list(r("id"), 1),
            difficulty: r("difficulty"),
            reason: r("text"),
            on_fail: obj(["summary", "ops", "stops_plan"], {
              summary: r("text"),
              ops: r("operations"),
              // Indexes of this step's effects that don't happen when the risk fails.
              cancels: list({ type: "integer", minimum: 0 }),
              stops_plan: { type: "boolean" },
            }),
          }),
        ),
        mitigations: list(
          obj(["covers", "by", "ref", "note"], {
            covers: r("id"),
            by: { enum: ["ability", "item", "fact", "step"] },
            ref: { oneOf: [r("id"), { type: "integer", minimum: 1 }] },
            note: r("text"),
          }),
        ),
      }),
      1,
    ),
    rulings: list(r("text")),
    // Internal, never shown: for each projected arrival the party doesn't foresee, how hard it is for
    // the party to hear it coming (docs/spec/engine.md §6).
    warnings: list(
      obj(["n", "covers", "difficulty", "reason"], {
        n: { type: "integer", minimum: 1 },
        covers: r("id"),
        difficulty: { oneOf: [{ const: "automatic" }, r("difficulty")] },
        reason: r("text"),
      }),
    ),
  }),
});
