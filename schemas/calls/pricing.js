// Pricing call output. Contract: docs/spec/calls/pricing.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const pricingSchema = withDefs({
  $id: "pricing",
  ...obj(["steps", "rulings"], {
    steps: list(
      obj(["n", "risks", "mitigations"], {
        n: { type: "integer", minimum: 1 },
        risks: list(
          obj(["id", "covers", "difficulty", "odds", "reason", "on_fail"], {
            id: r("id"),
            // Observer, barrier or hazard ids from the engine's facts for this step.
            covers: list(r("id"), 1),
            difficulty: r("difficulty"),
            odds: r("odds"),
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
  }),
});
