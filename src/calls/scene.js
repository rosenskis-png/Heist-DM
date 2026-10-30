// The scene call (docs/spec/calls/scene.md), in ruled mode (D75).
import { ask } from "../ask.js";
import { sceneSchema } from "../../schemas/calls/scene.js";
import { sceneInput } from "../context.js";
import { checkScene } from "../engine/index.js";

export const sceneCall = (io, env, s, c) => ask(io, { call: "scene", schema: sceneSchema, input: sceneInput(env, c, sceneSchema), check: (out) => checkScene(s, out) });
