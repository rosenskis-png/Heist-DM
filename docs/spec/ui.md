# UI

What the player sees. Built in Phase 4 (`docs/roadmap.md`).

---

## Three interfaces
Splitting the single chat into three is one of the project's two breakthroughs. Each has one job, and deliberation in one never moves the world in another.

| Interface | Job | Moves time? |
|---|---|---|
| **Plan** | The draft card, committing, the priced card, execution narration, world turns | Yes, only through committed cards |
| **Moment** | Questions, checks, conversations with NPCs, combat | Checks, conversations and combat rounds cost ticks (`docs/spec/architecture.md`) |
| **Companions** | The huddle, private channels, the campfire | No |

On a phone the three are tabs, each with an unread marker (roadmap, Phase 4).

## The card
- **Shown:** steps, what each changes, each risk's odds and its one-line reason, what failure costs, pending stances with keep / resolved / override.
- **Never shown:** internal checks on hidden facts.
- The player can confirm, edit the plan text (which re-runs the step and pricing calls), or add checkpoints.

## The map (D9)
**Exact layout or no map.** The map is drawn from the packet's geometry, so it matches the real layout.
- Only zones the party knows are drawn. An exit to an unknown zone shows as a labelled gap.
- Shows party positions, plus NPC and item positions the party currently perceives.
- Connections show their state (open, locked, broken) once known.
- The clock (tick, and the current beat if the party has learned it) is always visible next to the map. Players should never have to ask what time it is.
- A packet without geometry shows no map. A wrong map is worse than none.

## Carried over from Gravenhold (legacy `Title`, `Setup`, `Drawer`, `AbilitySheet`, `Bar`, `Sigil`)
- The title screen with save slots, and the setup screen (name, class, faction, two companions).
- The theme tokens and light and dark styles.
- The relationship drawer and the ability sheet.
- Safe-area handling for phones.

Gravenhold's `Game` component is built around one chat log and is not reused. Its `MapSVG` draws rectangles that don't follow the real layout and is not reused.

## Developer view (recommended)
A hidden panel showing the last call's assembled input and raw output, held in memory only and never stored (D10). It makes precise playtest feedback easy to give.
