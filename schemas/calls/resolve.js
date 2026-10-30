// Resolve call output: what really happened when the card ran, given its rolls (D75). Contract: docs/spec/calls/resolve.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { changes, band } from "../ledger.js";

export const resolveSchema = withDefs({
  $id: "resolve",
  $defs: { changes, band },
  ...obj(["steps", "ends_at"], {
    // Each step in order, up to where the plan stopped.
    steps: list(
      obj(["n", "happened", "what", "changes"], {
        n: { type: "integer", minimum: 1 },
        happened: { enum: ["yes", "partly", "no"] },
        what: r("text"),
        changes: r("changes"),
      }),
    ),
    // Where reality stopped the plan, if it did: the step it stopped at and why, as the party sees it.
    stopped: obj(["at", "why"], { at: { type: "integer", minimum: 1 }, why: r("text") }),
    // How the people in the encounter respond once the plan is done or stopped.
    after: r("changes"),
    ends_at: { type: "integer", minimum: 0 },
  }),
});
