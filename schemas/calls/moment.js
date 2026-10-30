// Moment call output, for an exchange or a combat round. Contract: docs/spec/calls/moment.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

const outcome = obj(["text", "ops"], { text: r("text"), ops: r("operations") });

const check = obj(["actor", "skill", "difficulty", "reason", "on_success", "on_failure"], {
  actor: r("id"),
  skill: { enum: ["Might", "Agility", "Stealth", "Lore", "Insight", "Presence"] },
  difficulty: r("difficulty"),
  reason: r("text"),
  on_success: outcome,
  on_failure: outcome,
});

export const momentSchema = withDefs({
  $id: "moment",
  ...obj(["reply"], {
    reply: r("text"),
    learned: list(r("text")),
    // Hidden things, routines or events the party now knows from this exchange, outside any check (D44).
    reveals: list(r("id")),
    dispositions: list(obj(["npc", "value"], { npc: r("id"), value: r("id") })),
    promises: list(obj(["by", "to", "text"], { by: r("id"), to: r("id"), text: r("text") })),
    texture: list(r("text")),
    check,
    // An action that moves the party or changes the world goes to the draft card instead.
    redirect: obj(["step"], { step: r("text") }),
    // A combat round (D67): each enemy's intent from its sheet, and a band for every action the player declared.
    combat: obj(["intents", "actions"], {
      intents: list(
        obj(["enemy", "intent"], {
          enemy: r("id"),
          intent: r("text"),
          target: r("id"),
          // The enemy gives up the fight this round: flees, surrenders or stands down, as its sheet says.
          yields: { type: "boolean" },
        }),
      ),
      actions: list(
        obj(["actor", "kind", "difficulty", "reason", "on_success", "on_failure"], {
          actor: r("id"),
          // strike: the engine deals the damage. ability: on success the target is out of the fight.
          kind: { enum: ["strike", "ability", "other"] },
          target: r("id"),
          ability: r("id"),
          // A real weapon in hand: a strike deals 2 instead of 1.
          weapon: { type: "boolean" },
          difficulty: { enum: ["automatic", "easy", "medium", "hard", "very_hard", "near_impossible"] },
          reason: r("text"),
          on_success: outcome,
          on_failure: outcome,
        }),
      ),
    }),
  }),
});
