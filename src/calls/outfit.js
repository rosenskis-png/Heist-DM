// The outfit call (docs/spec/calls/outfit.md, D195): designs one outfit found on the journey, from the room it's found
// in (and, at a climax, the act's mood). Code gives it its id and places it.
import { ask } from "../ask.js";
import { outfitSchema } from "../../schemas/calls/outfit.js";
import { outfitInput } from "../context.js";

// Words about a wearer, not a garment: an outfit must read right on anyone (D194).
const WEARER = /\b(she|her|hers|herself|curves?|curvy|figure|sexy)\b/i;
// Worn out (the designer's call).
const SHOULDER = /\b(slip|slips|slipping|slid|slide|slides|sliding|fall|falls|falling|fell)\b[^;]{0,30}\boff\b[^;]{0,20}\bshoulders?\b/i;

export function outfitProblems(out, found = []) {
  const problems = [];
  const text = String(out.text ?? "").trim();
  const pieces = text.split(";").map((p) => p.trim()).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!/^an?\s/i.test(text)) problems.push('text starts with its main garment, after "a" or "an"');
  if (pieces.length < 2 || pieces.length > 5) problems.push("text has two to five pieces, separated by semicolons");
  if (words < 20 || words > 70) problems.push(`text is 20 to 70 words (it's ${words})`);
  const who = text.match(WEARER) ?? String(out.name ?? "").match(WEARER);
  if (who) problems.push(`"${who[0]}" describes the wearer or her register; describe only the clothes`);
  if (SHOULDER.test(text)) problems.push("nothing slips, slides or falls off a shoulder");
  const n = String(out.name ?? "").trim().split(/\s+/).length;
  if (n < 2 || n > 5) problems.push("name is two to four words");
  if (found.some((f) => f.name.toLowerCase() === String(out.name ?? "").trim().toLowerCase())) problems.push(`there's already an outfit called ${out.name}`);
  return problems;
}

// Its id, from its name, never one already found.
export function outfitId(name, found = []) {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "o_$1") || "outfit";
  const ids = new Set(found.map((f) => f.id));
  let id = base;
  for (let i = 2; ids.has(id); i++) id = `${base}_${i}`;
  return id;
}

// `c`: `room` (what the room is), `act` (its mood, for a climax), `found` (outfits found so far: id, name, text).
// Returns the outfit with its id.
export async function outfitCall(io, env, c) {
  const out = await ask(io, { call: "outfit", schema: outfitSchema, input: outfitInput(env, c, outfitSchema), check: (o) => outfitProblems(o, c.found ?? []) });
  return { id: outfitId(out.name, c.found ?? []), name: out.name.trim(), text: out.text.trim().replace(/\.$/, ""), from: out.from.trim() };
}
