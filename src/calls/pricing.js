// The pricing call (docs/spec/calls/pricing.md): bands, reasons and failure consequences for the steps, as the
// party expects the world to be (D36). The engine checks coverage and leaks before the card is shown.
import { ask } from "../ask.js";
import { pricingSchema } from "../../schemas/calls/pricing.js";
import { pricingInput } from "../context.js";
import { checkPricing } from "../engine/index.js";

export const pricingCall = (io, env, s, c) =>
  ask(io, { call: "pricing", schema: pricingSchema, input: pricingInput(env, c, pricingSchema), check: (out) => checkPricing(s, c.step_call.steps, c.facts, out) });
