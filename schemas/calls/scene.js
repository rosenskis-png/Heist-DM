// Scene call output: one exchange in the Moment tab when the DM rules (D75). Contract: docs/spec/calls/scene.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { changes, band } from "../ledger.js";

const outcome = obj(["text", "changes"], { text: r("text"), changes: r("changes") });

export const sceneSchema = withDefs({
  $id: "scene",
  $defs: { changes, band },
  ...obj(["reply", "ticks"], {
    reply: r("text"),
    // Each uncertain thing someone tries in this exchange, with both outcomes written before the roll.
    checks: list(obj(["who", "band", "reason", "success", "failure"], { who: r("id"), band: r("band"), reason: r("text"), success: outcome, failure: outcome })),
    // What happens whatever the dice say: a person agrees, a fact is learned, someone moves.
    changes: r("changes"),
    learned: list(r("text")),
    // How long the exchange took in ticks: 0 for a question or a quick word.
    ticks: { type: "integer", minimum: 0 },
    // When the player describes several steps, the plan to put on the card, in their words.
    plan: r("text"),
  }),
});
