// A card: the plan, the decided stances, the step call's steps, the engine's facts per step, and the
// pricing call's prices. Facts are written by the engine (docs/spec/engine.md §6). Examples: fixtures/cells/card*.json.
import { withDefs } from "./defs.js";
import { stepSchema } from "./calls/step.js";
import { pricingSchema } from "./calls/pricing.js";
import { r, list, obj } from "./shape.js";

const { $defs: _s, $id: _a, ...stepOutput } = stepSchema;
const { $defs: _p, $id: _b, ...pricingOutput } = pricingSchema;

export const cardSchema = withDefs({
  $id: "card",
  ...obj(["packet", "tick", "plan", "stances", "step_call", "facts", "pricing_call"], {
    packet: r("id"),
    tick: { type: "integer", minimum: 0 },
    // The player's words, verbatim.
    plan: r("text"),
    stances: list(
      obj(["companion", "kind", "text", "decision"], {
        companion: r("id"),
        kind: { enum: ["refuse", "insist", "conditional"] },
        text: r("text"),
        trigger: r("condition"),
        decision: { enum: ["keep", "resolved", "override"] },
      }),
    ),
    step_call: stepOutput,
    facts: list(
      obj(["n", "tick", "beats", "route", "observers", "barriers", "hazards", "problems"], {
        n: { type: "integer", minimum: 1 },
        tick: { type: "integer", minimum: 0 },
        beats: { type: "object", additionalProperties: r("id") },
        route: list(r("id"), 1),
        observers: list(r("id")),
        barriers: list(r("id")),
        hazards: list(r("id")),
        // Effects that can't happen at the projected tick. Shown on the card; not an error in the step call.
        problems: list(
          obj(["effect", "code", "detail"], {
            effect: { type: "integer", minimum: 0 },
            code: { enum: ["not_there", "no_connection", "too_big", "locked", "requires_failed", "ability_spent", "trigger_fires"] },
            detail: r("text"),
          }),
        ),
      }),
      1,
    ),
    pricing_call: pricingOutput,
  }),
});
