# UI

What the player sees. The page is `app/`; what it draws is derived in `src/game/view.js`, and the loop it drives is `src/game/turns.js`.

---

## Three interfaces
Splitting the single chat into three is one of the project's two breakthroughs. Each has one job, and deliberation in one never moves the world in another.

| Interface | Job | Moves time? |
|---|---|---|
| **Plan** | The draft card, committing, the DM's card, the narration of each plan played out | Yes, through committed cards |
| **Moment** | Questions, talk, quick actions, fights a round at a time | Only physical work takes time (`docs/spec/architecture.md`) |
| **Companions** | The huddle, private channels, the campfire | No |

On a phone the three are tabs, each with an unread marker, and the map is one tap away. On a wide screen the map and clock hold a column beside the tabs (D72).

- **Plan** shows the narration, each committed card, and the draft: the plan text and the stances waiting on the player.
- **Moment** has an addressee: the DM, or a person the party can see or hear (D70). A plan the DM sends back shows with "Add to the plan".
- **Companions** has the huddle and one private channel per companion. A stance a companion takes goes onto the draft for the player to decide.

## The card
- **The plan is the player's prose,** usually numbered steps, with any timing and conditions they wrote (D35).
- **Shown:** the DM's steps, the tick each happens on and the beats of the routines the party knows at that tick, when the whole plan is done (D77), each roll's band ("Easy", never a percentage; D33) with its one-line reason and what failure costs, the rulings it depends on, the DM's notes on it, and the stances with keep / resolved / override.
- **Never shown:** anything the party doesn't know. The card never says a plan will go wrong (D36).
- The player can confirm, edit the plan text (which makes a new card), or mark steps "pause after this step" (D69).
- On a phone the card opens as a sheet over the Plan tab (D72).

## The map (D9)
**Exact layout or no map.** The map is drawn from the packet's geometry, so it matches the real layout.
- SVG, drawn from geometry: walls between squares of different zones, connections in place (bars dashed, red while locked), grates and stairs as marks on their square (D72).
- Only zones the party knows are drawn. An exit to an unknown zone shows as a labelled gap.
- Each level is drawn separately; the others sit beside the main one at the same scale.
- Shows party positions, plus NPC and item positions the party currently perceives.
- Connections show their state (open, locked, broken) once known.
- The clock (tick, and the current beat if the party has learned it, with its cue and the known events coming) is always visible next to the map, and its short form is always in the header. Players should never have to ask what time it is.
- A packet without geometry shows no map. A wrong map is worse than none.

## Carried over from Gravenhold (legacy `Title`, `Setup`, `Drawer`, `AbilitySheet`, `Bar`, `Sigil`)
- The title screen with save slots, and the setup screen: a name and the two companions (D126). Class and faction come later.
- The theme tokens and light and dark styles.
- The relationship drawer and the ability sheet.
- Safe-area handling for phones.

Gravenhold's `Game` component is built around one chat log and is not reused. Its `MapSVG` draws rectangles that don't follow the real layout and is not reused.

## Settings
- **Speed and quality** (D48): Faster, Balanced or Smarter (D71), charged to the player's own usage.
- **Saves:** save now, export the save as JSON, and import one from the title screen (D74).
- **Read aloud** (D104): narration and companion lines spoken with the browser's voices (`src/ui/speech.js`), downloaded Premium and Enhanced voices first. A voice per companion, her second voice and the narrator, each choosable and previewable; each companion speaks at her file's `rate`; asides are quieter; a disguised companion speaks in the voice of the face she wears. Speech starts from a tap (iOS requires it), then can read each new answer automatically. On the bench it lives in Camp.

## Developer view
A panel behind the menu showing every call this session: its tier, size and time, whether it retried and why, its raw output and its assembled input. It also shows the playtest counts (exchanges, card edits, and the exchange by which everyone had left where they started), the recorded companion reactions, the ledger, canon and the event log, any budget warnings, and exports the session's replay log (D60). Held in memory only and never stored (D10).
