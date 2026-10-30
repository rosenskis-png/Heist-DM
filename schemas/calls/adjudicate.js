// Adjudicate call output: the DM's card for a plan (D75, D77). Contract: docs/spec/calls/adjudicate.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { changes, band } from "../ledger.js";

export const adjudicateSchema = withDefs({
  $id: "adjudicate",
  $defs: { changes, band },
  ...obj(["steps", "ends_at", "rulings"], {
    steps: list(
      obj(["n", "summary", "who", "at"], {
        n: { type: "integer", minimum: 1 },
        summary: r("text"),
        who: list(r("id"), 1),
        // The tick the step happens on. Time belongs to the plan, not the steps: steps can share a tick (D77).
        at: { type: "integer", minimum: 0 },
        // A roll only where failure is possible and interesting. `fails` is what failure costs, stated now.
        roll: obj(["band", "reason", "fails", "stops"], { band: r("band"), reason: r("text"), fails: r("text"), stops: { type: "boolean" } }),
      }),
      1,
    ),
    // The tick the whole plan is done.
    ends_at: { type: "integer", minimum: 0 },
    // Lasting truths about this world the plan depends on. They become facts when it runs (D76).
    rulings: { ...list(obj(["id", "text"], { id: r("id"), text: { type: "string", minLength: 1, maxLength: 160 }, about: list(r("id")) })), maxItems: 3 },
    // Shown on the card and then dropped: why there's no roll, what the plan leaves out.
    notes: { ...list(r("text")), maxItems: 3 },
  }),
});
