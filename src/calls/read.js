// The read call (docs/spec/calls/read.md, D177): one cheap reading of a new room from the player's chair, with only
// what the player will be told. A room with too little to take hold of goes back to the sketch once.
import { ask } from "../ask.js";
import { readSchema } from "../../schemas/calls/read.js";
import { readInput } from "../context.js";

// How many handles a room needs before it plays wide.
export const WIDE = 4;
export const thin = (read) => new Set(read.handles.map((h) => h.what.toLowerCase())).size < WIDE;

export const readCall = (io, env, c) => ask(io, { call: "read", schema: readSchema, input: readInput(env, c, readSchema) });
