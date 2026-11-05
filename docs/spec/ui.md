# UI

What the player sees. The page is `app/`; what it draws is derived in `src/game/view.js`, and the loop it drives is `src/game/turns.js`.

---

## Two tabs (D127)
Deliberation never moves the world, and committing a plan stays a deliberate act with stakes, kept apart from talk.

| Tab | Job | Moves time? |
|---|---|---|
| **The table** | One running chat: the DM's narration and answers, people talking, the companions chiming in over the rings, private words | Only what the player does or says aloud, and only physical work takes time (`docs/spec/architecture.md`) |
| **Plans** | The draft, the card, the dice and the outcome of each plan that ran | Yes, through committed cards |

On a phone the two are tabs, each with an unread marker, and the map and the party's sheet are one tap away ("Map & party"). On a wide screen they hold a column beside the tabs (D72).

- **The table** has an addressee picker: ask the DM, do something, a person the party can see or hear (D70), the party, or one companion privately. Code decides which calls each one runs (D127; `src/game/turns.js`), and a line under the picker says what it means. The DM's answers show what they settled ("Holds from now on", D133). A plan the DM sends back shows with "Add to the plan". A message whose call failed is marked as not having gone through, no later call reads it, and it offers "Send again" and "Remove" (D138). Party talk is over the rings; only words to a person are said aloud in the world.
- **Plans** shows each plan that ran, then the card or the draft.
- **The draft** is a list of actions (D134): Enter adds one, and each can be moved up or down, edited by tapping it, or deleted. Under it: clear the plan, talk it over (over the rings, both companions react), and make the card. The stances waiting on the player sit with it. The list stays as written after the plan runs.
- **A plan that ran** shows its steps one at a time, each as the card put it with its roll ("Medium · made it") and whether it happened, then where it stopped if it did, then the DM's telling. The dice were rolled before it played out, so showing them costs nothing. Never the DM's own record of a step, which can name what the party hasn't found.
- **The party's sheet** lists each member's abilities, with what's left of the limited ones ("1 of 1 this encounter, 3 of 3 until a rest", D128), and the conditions they carry.
- A companion's stance goes onto the draft for the player to decide.

## The card
- **The plan is the player's prose,** usually numbered steps, with any timing and conditions they wrote (D35).
- **Shown:** the DM's steps, the tick each happens on and the beats of the routines the party knows at that tick, when the whole plan is done (D77), each roll's band ("Easy", never a percentage; D33) with its one-line reason and what failure costs, the rulings it depends on, the DM's notes on it, and the stances with keep / resolved / override.
- **Never shown:** anything the party doesn't know. The card never says a plan will go wrong (D36).
- The player can run it, go back to the draft (a changed draft needs a new card before it can run, D134), or mark steps "pause after this step" (D69).
- On a phone the card opens as a sheet over the Plans tab (D72).

## The map (D9)
**Exact layout or no map.** The map is drawn from the packet's geometry, so it matches the real layout.
- SVG, drawn from geometry: walls between squares of different zones, connections in place (bars dashed, red while locked), grates and stairs as marks on their square (D72).
- Only zones the party knows are drawn. An exit to an unknown zone shows as a labelled gap.
- Each level is drawn separately; the others sit beside the main one at the same scale.
- Shows party positions, plus NPC and item positions the party currently perceives.
- Connections show their state (open, locked, broken) once known.
- The clock (tick, and the current beat if the party has learned it, with its cue and the known events coming) is always visible next to the map, and its short form is always in the header. Players should never have to ask what time it is.
- In a fight, the clock also shows what each enemy is about to do (`threats`, D130); the header's short form counts them.
- The header lists the party: each member's conditions, form, and whether they're down. There's no HP (D130).
- A packet without geometry shows no map. A wrong map is worse than none.

## Carried over from Gravenhold (legacy `Title`, `Setup`, `Drawer`, `AbilitySheet`, `Bar`, `Sigil`)
- The title screen with save slots, and the setup screen: a name and the two companions (D126). Class and faction come later.
- The theme tokens and light and dark styles.
- The relationship drawer.
- Safe-area handling for phones.

Gravenhold's `Game` component is built around one chat log and is not reused. Its `MapSVG` draws rectangles that don't follow the real layout and is not reused.

## Settings
- **Speed and quality** (D48): Faster, Balanced or Smarter (D71), charged to the player's own usage.
- **Saves:** save now, export the save as JSON, and import one from the title screen (D74).
- **Read aloud** (D104): narration and companion lines spoken with the browser's voices (`src/ui/speech.js`), downloaded Premium and Enhanced voices first. A voice per companion, her second voice and the narrator, each choosable and previewable; each companion speaks at her file's `rate`; asides are quieter; a disguised companion speaks in the voice of the face she wears. Speech starts from a tap (iOS requires it), then can read each new answer automatically. On the bench it lives in Camp.

## Developer view
A panel behind the menu showing every call this session: its tier, size and time, whether it retried and why, its raw output and its assembled input. It also shows the playtest counts (exchanges, card edits, and the exchange by which everyone had left where they started), the recorded companion reactions, the ledger, canon and the event log, any budget warnings, and exports the session's replay log (D60). Held in memory only and never stored (D10).
