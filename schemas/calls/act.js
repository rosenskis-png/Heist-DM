// Act call output: what an act holds, decided when it begins from what the party has done (D164, D167). Contract:
// docs/spec/calls/act.md. Generator-only. What reaches more than one room is abstract (the question, the aim); what's
// concrete is a pool code deals out one item to one room, each used once; the peak reaches only the climax.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

const pool = (min) => list(r("text"), min);

export const actSchema = withDefs({
  $id: "act",
  ...obj(["goal", "setting", "question", "aim", "state", "holders", "threads", "settings", "news", "mysteries", "returning", "peak", "hints"], {
    // The act's job, in this world's terms. The climax reads it.
    goal: r("text"),
    // The region in general, in a sentence or two: what this part of the place is and who's in it. Every room reads it.
    setting: r("text"),
    // What the act is about, as a question the act answers. Every room reads it.
    question: r("text"),
    // What the party should come away knowing or holding by the act's end. Every room reads it.
    aim: r("text"),
    // What has changed in the region because of earlier acts, for the climax and the next act call; never a room.
    state: r("text"),
    // The ids of the factions that hold the region now; code draws each room's owner from them.
    holders: list(r("id"), 1),
    // What should come up for each companion this act, if anything: her room reads it.
    threads: list(obj(["slot", "beat"], { slot: { enum: ["companion_a", "companion_b"] }, beat: r("text") })),
    // Pools, one item to one room, each used once in the act.
    settings: obj(["quiet", "oddity", "campfire"], { quiet: pool(2), oddity: pool(2), campfire: pool(2) }),
    news: pool(0),
    // The ids of the one or two mysteries whose clues this act's rooms hold.
    mysteries: list(r("id"), 1),
    // Names from the people the party has met who might plausibly turn up in this region.
    returning: pool(0),
    // Who or what stands at the act's climax. Only the climax reads it.
    peak: obj(["who", "why", "wants", "turns", "where"], { who: r("text"), why: r("text"), wants: r("text"), turns: r("text"), where: r("text") }),
    // Visible signs of the peak, one at a time, before the climax.
    hints: pool(2),
  }),
});
