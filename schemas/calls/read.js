// Read call output: a room as a first-time player takes it in. Contract: docs/spec/calls/read.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const readSchema = withDefs({
  $id: "read",
  ...obj(["layout", "handles", "unclear"], {
    // The room as the reader pictures it from what was said.
    layout: r("text"),
    // What a player could take hold of to get past the danger, from the telling alone.
    handles: { ...list(obj(["what", "try", "cost"], { what: r("text"), try: r("text"), cost: r("text") })), maxItems: 8 },
    // What they'd have to ask before planning anything.
    unclear: { ...list(r("text")), maxItems: 5 },
  }),
});
