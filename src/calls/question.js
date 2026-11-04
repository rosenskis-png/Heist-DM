// The question call (docs/spec/calls/question.md): the DM answers a question on the cheapest tier, from the
// read-only slice (D127), and what the answer settles becomes fact (D133).
import { ask } from "../ask.js";
import { questionSchema } from "../../schemas/calls/question.js";
import { questionInput } from "../context.js";
import { checkAnswer } from "../engine/index.js";

export const questionCall = (io, env, s, c) => ask(io, { call: "question", schema: questionSchema, input: questionInput(env, c, questionSchema), check: (out) => checkAnswer(s, out) });
