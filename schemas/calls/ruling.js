// Ruling call output. `text` says how, when the answer is yes (D57). Contract: docs/spec/calls/ruling.md (D55).
import { withDefs } from "../defs.js";
import { r, obj } from "../shape.js";

export const rulingSchema = withDefs({
  $id: "ruling",
  ...obj(["answer", "text"], { answer: { enum: ["yes", "no"] }, text: r("text") }),
});
