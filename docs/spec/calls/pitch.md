# Pitch call

**Job:** write the world an adventure is set in from the player's vibe, and a pitch they read before choosing it (D151).
**Runtime:** `sample.json`, replay off, `complex`. Called from the setup screen, once per pitch the player asks for, after they've chosen their two companions.
**Sees:** its job and the output format; the two companions (name, role, blurb); the features their stories need, each with what Gravenhold made of it; Gravenhold as the worked example of a world's shape and detail, unless the Forge turns it off to compare (`noExample`); any pitches the player has already turned down, so the next is different; the seed code drew for it (`pitchSeed` in `src/campaign/world.js`, from `content/pitch.js`: the kind of thing the heart is, and two kinds of player secret, D157); and the vibe, which may be empty. The player is always "they".
**Never sees:** a companion's profile beyond her blurb, any encounter, or world facts (there's no world yet).

## Returns (`schemas/calls/pitch.js`)
- **The pitch:** a few sentences in the second person that sell the adventure, without spoiling the heart's secret or the player's.
- **The world,** in the shape of `schemas/world.js` (`docs/spec/campaign.md` §9): the place and its way out, its roles, heart, life, factions with their ladders and the tensions between them, features, its five regions on the rising curve, two to four mysteries with their edges and clues, the player's secrets and world facts (D164).

## Validated by the engine
The world's shape (exactly five regions, every role, at least two factions with three-rung ladders, two tensions, two mysteries and two player secrets), and that it holds every feature the chosen companions need (`worldProblems`). Failures go back for one retry.

## Where it goes
The setup screen shows the world's name and the pitch. The player can ask for another (up to the last three pitches are sent as turned down), go back to Gravenhold, or begin. The session keeps the chosen world whole, saves it, and never generates it again; companions' slots and world facts come from it (D150).
