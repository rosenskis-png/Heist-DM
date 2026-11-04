// Question call output: the DM answers a question, and what the answer settles becomes fact (D133). Contract:
// docs/spec/calls/question.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { fact } from "../ledger.js";

export const questionSchema = withDefs({
  $id: "question",
  ...obj(["reply", "rulings"], {
    reply: r("text"),
    // What the answer settles that the encounter and the ledger don't already say, each one fact the party knows.
    // They join the ledger, so every later call, the card included, treats them as true.
    rulings: list(fact),
    // Facts that no longer matter, to make room when the ledger is full.
    retire: list(r("id")),
    // What the party now knows that the log should keep.
    learned: list(r("text")),
  }),
});
