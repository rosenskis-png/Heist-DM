// Sketch call output: the room as a DM's prep note, premise first (D117, D160). Contract: docs/spec/calls/sketch.md.
// The sketch is generator-only: no play call sees it (D59). The order is the order it's written in: everything after the
// premise comes out of it.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const sketchSchema = withDefs({
  $id: "sketch",
  ...obj(["premise", "shape", "things", "cut", "pressure", "outcomes", "notes", "opening"], {
    // The room in one sentence a player would repeat.
    premise: r("text"),
    // One picturable shape, and where the party, the danger and the ways on sit on it, in relational words.
    shape: r("text"),
    // A line each: what it is, what state it's in, where it is next to the others. Never what it's for.
    things: list(r("text"), 1),
    // The weakest thing, left out of everything else; "nothing" when true.
    cut: r("text"),
    // What's already moving, and what a player sees as it worsens; "none" for a calm room.
    pressure: r("text"),
    // Three to five end states, never how the party got there.
    outcomes: list(r("text"), 1),
    // What else the DM needs: wants, what the place won't allow, anything worth having, the ways on.
    notes: r("text"),
    // What the party takes in on arrival, in two or three short paragraphs.
    opening: r("text"),
  }),
});
