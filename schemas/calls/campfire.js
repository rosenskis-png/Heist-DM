// Campfire call output. Contract: docs/spec/calls/campfire.md; caps: docs/spec/companions.md §4.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const campfireSchema = withDefs({
  $id: "campfire",
  ...obj(["messages", "changes", "memories", "secrets", "commitments", "beats"], {
    messages: list(obj(["speaker", "text"], { speaker: r("id"), text: r("text") }), 1),
    changes: list(
      obj(["companion", "track", "by", "reason"], {
        companion: r("id"),
        track: { enum: ["heat", "intimacy", "regard", "lean"] },
        by: { type: "integer", minimum: -3, maximum: 3 },
        reason: r("text"),
      }),
    ),
    memories: list(obj(["companion", "text"], { companion: r("id"), text: r("text") })),
    secrets: list(obj(["companion", "field"], { companion: r("id"), field: { enum: ["hidden", "deep", "dark"] } })),
    commitments: list(obj(["companion", "text"], { companion: r("id"), text: r("text") })),
    // Only beats the engine listed as ready or always allowed; the engine rejects any other.
    beats: list(obj(["companion", "beat"], { companion: r("id"), beat: r("id") })),
  }),
});
