// Stock call output: taking stock when a room ends, out of character with the player (D192). Contract:
// docs/spec/calls/stock.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const stockSchema = withDefs({
  $id: "stock",
  ...obj(["reply", "found", "followers", "notes"], {
    // What the DM says to the player across the table, out of character: short and plain.
    reply: r("text"),
    // Things the party has that the game didn't record, each one the DM has granted so far: the whole list, every time.
    found: { ...list(obj(["name", "properties", "holder", "why"], { name: r("text"), properties: r("text"), holder: r("id"), why: r("text") })), maxItems: 4 },
    // Everyone who could go on with the party: the whole list, every time. Name, pronouns and looks are what anyone would
    // know them by; `goal` is what they say they're after, as a place or a person a later room could be; `motive` is
    // why they really want it, which the player never sees; `knows` is what they know or saw that matters.
    followers: {
      ...list(obj(["name", "pronouns", "looks", "what", "goal", "motive"], { name: r("text"), pronouns: r("text"), looks: r("text"), what: r("text"), goal: r("text"), motive: r("text"), knows: { ...list(r("text")), maxItems: 3 } })),
      maxItems: 4,
    },
    // What else goes on with the party: a lack that matters (`item`) or a loose end (`thread`). The whole list, every time.
    notes: { ...list(obj(["kind", "what"], { kind: { enum: ["item", "thread"] }, what: r("text") })), maxItems: 4 },
  }),
});
