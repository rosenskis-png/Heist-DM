// Read call output: a room as a first-time player takes it in. Contract: docs/spec/calls/read.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const readSchema = withDefs({
  $id: "read",
  ...obj(["clear", "layout", "handles", "unclear"], {
    // Whether the reader could picture the room and knew what they'd want in it, after one hearing.
    clear: { type: "boolean" },
    // The room as the reader pictures it from what was said.
    layout: r("text"),
    // What a player could take hold of, from the telling alone. Never counted.
    handles: { ...list(obj(["what", "try", "cost"], { what: r("text"), try: r("text"), cost: r("text") })), maxItems: 8 },
    // What they'd have to ask before planning anything.
    unclear: { ...list(r("text")), maxItems: 5 },
  }),
});
