// Ruling call output. Contract: docs/spec/calls/ruling.md (D55).
import { withDefs } from "../defs.js";
import { r, obj } from "../shape.js";

export const rulingSchema = withDefs({
  $id: "ruling",
  ...obj(["answer", "text"], { answer: { enum: ["yes", "no"] }, text: r("text") }),
});
