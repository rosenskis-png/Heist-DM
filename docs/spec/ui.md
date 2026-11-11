# UI

What the player sees. The page is `app/`; what it draws is derived in `src/game/view.js`, and the loop it drives is `src/game/turns.js`.

---

## Two tabs (D127)
Deliberation never moves the world, and committing a plan stays a deliberate act with stakes, kept apart from talk.

| Tab | Job | Moves time? |
|---|---|---|
| **The table** | One running chat: the DM's narration and answers, people talking, the companions chiming in over the rings, private words | Only what the player does or says aloud, and only physical work takes time (`docs/spec/architecture.md`) |
| **Plans** | The draft, the card, the dice and the outcome of each plan that ran | Yes, through committed cards |

On a phone the two are tabs, each with an unread marker, with a third tab for the map (D181), and the room sheet and the party's sheet are one tap away ("Room & party"). On a wide screen they hold a column beside the tabs (D72).

- **The table** has an addressee picker: ask the DM, do something, a person the party can see or hear (D70), the party, or one companion privately. Code decides which calls each one runs (D127; `src/game/turns.js`), and a line under the picker says what it means. The DM's answers show what they settled ("Holds from now on", D133). A plan the DM sends back shows with "Add to the plan". A message whose call failed is marked as not having gone through, no later call reads it, and it offers "Send again" and "Remove" (D138). Party talk is over the rings; only words to a person are said aloud in the world.
- **Plans** shows each plan that ran, then the card or the draft.
- **The draft** is a list of actions (D134): Enter adds one, and each can be moved up or down, edited by tapping it, or deleted. Under it: clear the plan, talk it over (over the rings, both companions react), and make the card. The stances waiting on the player sit with it. The list stays as written after the plan runs.
- **A plan that ran** shows its steps one at a time, each as the card put it with its roll ("Medium · made it") and whether it happened, then where it stopped if it did, then the DM's telling. The dice were rolled before it played out, so showing them costs nothing. Never the DM's own record of a step, which can name what the party hasn't found.
- **The party's sheet** lists what each member is carrying, with what's known of each thing (D184), and each member's abilities, with what's left of the limited ones ("1 of 1 this encounter, 3 of 3 until a rest", D128), and the conditions they carry.
- **The room sheet** (D174) is what the whole party knows of the room, in sections that fold: the opening as the DM first gave it, the places with who's in each and where each leads, the ways between them in full, the things and where they are, who's in sight or earshot, what anyone can tell by looking, what the party has with it from earlier rooms (D178), what the party has learned, and anything pressing right now. The companions' calls are sent this same sheet (`docs/spec/context.md`).
- **Before a roll** (D176): a try that needs a check shows who rolls, how hard it is, why, and what failing costs, with "Roll" and "Never mind". Nothing has happened until the player rolls, and what gets worse in the room is told at the table when it does.
- **The Map tab** (D181, D182) draws the place from its footprints, one level at a time in a window that pans and zooms, each place built, natural or round and coloured by its ground and light, from state alone: tokens gathered in the place the ledger puts them, a crowd as a cluster, a ghost where someone out of sight was last seen, a faded place that's out of sight now, and a marked gap for a way not yet explored. Tapping anything shows what's known of it, and a list says who is where. A room with no drawn map gets a sketch of its places and ways (`mapView`, `sketchView`, `app/map.js`).
- **In a site** (D180) the sheet and the map show only the areas found so far, and a way into one not yet seen is named by the way itself. The setup screen offers the goblin camp as a test beside the Cells.
- **"What do you two think?"** sits by Send (D175): the companions speak when they're spoken to, and this asks them without the player saying anything first. Time doesn't move.
- A companion's stance goes onto the draft for the player to decide: "She sits it out" (her stance stands, and she won't do that step), "It's handled", or "Do it anyway" (D175).

## Between rooms (D173)
When a room ends, the table and Plans show how it ended, the DM's verdict (rating and why) as soon as it's in, the way on taken, and a status line while the next room is made (a minute or two); then "Go on". At the sanctuary, the player picks the relics the climax lets them keep, then begins the next act. A failed step offers "Try again". A calm room shows its ways on above the composer, and the sanctuary "Rest here, and end the act". The header names the act, the kind of room, and the party's gold and relics. The menu's "Leave this room…" ends a room as it stands, after a second tap.

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
- The title screen with save slots, and the setup screen: a name, the two companions (D126), and where: Gravenhold, or a world pitched from a vibe the player types, with another pitch on request (D151). Class and faction come later.
- The theme tokens and light and dark styles.
- The relationship drawer.
- Safe-area handling for phones.

Gravenhold's `Game` component is built around one chat log and is not reused. Its `MapSVG` draws rectangles that don't follow the real layout and is not reused.

## Settings
- **Speed and quality** (D48): Faster, Balanced or Smarter (D71), charged to the player's own usage.
- **Saves:** save now, export the save as JSON, and import one from the title screen (D74).
- **Read aloud** (D104): narration and companion lines spoken with the browser's voices (`src/ui/speech.js`), downloaded Premium and Enhanced voices first. A voice per companion, her second voice and the narrator, each choosable and previewable; each companion speaks at her file's `rate`; asides are quieter; a disguised companion speaks in the voice of the face she wears. Speech starts from a tap (iOS requires it), then can read each new answer automatically. On the bench it lives in Camp.

## Dressing Room (D171)
A dev panel behind the menu: the Dressing Room (`src/ui/dressing.js`), mounted with `live`, over the page. It edits how companions look (`docs/spec/companions.md` §8) and applies changes to the game's live looks at once. The page reads the live looks (`readLooks`) and lays them over the roster (`withLooks`) when it starts, and again when the panel applies a change (`onLooks`), before it builds a party; a room in progress has its party rebuilt from the new roster (`relook` in `src/game/journey.js`). Its menu entry is "Dressing Room".

## Developer view
A panel behind the menu showing every call this session: its tier, size and time, whether it retried and why, its raw output and its assembled input. It also shows the playtest counts (exchanges, card edits, and the exchange by which everyone had left where they started), the recorded companion reactions, the ledger, canon and the event log, any budget warnings, and exports the session's replay log (D60). Held in memory only and never stored (D10).
