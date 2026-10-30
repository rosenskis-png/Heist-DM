// Step call output. Contract: docs/spec/calls/step.md.
import { withDefs } from "../defs.js";
import { r, list, obj } from "../shape.js";

export const stepSchema = withDefs({
  $id: "step",
  ...obj(["steps", "rulings", "internal_checks"], {
    steps: list(
      obj(["n", "summary", "actors", "zone", "noise", "effects", "tags"], {
        n: { type: "integer", minimum: 1 },
        summary: r("text"),
        actors: list(r("id"), 1),
        // Where the step ends up happening; moves inside `effects` carry their own paths.
        zone: r("id"),
        noise: r("noise"),
        uses: list(obj(["kind", "id"], { kind: { enum: ["ability", "thing", "fact", "canon"] }, id: r("id"), actor: r("id") })),
        requires: r("condition"),
        effects: r("operations"),
        tags: list(r("tag")),
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
