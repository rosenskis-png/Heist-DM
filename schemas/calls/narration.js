// Narration call output. Contract: docs/spec/calls/narration.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const narrationSchema = withDefs({
  $id: "narration",
  ...obj(["text", "texture"], {
    text: r("text"),
    texture: list(r("text")),
  }),
});
