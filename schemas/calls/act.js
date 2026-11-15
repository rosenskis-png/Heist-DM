// Act call output: what an act holds, decided when it begins from what the party has done (D164, D167, D197).
// Contract: docs/spec/calls/act.md. Generator-only, but for `intro`, which the player reads. What reaches more than one
// room is abstract (the question, the aim); what's concrete is a pool code deals out one item to one room, each used
// once; the antagonists reach only the climax, which chooses among them.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

const pool = (min) => list(r("text"), min);

export const actSchema = withDefs({
  $id: "act",
  ...obj(["goal", "intro", "setting", "question", "aim", "state", "threads", "places", "settings", "news", "mysteries", "returning", "antagonists"], {
    // The act's job, in this world's terms. The climax reads it.
    goal: r("text"),
    // The DM's narration as the act opens: a paragraph or two that sets the scene, read before its first room.
    intro: r("text"),
    // The region in general, in a sentence or two: what this part of the place is and who's in it. Every room reads it.
    setting: r("text"),
    // What the act is about, as a question the act answers. Every room reads it.
    question: r("text"),
    // What the party should come away knowing or holding by the act's end. Every room reads it.
    aim: r("text"),
    // What has changed in the region because of earlier acts, for the climax and the next act call; never a room.
    state: r("text"),
    // What should come up for each companion this act, if anything: her room reads it.
    threads: list(obj(["slot", "beat"], { slot: { enum: ["companion_a", "companion_b"] }, beat: r("text") })),
    // Pools, one item to one room, each used once in the act. Plain places for the rooms with danger in them and
    // merchants (D196), and stranger ones for the calm rooms.
    places: pool(6),
    settings: obj(["quiet", "oddity", "campfire"], { quiet: pool(2), oddity: pool(2), campfire: pool(2) }),
    news: pool(0),
    // The ids of the one or two mysteries whose clues this act's rooms hold.
    mysteries: list(r("id"), 1),
    // Names from the people the party has met who might plausibly turn up in this region.
    returning: pool(0),
    // Who could stand at the act's climax: two or three, each with why. The climax chooses one when it's written.
    antagonists: list(obj(["who", "why"], { who: r("text"), why: r("text") }), 2),
  }),
});
