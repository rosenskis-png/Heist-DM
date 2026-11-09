// Photo prompts (docs/spec/calls/photo.md, D170): a companion's picture identity, and the text-to-image prompt
// assembled from it and the slots the photo call fills. Pure, like the wardrobe.
import { photo as P } from "../../content/photo.js";
import { wearing, equipped } from "./wardrobe.js";

// The slots the photo call fills, in the order the prompt uses them.
export const SLOTS = ["setting", "light", "position", "action", "face_extra", "garments", "grit", "surroundings", "light_source", "expression"];

// Her picture identity: what stays the same in every photo of her. `c` is her as resolved for the party (a tie's
// `photo` already merged, src/campaign/roster.js); `rom`, the party's relationship state, says what she has on.
// Her `garments` line is her file's while she wears her usual outfit, and what she has on otherwise.
export function photoOf(c, rom) {
  const p = c.photo ?? {};
  const usual = equipped(rom, c) === "usual";
  return {
    age: p.age ?? c.age,
    role: p.role ?? c.race,
    face: p.face ?? P.face,
    identity: p.identity ?? "",
    garments: usual && p.garments ? p.garments : wearing(rom, c),
    bold: !!p.bold,
    expression: p.expression ?? "",
    beside: c.secondVoice?.photo ?? null,
  };
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
