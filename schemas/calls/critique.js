// Critique call output: the sketch played four ways, and what's wrong with it (D120, D153). Contract:
// docs/spec/calls/critique.md. The runs are routes: the revision reads them, and then they're thrown away.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const critiqueSchema = withDefs({
  $id: "critique",
  ...obj(["runs", "problems"], {
    runs: list(obj(["approach", "clean", "messy"], { approach: { enum: ["force", "guile", "odd", "plain"] }, clean: r("text"), messy: r("text") }), 4),
    problems: list(obj(["problem", "element", "fix"], { problem: r("text"), element: r("text"), fix: { enum: ["cut", "connect", "swap"] } })),
  }),
});
