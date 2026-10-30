// A card: the plan, the decided stances, the step call's steps, the engine's facts per step, and the
// pricing call's prices. Facts are written by the engine (docs/spec/engine.md §6). Examples: fixtures/cells/card*.json.
// Before the card is shown, the engine strips the internal fields: interrupts, internal checks and warnings.
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
    // Each step is projected as if the earlier steps went as planned (D36).
    facts: list(
      obj(["n", "tick", "beats", "route", "observers", "barriers", "hazards", "interrupts"], {
        n: { type: "integer", minimum: 1 },
        // The tick the step starts on, after any wait.
        tick: { type: "integer", minimum: 0 },
        waited: { type: "integer", minimum: 0 },
        beats: { type: "object", additionalProperties: r("id") },
        route: list(r("id"), 1),
        // Foreseen only: what the party knows is there at that tick. These are what the pricing call covers.
        observers: list(r("id")),
        barriers: list(r("id")),
        hazards: list(r("id")),
        // Internal, never shown: where reality is projected to differ from what the party expects. During
        // execution the plan stops there (docs/spec/engine.md §6).
        interrupts: list(
          obj(["code", "detail"], {
            code: {
              enum: ["arrival", "not_there", "too_big", "locked", "requires_failed", "ability_spent", "trigger_fires", "hidden_fact", "wait_expired"],
            },
            // The step effect it stops at; absent when it stops the step before it begins.
            effect: { type: "integer", minimum: 0 },
            // The NPC, thing or fact involved.
            id: r("id"),
            detail: r("text"),
          }),
        ),
      }),
      1,
    ),
    pricing_call: pricingOutput,
  }),
});
