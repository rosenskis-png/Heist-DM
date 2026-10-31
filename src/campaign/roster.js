// Which companions can share a party, and each one as she is in this party (docs/spec/companions.md §6, D8).
// Nothing here names a companion: everything companion-specific is declared in her own file.

// A companion who exists in relation to another declares a `tie`. With `required`, she can only join a party
// whose other companion has an entry in her `tie.by`.
export function partyProblems(members) {
  const problems = [];
  const ids = members.map((c) => c.id);
  if (new Set(ids).size !== ids.length) problems.push("the same companion twice");
  for (const c of members) {
    const others = members.filter((o) => o !== c);
    if (c.tie?.required && !others.some((o) => c.tie.by?.[o.id])) problems.push(`${c.name} needs one of: ${Object.keys(c.tie.by ?? {}).join(", ") || "nobody"}`);
  }
  return problems;
}

// Every pairing the setup screen may offer, from a roster keyed by id.
export const pairings = (roster) =>
  Object.values(roster).flatMap((a, i, all) => all.slice(i + 1).filter((b) => !partyProblems([a, b]).length).map((b) => [a.id, b.id]));

const fill = (text, partner) => (typeof text === "string" ? text.replaceAll("{partner}", partner.name) : text);

// The party's companions as they are together. A tie's `set` replaces her profile fields and its `append`
// extends them, first the tie's own, then its entry for the other companion; `{partner}` in any text becomes the
// other companion's name. The result keeps `tie` resolved (`withId` plus the remaining fields) for context
// assembly. A tie whose other companion isn't in the party is dropped.
export function resolveParty(members) {
  return members.map((c) => {
    const partner = members.find((o) => o !== c && c.tie?.by?.[o.id]);
    if (!partner) return c.tie ? (({ tie, ...rest }) => rest)(c) : c;
    const { by, required, set: tieSet = {}, append: tieAppend = {}, ...tie } = c.tie;
    const { set = {}, append = {}, image, ...entry } = by[partner.id];
    const out = { ...c };
    for (const [k, v] of Object.entries({ ...tieSet, ...set })) out[k] = fill(v, partner);
    for (const a of [tieAppend, append]) for (const [k, v] of Object.entries(a)) out[k] = [out[k], fill(v, partner)].filter(Boolean).join(" ");
    out.tie = { withId: partner.id, ...Object.fromEntries(Object.entries({ ...tie, ...entry }).map(([k, v]) => [k, fill(v, partner)])) };
    return out;
  });
}

// The pair's written dynamic, keyed "a|b" in either order, or null (the pair starts at 0; docs/spec/companions.md §6).
export const pairEntry = (pairs, a, b) => pairs[`${a}|${b}`] ?? pairs[`${b}|${a}`] ?? null;
