// Party call output: both companions in one call. Contract: docs/spec/calls/party.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { stance, reactionFields } from "./companion.js";

// One line, by one of the two companions.
const line = obj(["from", "message"], { from: r("id"), message: r("text"), stance });

// One way the next moment at the table could go: the two of them in any order, answering each other or not.
// No lines is both of them letting it go.
const exchange = obj(["lines"], { lines: { ...list(line), maxItems: 4 } });

export const partySchema = withDefs({
  $id: "party",
  ...obj(["exchanges", "reactions"], {
    // Three genuinely different exchanges. The engine picks one at random (D40).
    exchanges: { ...list(exchange, 3), maxItems: 3 },
    reactions: list(obj(["from", "field", "item", "sign", "intensity", "reason"], { from: r("id"), ...reactionFields })),
  }),
});
