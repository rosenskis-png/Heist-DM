// Pitch call output: a world written from the player's vibe, and the pitch they read (D151). Contract:
// docs/spec/calls/pitch.md.
import { withDefs } from "../defs.js";
import { r, obj } from "../shape.js";
import { worldShape } from "../world.js";

export const pitchSchema = withDefs({
  $id: "pitch",
  ...obj(["pitch", "world"], {
    // What the player reads before choosing it: a few sentences, in the second person, that sell the adventure.
    pitch: r("text"),
    world: worldShape,
  }),
});
