// Photo prompts (docs/spec/calls/photo.md, D170): a companion's picture identity, and the text-to-image prompt
// assembled from it and the slots the photo call fills. Pure, like the wardrobe.
import { photo as P } from "../../content/photo.js";
import { wearing, equipped } from "./wardrobe.js";

// The slots the photo call fills, in the order the prompt uses them.
export const SLOTS = ["setting", "light", "position", "action", "face_extra", "garments", "grit", "surroundings", "light_source", "expression"];

// Her picture identity: what stays the same in every photo of her. `c` is her as resolved for the party (a tie's
// `photo` already merged, src/campaign/roster.js); `rom`, the party's relationship state, says what she has on.
// Her `garments` line is her file's while she wears her usual outfit; otherwise it's made from what she has on, in
// her register (D194). Her picture's `gear` follows either, whatever she wears.
export function photoOf(c, rom) {
  const p = c.photo ?? {};
  const usual = equipped(rom, c) === "usual";
  const garments = usual && p.garments ? p.garments : garmentsLine(wearing(rom, c), !!p.bold);
  return {
    age: p.age ?? c.age,
    role: p.role ?? c.race,
    face: p.face ?? P.face,
    identity: p.identity ?? "",
    garments: p.gear ? `${garments.replace(/[.\s]+$/, "")}, with ${p.gear}` : garments,
    bold: !!p.bold,
    expression: p.expression ?? "",
    beside: c.secondVoice?.photo ?? null,
  };
}

// An outfit's text as a garments line: one sentence about her, its pieces a list, "sexy" on the first garment only
// for a bold picture. Outfit text describes clothes and never a body, so the same text fits every companion.
export function garmentsLine(text, bold) {
  const pieces = String(text).trim().replace(/[.\s]+$/, "").split(/\s*;\s*/).filter(Boolean);
  let list = pieces.length > 1 ? `${pieces.slice(0, -1).join(", ")}, and ${pieces.at(-1)}` : pieces[0] ?? "";
  // Lower-case the opening word, unless it's a possessive ("Mara's colours").
  if (/^[A-Z][a-z]*\b/.test(list) && !/^[A-Z][a-z]*['’]s\b/.test(list)) list = list[0].toLowerCase() + list.slice(1);
  if (!bold) return `She wears ${list}`;
  const m = list.match(/^(a|an)\s+(.*)$/i);
  return m ? `She wears a sexy ${m[2]}` : `She wears sexy ${list}`;
}

// A slot's text with no trailing full stop, or its default when empty.
const tidy = (v, d) => String(v == null || v === "" ? d ?? "" : v).trim().replace(/[.\s]+$/, "");

// The prompt, from her identity (`photoOf`) and the slots. An empty slot takes its default; `beside` adds her second
// voice beside her, when she has a line for it.
export function photoPrompt(id, slots = {}, { beside = false } = {}) {
  const s = slots;
  const D = P.defaults;
  let extra = String(s.face_extra ?? "").trim();
  if (extra && !/^[,;]/.test(extra)) extra = `, ${extra}`;
  extra = extra.replace(/[.\s]+$/, "");
  const action = tidy(s.action, D.action);
  return [
    P.opener,
    `Scene of ${tidy(s.setting, D.setting)}, ${tidy(s.light, D.light)}.`,
    `${tidy(s.position, D.position)} is a ${id.age}yo ${id.role}${action.startsWith(",") ? "" : " "}${action}.`,
    `${id.face}${extra}.`,
    id.identity,
    beside && id.beside ? id.beside : "",
    `${tidy(s.garments, id.garments)}.`,
    s.grit === false ? P.clean : P.grit,
    `Surrounded by ${tidy(s.surroundings, D.surroundings)}.`,
    `only source of light is ${tidy(s.light_source, D.light_source)}.`,
    `Expression is ${tidy(s.expression, id.expression)}`,
  ]
    .filter(Boolean)
    .join(" ");
}
