// Act call output: what an act holds, decided when it begins from what the party has done (D164). Contract:
// docs/spec/calls/act.md. Generator-only: no play call sees it, only the rooms built from it.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";
import { BUSY } from "../../src/campaign/seed.js";

export const actSchema = withDefs({
  $id: "act",
  ...obj(["goal", "region", "holders", "busy", "peak", "hints"], {
    // The act's job, in this world's terms.
    goal: r("text"),
    // What the region is like now, given what the party has done.
    region: r("text"),
    // The ids of the factions that hold the region now; code draws each room's owner from them.
    holders: list(r("id"), 1),
    // What the region is busy with, one line per kind that happens here; code draws a kind per room, never repeating.
    busy: list(obj(["kind", "line"], { kind: { enum: BUSY }, line: r("text") }), 4),
    // Who or what stands at the act's climax.
    peak: obj(["who", "why", "wants", "turns", "where"], {
      who: r("text"),
      // Whose design blocks the party, and why it's them.
      why: r("text"),
      wants: r("text"),
      // How it acts as the climax goes on: the turns of a boss fight.
      turns: r("text"),
      where: r("text"),
    }),
    // Visible signs of the peak that rooms may show, one at a time, before the climax.
    hints: list(r("text"), 2),
  }),
});
