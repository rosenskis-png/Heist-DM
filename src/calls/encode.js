// The encode call (docs/spec/calls/encode.md): the sketch as packet data, laid out by code and checked by the engine
// before it's accepted (D117, D153). A failure goes back once with the problems.
import { ask } from "../ask.js";
import { encodeSchema } from "../../schemas/calls/encode.js";
import { encodeInput, ROOM_KINDS } from "../context.js";
import { layout } from "../engine/layout.js";
import { checkPacket } from "../engine/load.js";

const SLOTS = [{ id: "player" }, { id: "companion_a" }, { id: "companion_b" }];

// What's wrong with an encoded room beyond its schema: the engine's own checks once it's laid out, and what the seed
// fixed (its mode, one exit per kind drawn, a merchant's prices).
export function encodeProblems(out, seed) {
  const { packet } = layout(out);
  const problems = checkPacket(packet, SLOTS);
  const mode = ROOM_KINDS.includes(seed.kind) ? "room" : "encounter";
  if (packet.mode !== mode) problems.push(`a ${seed.kind} has mode "${mode}"`);
  if (mode === "encounter" && !packet.intent.objective) problems.push("an encounter needs an objective");
  if (mode === "room" && packet.intent.objective) problems.push("a room has no objective");
  const want = [...seed.exits].sort().join(", ");
  const got = (packet.intent.exits ?? []).map((e) => e.leads_to).sort().join(", ");
  if (want !== got) problems.push(`the exits must lead to exactly: ${want || "nothing"} (they lead to: ${got || "nothing"})`);
  if (seed.kind === "merchant" && !packet.map.things.some((t) => t.price)) problems.push("a merchant has something with a price");
  if (packet.act !== seed.act) problems.push(`the act is ${seed.act}`);
  return problems;
}

export const encodeCall = (io, env, c) =>
  ask(io, { call: "encode", schema: encodeSchema, input: encodeInput(env, c, encodeSchema), check: (out) => encodeProblems(out, c.seed) });
