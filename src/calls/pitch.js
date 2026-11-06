// The pitch call (docs/spec/calls/pitch.md): a world from the player's vibe, and the pitch they read (D151).
import { ask } from "../ask.js";
import { pitchSchema } from "../../schemas/calls/pitch.js";
import { pitchInput } from "../context.js";
import { worldProblems } from "../campaign/world.js";

// `c.companions` are the two chosen companions as authored (their `needs` are what the world must hold).
export const pitchCall = (io, env, c) =>
  ask(io, { call: "pitch", schema: pitchSchema, input: pitchInput(env, c, pitchSchema), check: (out) => worldProblems(out.world, c.companions) });
