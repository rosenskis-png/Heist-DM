// The campfire call (docs/spec/calls/campfire.md): one companion's part in a scene at camp (D45). Her empty parts are
// filled before the checks (D110); the engine's own checks send it back once (D13).
import { ask } from "../ask.js";
import { campfireSchema } from "../../schemas/calls/campfire.js";
import { campfireInput } from "../context.js";
import { fillCampfire, campfireProblems } from "../campaign/relationship.js";

// `members` are the two companions as resolved for this party; `where` is the scene as the engine reads it
// (private, in person, whether she has to move something, whose face she wears).
export const campfireCall = (io, env, c, self, others, members, where) =>
  ask(io, {
    call: "campfire",
    schema: campfireSchema,
    input: campfireInput(env, c, self, others, campfireSchema),
    fix: fillCampfire,
    check: (out) => campfireProblems(env.romance, members.find((m) => m.id === self.id), members, out, where),
  });
