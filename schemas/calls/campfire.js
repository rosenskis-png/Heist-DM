// Campfire call output: one companion's part in a scene. Contract: docs/spec/calls/campfire.md; caps: docs/spec/companions.md §4.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

// Every field is about the companion whose call this is (D45); she never writes for the other one.
export const campfireSchema = withDefs({
  $id: "campfire",
  ...obj(["segments", "changes", "memories", "secrets", "commitments", "beats", "advances", "outfit", "believes", "storm", "risk", "form", "inner", "agenda"], {
    // Narration of what happens (her actions, the setting, time passing) and her dialogue, in order. A companion
    // with a second voice speaking in this scene may give it lines (docs/spec/companions.md §6); the engine rejects
    // them anywhere else. `aside` (D95, D108): "no" for the scene everyone shares; "action", something physical done
    // out of the other companion's sight, which she may catch; "ring", words to the player alone over the telepathy
    // rings, silent and never caught; "to_other", words to the other companion alone over the rings, which the player
    // doesn't hear.
    segments: list(obj(["speaker", "text", "aside"], { speaker: { enum: ["narrator", "self", "second_voice"] }, text: r("text"), aside: { enum: ["no", "action", "ring", "to_other"] } }), 1),
    changes: list(
      obj(["track", "by", "reason"], {
        // `affection`, `respect` and `trust` are how she feels about the other companion; `read_*` how she thinks
        // the other feels about her on each. Each moves at most 2 an answer (D92, D91).
        track: { enum: ["heat", "intimacy", "regard", "lean", "affection", "respect", "trust", "read_affection", "read_respect", "read_trust"] },
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
    // What this answer moves, between the player and a companion or between the two companions: a question, a
    // move, a dare, something pushed or brought into the open. Null if nothing. With both present, one must (D85).
    advances: { oneOf: [r("text"), { type: "null" }] },
    // The id of an outfit she owns that she changes into on the page, or null (docs/spec/companions.md §7).
    outfit: { oneOf: [r("id"), { type: "null" }] },
    // What she now believes about him and the other companion, if this scene changed it, or null (D96). It can be wrong.
    believes: { oneOf: [obj(["past", "current"], { past: { type: "boolean" }, current: { type: "boolean" } }), { type: "null" }] },
    // Her storm level after this answer, if she has one, or null (D97). It can fall only one level an answer.
    storm: { oneOf: [{ type: "integer", minimum: 0, maximum: 5 }, { type: "null" }] },
    // How likely her asides are to be caught, if she made any, or null (D95).
    risk: { oneOf: [{ enum: ["low", "medium", "high"] }, { type: "null" }] },
    // How she looks now, in full, if she changed her shape this answer, or null (D101).
    form: { oneOf: [r("text"), { type: "null" }] },
    // What she actually thinks right now, which may not be what she said or did (D107). Never shown to the other
    // companion, and hidden from the player in play.
    inner: r("text"),
    // Her private agenda after this answer, in a line, if it changed, or null to keep it (D107).
    agenda: { oneOf: [r("text"), { type: "null" }] },
  }),
});
