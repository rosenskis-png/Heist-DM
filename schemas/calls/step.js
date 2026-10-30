// Step call output. Contract: docs/spec/calls/step.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

// What a step does. Shared by a step and by the alternative it takes when its `if` is false.
const action = {
  summary: r("text"),
  actors: list(r("id"), 1),
  // Where the step ends up happening; moves inside `effects` carry their own paths.
  zone: r("id"),
  noise: r("noise"),
  uses: list(obj(["kind", "id"], { kind: { enum: ["ability", "thing", "fact", "canon"] }, id: r("id"), actor: r("id") })),
  requires: r("condition"),
  effects: r("operations"),
  tags: list(r("tag")),
};
const actionFields = ["summary", "actors", "zone", "noise", "effects", "tags"];

export const stepSchema = withDefs({
  $id: "step",
  ...obj(["steps", "rulings", "internal_checks"], {
    steps: list(
      obj(["n", ...actionFields], {
        n: { type: "integer", minimum: 1 },
        ...action,
        // Timing and conditions come only from the player's words (D35). Without `when`, a step happens
        // right after the previous one.
        when: obj(["until"], {
          until: r("condition"),
          // The longest the actors wait before the plan stops. The engine's default applies if absent.
          max_wait: { type: "integer", minimum: 1 },
        }),
        if: r("condition"),
        // What happens when `if` is false at the step's tick: nothing, the plan stops, or another action.
        otherwise: { oneOf: [{ enum: ["skip", "stop"] }, obj(actionFields, action)] },
      }),
      1,
    ),
    // Questions the plan raised about what the map holds. The map is complete (D29): a feature it lacks is ruled out.
    rulings: list(
      obj(["question", "answer", "text"], {
        question: r("text"),
        answer: { enum: ["ruled_out", "exists", "ruling"] },
        fact: r("id"),
        text: r("text"),
      }),
    ),
    // Hidden facts that defeat a step: the step proceeds, and the engine reveals the fact and stops when it is reached.
    internal_checks: list(obj(["step", "fact"], { step: { type: "integer", minimum: 1 }, fact: r("id") })),
  }),
});
