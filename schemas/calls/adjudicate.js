// Adjudicate call output: the DM's card for a plan (D75). Contract: docs/spec/calls/adjudicate.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { changes, band } from "../ledger.js";

export const adjudicateSchema = withDefs({
  $id: "adjudicate",
  $defs: { changes, band },
  ...obj(["steps", "rulings"], {
    steps: list(
      obj(["n", "summary", "who", "at", "takes"], {
        n: { type: "integer", minimum: 1 },
        summary: r("text"),
        who: list(r("id"), 1),
        // The tick the step starts on, and how many it takes (0 for something done alongside another step).
        at: { type: "integer", minimum: 0 },
        takes: { type: "integer", minimum: 0 },
        // A roll only where failure is possible and interesting. `fails` is what failure costs, stated now.
        roll: obj(["band", "reason", "fails", "stops"], { band: r("band"), reason: r("text"), fails: r("text"), stops: { type: "boolean" } }),
      }),
      1,
    ),
    // What the DM rules about the world for this plan. They become facts when the plan runs.
    rulings: list(obj(["id", "text"], { id: r("id"), text: r("text"), about: list(r("id")) })),
  }),
});
