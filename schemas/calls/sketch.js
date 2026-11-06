// Sketch call output: the whole room designed in plain English, design statement first (D117, D153). Contract:
// docs/spec/calls/sketch.md. The sketch is generator-only: no play call sees it (D59).
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const sketchSchema = withDefs({
  $id: "sketch",
  ...obj(["design", "sketch"], {
    // The design statement (docs/design/encounter-craft.md §2). A calm room's challenge and pressure may be "none".
    design: obj(["start", "goal", "challenge", "outcomes", "x_factor", "pressure"], {
      start: r("text"),
      goal: r("text"),
      // "The players must accomplish X by doing Y, and Y is hard because of Z."
      challenge: r("text"),
      outcomes: list(r("text"), 1),
      x_factor: r("text"),
      // What pushes, in steps that change the room; never a hard deadline.
      pressure: r("text"),
    }),
    // The room in prose, in sections: blockout (never a route), people, places,
    // things, pressure, prizes and the ways on, and what the opening shows.
    sketch: r("text"),
  }),
});
