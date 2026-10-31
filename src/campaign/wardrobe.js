// What each companion owns to wear, and what she has on (docs/spec/companions.md §7, D71). Pure, like the
// relationship model: each function takes the party's companion state and returns a new one.

// Every companion starts owning her `outfit` (as "usual") plus anything in her file's `wardrobe`, wearing "usual".
export function newWardrobe(members) {
  return Object.fromEntries(
    members.map((c) => [c.id, { equipped: "usual", owned: { usual: { name: "Usual outfit", text: c.outfit }, ...(c.wardrobe ?? {}) } }]),
  );
}

const copy = (x) => structuredClone(x);

// She comes to own an outfit: a gift, a find, a purchase. An existing id is replaced.
export function addOutfit(rom, who, id, outfit) {
  const out = copy(rom);
  out.wardrobe[who].owned[id] = outfit;
  return out;
}

// She puts on an outfit she owns. Anything else is an error for the caller to have caught.
export function equip(rom, who, id) {
  if (!rom.wardrobe[who]?.owned[id]) throw new Error(`${who} doesn't own outfit ${id}`);
  const out = copy(rom);
  out.wardrobe[who].equipped = id;
  return out;
}

// What she's wearing now, as text for her profile; her file's outfit when there's no wardrobe yet.
export function wearing(rom, c) {
  const w = rom.wardrobe?.[c.id];
  return w ? w.owned[w.equipped].text : c.outfit;
}

// Her outfits as her call reads them: what she has on, and what else she owns, each with its id (what `outfit`
// names) and, for the ones she isn't wearing, what it looks like.
export function wardrobeFor(rom, c) {
  const w = rom.wardrobe?.[c.id];
  if (!w) return null;
  const others = Object.entries(w.owned).filter(([id]) => id !== w.equipped).map(([id, o]) => ({ id, name: o.name, looks: o.text }));
  return { wearing: { id: w.equipped, name: w.owned[w.equipped].name }, ...(others.length ? { could_change_into: others } : {}) };
}
