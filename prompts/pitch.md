# Pitch call

The player is starting a new adventure and has typed a vibe: a few words about what they want it to feel like. You write the world the whole adventure is set in, and a short pitch they read before choosing it. If they don't like it, they'll ask for another, so make this one a real, specific take on what they typed, not a safe average.

## What every world is
Whatever the vibe, every world is the same kind of adventure, and yours must be too:

- **An escape from a hostile, living place much bigger than the party.** The place has its own life and isn't mainly concerned with the party: it's busy with its own work, feasts, rites and feuds. Its people are mostly hostile, but they're going about their business, not hunting the party. The party starts small, in a cell inside it, and escapes outward through it over five acts.
- **A heart at the bottom:** something sealed, sleeping or hidden deep in the place that its factions each want, for their own ends. It's what the adventure builds toward.
- **Factions that want things from each other, not only from the party,** so the party has leverage and the place has surprises in it. Give two to four, each with its own way of behaving, what works on it, and how it raises the alarm.
- **Medieval fantasy,** in whatever key the vibe asks for. The three of them wake wearing silver rings that let them talk silently, mind to mind; that's true in every world, and who put them there is a mystery revealed in Act 3.

The five acts always follow one shape, and you write each one's place, sanctuary (where the party rests at its end), mechanics (what kind of trouble it's full of) and goal:
1. trapped: breaking out of the cell and its block;
2. crossing the place: its working levels, where its people live and work;
3. uncovering its secret: why the place exists, and why the party was taken;
4. the climax: the heart, and the factions' designs on it;
5. getting out.

## Roles
Companions' stories name the place through roles, which you fill with short noun phrases that read naturally in a sentence: `place` (its name), `kind` (what sort of place: fortress, manor, abbey), `builders` (who built it long ago, as "the dwarves") and `builders_adj` (as "dwarven"), `rulers` (who holds it now, as "the occupiers"), `commander` (their leader, as "the occupying commander"), `master` (who runs the prison and its records, as "the warden"), `working` (its working levels, as "the Warrens"), `depths` (its old deep parts, as "the Undercroft"), and `sanctum` (its seat of power, as "the Sanctum"). Use "the" where the phrase needs it.

## Features the companions need
The companions in this party each have a story that needs the place to hold something, listed with what Gravenhold made of it. Put every one in `features` under the same key, made to fit your world, and let them matter: a spring that's sacred here, an archive that's worth finding.

## The rest
- `place` and `escape`: the place in a sentence or two, and its one real way out, which should lead the party deeper before it leads them out.
- `life`: what the place is busy with, whatever the party does.
- `tensions`: two or three lines on what the factions want from each other.
- `playerSecrets`: two or three secrets that could tie the player to the heart, revealed over the acts.
- `roomKinds`: what an exploration room, a social room and a respite room look like here, with examples from the place.
- `invariants`: world facts that never change, each optionally gated to the act it first applies in. One or two is plenty.
- `id`: a short lowercase id for the world. `openAct` is optional.

Gravenhold is shown as a worked example of the shape and the level of detail. Don't copy it: no dwarves, vaults, warbands or mind flayers unless the vibe asks for them.

## The pitch
A few sentences in the second person that sell this adventure to the player: where they wake, what the place is, what's stirring in its depths. Don't spoil the heart's secret or the player's secrets.

Return only JSON that matches the schema you're given.
