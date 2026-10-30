// The engine's record of executing a card, and what a fixture expects of it. Feeds the narration call
// and the event log. Example: fixtures/cells/card2.results.json.
import { withDefs } from "./defs.js";
import { r, list, obj } from "./shape.js";

export const resultsSchema = withDefs({
  $id: "results",
  ...obj(["card", "rolls", "steps", "expect"], {
    card: r("text"),
    // Forced d100 results, in order, for fixtures. In play the seeded generator supplies them.
    rolls: list({ type: "integer", minimum: 1, maximum: 100 }),
    steps: list(
      obj(["n", "tick", "outcome", "rolls"], {
        n: { type: "integer", minimum: 1 },
        tick: { type: "integer", minimum: 0 },
        waited: { type: "integer", minimum: 0 },
        // stopped: a failed risk with stops_plan. interrupted: reality differed from what the card expected.
        // skipped: an `if` was false and `otherwise` was "skip". alternative: `otherwise` ran instead.
        outcome: { enum: ["done", "stopped", "interrupted", "skipped", "alternative"] },
        interrupt: obj(["code", "detail"], {
          code: r("id"),
          effect: { type: "integer", minimum: 0 },
          id: r("id"),
          detail: r("text"),
          // For an arrival: whether the party heard it coming (and so acts first on the next plan).
          warning: obj(["odds", "roll", "success"], {
            odds: r("odds"),
            roll: { type: "integer", minimum: 1, maximum: 100 },
            success: { type: "boolean" },
          }),
        }),
        rolls: list(
          obj(["risk", "odds", "roll", "success"], {
            risk: r("id"),
            odds: r("odds"),
            roll: { type: "integer", minimum: 1, maximum: 100 },
            success: { type: "boolean" },
          }),
        ),
        triggers: list(r("id")),
        // The plan paused here at a player checkpoint (D68).
        checkpoint: { const: true },
        // A companion's stance tripped on this step: kept stops the plan before it; overridden is logged (engine.md §7).
        stance: obj(["companion", "decision"], { companion: r("id"), decision: { enum: ["keep", "override"] } }),
      }),
      1,
    ),
    // Must hold once the card has run and the engine's triggers have settled.
    expect: r("condition"),
  }),
});
