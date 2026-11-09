// Photo call output: the slots of the fixed photo prompt, for one moment (D170). Code assembles the prompt
// (src/campaign/photo.js). Contract: docs/spec/calls/photo.md.
import { withDefs } from "../defs.js";
import { r, obj } from "../shape.js";

const t = r("text");

export const photoSchema = withDefs({
  $id: "photo",
  ...obj(["setting", "light", "position", "action", "face_extra", "garments", "grit", "surroundings", "light_source", "expression"], {
    setting: t,
    light: t,
    position: t,
    // One clause caught mid-moment, written to follow her role ("crouched inside a cell, ..." or ", mid-laugh ...").
    action: t,
    // Only marks the scene adds (dirt, blood, a flush, wet skin); empty for none.
    face_extra: { type: "string" },
    garments: t,
    // True for any dirt, fighting, prison grime or wear; code inserts the exact line.
    grit: { type: "boolean" },
    surroundings: t,
    light_source: t,
    expression: t,
  }),
});
