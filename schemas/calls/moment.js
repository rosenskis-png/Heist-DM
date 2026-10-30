// Moment call output, for an exchange or a combat round. Contract: docs/spec/calls/moment.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

const check = obj(["actor", "skill", "difficulty", "odds", "reason", "on_success", "on_failure"], {
  actor: r("id"),
  skill: { enum: ["Might", "Agility", "Stealth", "Lore", "Insight", "Presence"] },
  difficulty: r("difficulty"),
  odds: r("odds"),
  reason: r("text"),
  on_success: obj(["text", "ops"], { text: r("text"), ops: r("operations") }),
  on_failure: obj(["text", "ops"], { text: r("text"), ops: r("operations") }),
});

export const momentSchema = withDefs({
  $id: "moment",
  ...obj(["reply"], {
    reply: r("text"),
    learned: list(r("text")),
    dispositions: list(obj(["npc", "value"], { npc: r("id"), value: r("id") })),
    promises: list(obj(["by", "to", "text"], { by: r("id"), to: r("id"), text: r("text") })),
    texture: list(r("text")),
    check,
    // An action that moves the party or changes the world goes to the draft card instead.
    redirect: obj(["step"], { step: r("text") }),
    combat: obj(["intents", "unusual"], {
      intents: list(obj(["enemy", "intent"], { enemy: r("id"), intent: r("text"), target: r("id") })),
      unusual: list(
        obj(["actor", "action", "difficulty", "odds", "reason", "on_success", "on_failure"], {
          actor: r("id"),
          action: r("text"),
          difficulty: r("difficulty"),
          odds: r("odds"),
          reason: r("text"),
          on_success: r("operations"),
          on_failure: r("operations"),
        }),
      ),
    }),
  }),
});
