// Party call output: both companions in one call. Contract: docs/spec/calls/party.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { stance, reactionFields } from "./companion.js";

// One line, by one of the two companions.
const line = obj(["from", "message"], { from: r("id"), message: r("text"), stance });

export const partySchema = withDefs({
  $id: "party",
  ...obj(["lines", "reactions"], {
    // What they say next (D137): the two of them in any order, answering each other or not. No lines is both of
    // them letting it go.
    lines: { ...list(line), maxItems: 4 },
    reactions: list(obj(["from", "field", "item", "sign", "intensity", "reason"], { from: r("id"), ...reactionFields })),
  }),
});
