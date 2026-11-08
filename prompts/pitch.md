# Pitch call

The player is starting a new adventure and has typed a vibe: a few words about what they want it to feel like. You write the world the whole adventure is set in, and a short pitch they read before choosing it. Make it a real, specific take on what they typed, not a safe average. This is pulp fantasy played straight: bold, visible and a little larger than life.

## What every world is
Whatever the vibe, every world is the same kind of adventure, and yours must be too:

- **An escape from a hostile, living place much bigger than the party.** The place has its own life and isn't mainly concerned with the party: it's busy with its own work, feasts, rites and feuds. Its people are mostly hostile, but they're going about their business, not hunting the party. The party starts small, in a cell inside it, and escapes outward through it over five acts.
- **A heart at the bottom:** something deep in the place that its factions each want, for their own ends, of the kind the seed names. It's what the adventure builds toward.
- **Factions that want things from each other, not only from the party,** so the party has leverage and the place has surprises in it. Give two to four, each with its own way of behaving and what works on it.
- **Medieval fantasy,** in whatever key the vibe asks for. The three of them wake wearing silver rings that let them talk silently, mind to mind; that's true in every world, and who put them there is revealed in Act 3.

## The five regions
Each act crosses one region of the place, and the five always rise the same way: tension, danger and grandeur climb from Act 1 to Act 4, and Act 5 is the escape and the consequences of what came before.
1. **Trapped:** personal. The cell block and the few who run it; nothing in the party's hands.
2. **Crossing the place:** communal. Its working levels, where its people live and work; crowds and lieutenants.
3. **Uncovering its secret:** ancient. What the place really is: older, stranger, wonder and dread.
4. **The heart:** mythic. The factions' grandest designs on it, all at once.
5. **Getting out:** aftermath. The way out, and the place reacting to what the party did.

For each region write its `name`; `what` it is, in a line; its `sanctuary`, where the party rests at the act's end; its `holders`, the ids of the factions that hold it; and its `feel`: how it looks, sounds and moves, so no two regions feel alike. Don't write what happens in each act: that's decided when the act begins, from what the party has done.

## Factions
For each faction: `name`, `short` (a few words), `desc`, `rules` (how they behave and what works on them), `goal` (what they want from the heart), and a `ladder` of three leaders, lowest first: a local face the party could meet early, a lieutenant, and the top. Give each a name and a `hook`: one visible, larger-than-life thing a player would remember them by.

## Mysteries
Two to four mysteries: truths about the place that the game never confirms. A player who pieces one together might gain an edge; one who ignores them all can still finish. For each:
- `id`, and the `truth`, in a sentence: lore worth knowing about this place, each mystery about something different. Never about the rings or the player's secrets: those are revealed as story, not left as mysteries.
- The `edge`: one place later in the adventure where knowing the truth quietly helps, and what becomes more likely to work there. `act` is when it starts to matter (2 to 5); `at` is "climax" for that act's climax, or a faction's id for that faction's rooms from then on; `text` says what's more likely to work, never an automatic win. Spread the edges across different acts.
- Three to five `clues`, each with an `id` and what it `says`: the words or the picture itself, part of the truth said nearly outright and cut off before it says everything. Never what it's written on or who says it (the room that holds it decides that), and never a small detail to notice: each clue tells something plainly, and only all of them together tell the whole truth.

## Roles
Companions' stories name the place through roles, which you fill with short noun phrases that read naturally in a sentence: `place` (its name), `kind` (what sort of place: fortress, manor, abbey), `builders` (who built it long ago) and `builders_adj` (their adjective), `rulers` (who holds it now), `commander` (their leader), `master` (who runs the prison), `working` (its working levels), `depths` (its old deep parts), and `sanctum` (its seat of power). Use "the" where the phrase needs it.

## Features the companions need
The companions in this party each have a story that needs the place to hold something, listed with what Gravenhold made of it. Put every one in `features` under the same key, made to fit your world, and let them matter.

## The rest
- `place` and `escape`: the place in a sentence or two, and its one real way out, which should lead the party deeper before it leads them out.
- `life`: what the place is busy with, whatever the party does: several different things, not one.
- `tensions`: two or three lines on what the factions want from each other.
- `playerSecrets`: two secrets, one of each kind the seed names, each tying the player to the place, revealed over the acts. They needn't touch the heart. The player's gender isn't known: always write them as "they".
- `invariants`: world facts that never change, each optionally gated to the act it first applies in. One or two is plenty.
- `id`: a short lowercase id for the world.

When Gravenhold is shown, it's a worked example of the shape and the level of detail, not of the content: its heart and secrets answer a different seed.

## The pitch
A few sentences in the second person that sell this adventure to the player: where they wake, what the place is, what it's busy with, and what they'll have to get through. Don't spoil the heart's secret, the mysteries or the player's secrets.

Return only JSON that matches the schema you're given.
