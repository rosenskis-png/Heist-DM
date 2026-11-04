// The plan the player is drafting (D134): an ordered list of actions, each in the player's words. Adding one sends
// nothing; the list goes to the DM only when the player asks for the card, and it stays as written after the plan
// runs, to reuse or clear. Pure functions on `session.draft`; the page draws them.

export const emptyDraft = () => ({ items: [], stances: [], next: 1 });

// The plan as every call reads it: the actions in order, numbered, in the player's words.
export const planText = (draft) => (draft.items.length === 1 ? draft.items[0].text : draft.items.map((x, i) => `${i + 1}. ${x.text}`).join("\n"));

// A plan pasted or sent back as several numbered lines becomes several actions.
const split = (text) =>
  text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean);

export function addItem(draft, text) {
  for (const t of split(text)) draft.items.push({ id: draft.next++, text: t });
  return draft;
}

export function editItem(draft, id, text) {
  const t = text.trim();
  if (!t) return removeItem(draft, id);
  const item = draft.items.find((x) => x.id === id);
  if (item) item.text = t;
  return draft;
}

export function removeItem(draft, id) {
  draft.items = draft.items.filter((x) => x.id !== id);
  return draft;
}

// Moves an action up (-1) or down (+1) the list.
export function moveItem(draft, id, by) {
  const i = draft.items.findIndex((x) => x.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= draft.items.length) return draft;
  [draft.items[i], draft.items[j]] = [draft.items[j], draft.items[i]];
  return draft;
}

// Clearing starts a new plan: the actions and the stances on them go.
export function clearDraft(draft) {
  draft.items = [];
  draft.stances = [];
  return draft;
}

// A draft from before the plan was a list: one action per line of the old text.
export const draftFrom = (old) => (old?.items ? old : addItem({ ...emptyDraft(), stances: old?.stances ?? [] }, old?.plan ?? ""));
