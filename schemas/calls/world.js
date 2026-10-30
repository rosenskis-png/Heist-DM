// World call output. Contract: docs/spec/calls/world.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const worldSchema = withDefs({
  $id: "world",
  ...obj(["actions"], {
    actions: list(
      obj(["npc", "because", "ops"], {
        npc: r("id"),
        // The line of the NPC's sheet and the event this follows from.
        because: r("text"),
        ops: r("operations"),
      }),
    ),
  }),
});
