// The read call (docs/spec/calls/read.md, D177): one cheap reading of a new room from the player's chair, with only
// what the player will be told. A room the reader couldn't follow goes back to the sketch once (D196).
import { ask } from "../ask.js";
import { readSchema } from "../../schemas/calls/read.js";
import { readInput } from "../context.js";

// The reader's own judgment, never a count: they couldn't picture the room, or didn't know what they'd want in it.
export const lost = (read) => read.clear === false;

export const readCall = (io, env, c) => ask(io, { call: "read", schema: readSchema, input: readInput(env, c, readSchema) });
