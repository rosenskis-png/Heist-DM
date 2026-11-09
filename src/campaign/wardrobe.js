// What each companion owns to wear, and what she has on (docs/spec/companions.md §7, D86, D171). Pure, like the
// relationship model: each function takes the party's companion state and returns a new one.
//
// The state keeps only what play changes: which outfit she has on, and the outfits she has gained in play (a gift,
// a find, a reward). The outfits her file gives her are read from her file every time, so a change to her file, or
// to her live looks (src/campaign/looks.js), reaches every save at once.

const USUAL = "usual";

// Everything she owns: her `outfit` (as "usual"), her file's `wardrobe`, then what she's gained in play.
// A file outfit set to null has been taken away by her live looks.
export function owned(rom, c) {
  const w = rom?.wardrobe?.[c.id];
  // A save from before D171 kept a copy of every outfit; what it gained is anything but "usual".
  const gained = w?.gained ?? Object.fromEntries(Object.entries(w?.owned ?? {}).filter(([id]) => id !== USUAL));
  const all = { [USUAL]: { name: "Usual outfit", text: c.outfit }, ...(c.wardrobe ?? {}), ...gained };
  return Object.fromEntries(Object.entries(all).filter(([, o]) => o));
}

// She starts in her file's `wears` when she owns it, otherwise her usual outfit.
export function newWardrobe(members) {
  return Object.fromEntries(members.map((c) => [c.id, { equipped: c.wears && owned(null, c)[c.wears] ? c.wears : USUAL, gained: {} }]));
}

const copy = (x) => structuredClone(x);

// She comes to own an outfit: a gift, a find, a purchase, a reward. An existing id is replaced.
export function addOutfit(rom, who, id, outfit) {
  const out = copy(rom);
  const w = out.wardrobe[who];
  w.gained = { ...(w.gained ?? Object.fromEntries(Object.entries(w.owned ?? {}).filter(([k]) => k !== USUAL))), [id]: outfit };
  delete w.owned;
  return out;
}

// She puts on an outfit she owns. Anything else is an error for the caller to have caught.
export function equip(rom, c, id) {
  if (!owned(rom, c)[id]) throw new Error(`${c.id} doesn't own outfit ${id}`);
  const out = copy(rom);
  out.wardrobe[c.id].equipped = id;
  return out;
}

// The id of what she has on: her usual outfit if what she had on is gone.
export const equipped = (rom, c) => {
  const id = rom?.wardrobe?.[c.id]?.equipped ?? USUAL;
  return owned(rom, c)[id] ? id : USUAL;
};

// What she's wearing now, as text for her profile.
export const wearing = (rom, c) => owned(rom, c)[equipped(rom, c)].text;

// Her outfits as her call reads them: what she has on, and what else she owns, each with its id (what `outfit`
// names) and, for the ones she isn't wearing, what it looks like.
export function wardrobeFor(rom, c) {
  if (!rom?.wardrobe?.[c.id]) return null;
  const all = owned(rom, c);
  const on = equipped(rom, c);
  const others = Object.entries(all).filter(([id]) => id !== on).map(([id, o]) => ({ id, name: o.name, looks: o.text }));
  return { wearing: { id: on, name: all[on].name }, ...(others.length ? { could_change_into: others } : {}) };
}
