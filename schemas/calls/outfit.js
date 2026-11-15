// Outfit call output: one outfit found on the journey, a memento any companion can wear (D194, D195). Contract:
// docs/spec/calls/outfit.md. Generator-only.
import { withDefs } from "../defs.js";
import { r, obj } from "../shape.js";

export const outfitSchema = withDefs({
  $id: "outfit",
  ...obj(["name", "text", "from"], {
    // Two to four words a player remembers it by.
    name: r("text"),
    // The clothes only, never a body: pieces separated by semicolons, the main garment first.
    text: r("text"),
    // Where it was found, in a few words.
    from: r("text"),
  }),
});
