// Live looks (docs/spec/companions.md §8, D171): changes to how companions look, kept outside the repo (in the game's
// db) and laid over their files every time the game loads, so the designer can change a haircut, add an outfit or
// choose what she starts in without republishing. Pure: the caller fetches and stores the changes.
//
// Looks are { <companion id>: { <path>: value } }, each path a field of her file that is about how she looks, and
// value null to take a file outfit away. A companion whose changes don't fit her file's schema keeps her file
// unchanged, and the problems say why, so a bad edit can't break a game.
import { validate } from "../validate.js";
import { companionFileSchema } from "../../schemas/companion.js";

const ID = "[a-z][a-z0-9_]*";
const PHOTO = "(?:age|role|face|identity|garments|bold|expression)";
// The appearance fields of a companion file, and nothing else: her look and outfits, the outfit she starts in, her
// picture identity, her second voice's look, and what a tie changes of these.
export const LOOK_PATHS = new RegExp(
  `^(?:look|outfit|wears|wardrobe\\.${ID}(?:\\.(?:name|text))?|photo\\.${PHOTO}|secondVoice\\.(?:look|photo)|tie\\.append\\.look|tie\\.set\\.outfit|tie\\.by\\.${ID}\\.(?:append\\.look|set\\.outfit|photo\\.${PHOTO}))$`,
);

export const getPath = (o, path) => path.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
function setPath(o, path, v) {
  const ks = path.split(".");
  let x = o;
  for (const k of ks.slice(0, -1)) x = x[k] ??= {};
  if (v === undefined) delete x[ks.at(-1)];
  else x[ks.at(-1)] = v;
}

// Her file with these changes made. Paths outside LOOK_PATHS are ignored.
export function withChanges(c, changes = {}) {
  const ok = Object.entries(changes).filter(([p]) => LOOK_PATHS.test(p));
  if (!ok.length) return c;
  const out = structuredClone(c);
  for (const [p, v] of ok) setPath(out, p, v);
  return out;
}

// What's wrong with one companion's changes: paths that aren't about her looks, a `wears` she doesn't own, and
// anything that makes her file fail its schema.
export function changeProblems(c, changes = {}) {
  const problems = Object.keys(changes).filter((p) => !LOOK_PATHS.test(p)).map((p) => `${p} isn't an appearance field`);
  const next = withChanges(c, changes);
  if (next.wears && next.wears !== "usual" && !next.wardrobe?.[next.wears]) problems.push(`she doesn't own an outfit called ${next.wears}`);
  return [...problems, ...validate(companionFileSchema, next)];
}

// The roster with live looks laid over it. Changes for a companion who isn't in the roster are ignored; changes
// with problems are left out, and reported.
export function withLooks(roster, looks = {}) {
  const problems = {};
  const out = { ...roster };
  for (const [id, changes] of Object.entries(looks ?? {})) {
    if (!roster[id]) continue;
    const p = changeProblems(roster[id], changes);
    if (p.length) problems[id] = p;
    else out[id] = withChanges(roster[id], changes);
  }
  return { roster: out, problems };
}
