// One AI call through the runtime's `sample.json` (D2, D13): the output is checked against its schema and the
// engine's own checks, and a failure gets one retry with the errors listed. The runtime policy per call is
// docs/spec/context.md §4.
import { validate } from "./validate.js";

export const TIERS = ["quick", "default", "complex"];

// The middle position of the speed and quality setting (D58). The other two move every call one tier (D70).
export const MIDDLE = { step: "default", pricing: "default", world: "default", narration: "default", moment: "default", companion: "quick", ruling: "quick", campfire: "complex", generator: "complex", adjudicate: "default", resolve: "default", scene: "default" };
export const SPEEDS = { faster: -1, balanced: 0, smarter: 1 };
export const tierFor = (call, speed = "balanced") => TIERS[Math.max(0, Math.min(TIERS.length - 1, TIERS.indexOf(MIDDLE[call]) + (SPEEDS[speed] ?? 0)))];

// How big each call's input may grow before it's flagged (D76). Crossing one isn't an error: the call still
// runs, the page shows a warning, and the save keeps a record of it, so growth can't happen unnoticed.
// `test/budget.test.js` holds every ruled call under its budget at the ledger's limits.
export const BUDGET = { adjudicate: 25600, resolve: 25600, scene: 25600, companion: 20480, narration: 49152, step: 49152, pricing: 49152, world: 49152, moment: 49152, ruling: 8192 };

// Replay is on where identical state should get an identical ruling, off for conversation and prose (D14).
const REPLAY = new Set(["step", "pricing", "world", "ruling", "adjudicate"]);
const LIMIT = 256 * 1024;

export class CallFailed extends Error {
  constructor(call, errors, record) {
    super(`The ${call} call failed: ${errors.slice(0, 3).join("; ")}`);
    this.call = call;
    this.errors = errors;
    this.record = record;
  }
}

const pause = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener?.("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

// `io` is the runtime: `sample`, the `speed` setting, an abort `signal`, `onStart` (which call is running, for
// the page's status line), `onOver` (a call's input crossed its budget) and `onCall`, which gets every call's
// input and raw output for the developer view (held in memory only, D10).
export async function ask(io, { call, input, schema, check = () => [] }) {
  const tier = tierFor(call, io.speed);
  const record = { call, tier, at: Date.now(), input, size: new TextEncoder().encode(input).length };
  if (BUDGET[call] && record.size > BUDGET[call]) {
    record.over = BUDGET[call];
    io.onOver?.({ call, size: record.size, budget: BUDGET[call] });
  }
  if (record.size > LIMIT) throw new CallFailed(call, [`its input is ${record.size} bytes, over the 256 KiB limit`], record);
  const opts = { modelTier: tier, cache: REPLAY.has(call), signal: io.signal };
  // One backoff on rate_limited, never a loop.
  const send = (x) =>
    io.sample.json(x, opts).catch(async (e) => {
      if (e?.code !== "rate_limited") throw e;
      await pause(io.backoff ?? 15000, io.signal);
      return io.sample.json(x, opts);
    });
  const errorsOf = (out) => {
    const e = validate(schema, out);
    return e.length ? e : check(out);
  };
  const t0 = Date.now();
  io.onStart?.(call);
  try {
    let out = await send(input);
    let errors = errorsOf(out);
    record.first = out;
    if (errors.length) {
      record.firstErrors = errors;
      out = await send([
        { role: "user", content: input },
        { role: "assistant", content: JSON.stringify(out) },
        { role: "user", content: `That has problems:\n${errors.slice(0, 20).join("\n")}\nReturn the corrected JSON object only.` },
      ]);
      errors = errorsOf(out);
    }
    Object.assign(record, { out, errors, ms: Date.now() - t0 });
    if (errors.length) throw new CallFailed(call, errors, record);
    return out;
  } catch (e) {
    if (!(e instanceof CallFailed)) Object.assign(record, { error: e?.code ? `${e.code}: ${e.message}` : String(e?.message ?? e), ms: Date.now() - t0 });
    throw e;
  } finally {
    io.onCall?.(record);
  }
}
