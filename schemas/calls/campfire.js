// Campfire call output: one companion's part in a scene. Contract: docs/spec/calls/campfire.md; caps: docs/spec/companions.md §4.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

// Every field is about the companion whose call this is (D45); she never writes for the other one.
export const campfireSchema = withDefs({
  $id: "campfire",
  ...obj(["segments", "changes", "memories", "secrets", "commitments", "beats", "advances"], {
    // Narration of what happens (her actions, the setting, time passing) and her dialogue, in order. A companion
    // with a second voice speaking in this scene may give it lines (docs/spec/companions.md §6); the engine rejects
    // them anywhere else.
    segments: list(obj(["speaker", "text"], { speaker: { enum: ["narrator", "self", "second_voice"] }, text: r("text") }), 1),
    changes: list(
      obj(["track", "by", "reason"], {
        // `pair` is her side of how she and the other companion get on; it moves the pair value at most 1 a scene.
        track: { enum: ["heat", "intimacy", "regard", "lean", "pair"] },
        by: { type: "integer", minimum: -3, maximum: 3 },
        reason: r("text"),
      }),
    ),
    memories: list(r("text")),
    secrets: list({ enum: ["hidden", "deep", "dark"] }),
    commitments: list(r("text")),
    // Only beats the engine listed as ready or always allowed; the engine rejects any other.
    beats: list(r("id")),
    // What this answer moves between the player and one of the companions: a question she asks him, a move, a
    // dare, something she pushes. Null if nothing. With both companions present, one of the two must (D70).
    advances: { oneOf: [r("text"), { type: "null" }] },
    // An outfit she owns that she changes into during the scene (docs/spec/companions.md §7).
    outfit: r("id"),
  }),
});
