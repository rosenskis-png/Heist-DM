// Campfire call output: one companion's part in a scene. Contract: docs/spec/calls/campfire.md; caps: docs/spec/companions.md §4.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

// Every field is about the companion whose call this is (D45); she never writes for the other one.
export const campfireSchema = withDefs({
  $id: "campfire",
  ...obj(["segments", "changes", "memories", "secrets", "commitments", "beats"], {
    // Narration of what happens (her actions, the setting, time passing) and her dialogue, in order.
    segments: list(obj(["speaker", "text"], { speaker: { enum: ["narrator", "self"] }, text: r("text") }), 1),
    changes: list(
      obj(["track", "by", "reason"], {
        track: { enum: ["heat", "intimacy", "regard", "lean"] },
        by: { type: "integer", minimum: -3, maximum: 3 },
        reason: r("text"),
      }),
    ),
    memories: list(r("text")),
    secrets: list({ enum: ["hidden", "deep", "dark"] }),
    commitments: list(r("text")),
    // Only beats the engine listed as ready or always allowed; the engine rejects any other.
    beats: list(r("id")),
    // Where she stands with the player now, as encounters will see it (D79): a mood from a short list, never
    // further than grumpy or jealous, and why. And anything she has learned that changes how she acts.
    standing: obj(["mood", "why"], { mood: { enum: ["warm", "glad", "steady", "wary", "grumpy", "jealous"] }, why: { type: "string", minLength: 1, maxLength: 120 } }),
    learned: { ...list({ type: "string", minLength: 1, maxLength: 120 }), maxItems: 2 },
  }),
});
