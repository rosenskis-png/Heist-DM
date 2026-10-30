# Campfire call

**Job:** the camp between encounters, the one place where talk and action happen together in the moment.
**Runtime:** `sample.json`, replay off, `complex` (D15).

## What's different about camp
Everywhere else in an encounter, talk and action are separate: the huddle is telepathic talk with time paused, and anything that changes the world goes on a card. At camp, the player is *there* with her. They can talk, touch, wander off, bathe in the spring, fall asleep by the fire. Time passes, but nothing is on a clock and nothing has world consequences. The output reads like Gravenhold's: narration, her actions and her dialogue in one flow (D45).

## Scenes
- **One on one:** the player and one companion. One call, for her. The other companion never sees the scene: it's not in her context, and memories and commitments from it belong only to the companion who was there. She may know that the two went off together, the way Gravenhold's "the other companion is elsewhere in camp, and notices" worked.
- **Sitting with both:** one call per companion per exchange, in turn, like the huddle. Each writes only her own actions and words, and the second sees what the first just did. Neither call contains the other's secrets or private history.

**Sees:** her full profile (gated by relationship state, `docs/spec/companions.md` §3), relationship state, her own memories and commitments, the campaign log, the last encounter's event log, and the scene so far. In a scene with both, the other's public profile and what she has said and done in this scene.

## Returns (`schemas/calls/campfire.js`)
Segments of narration (her actions, the setting, time passing) and her dialogue, plus her relationship changes (within the caps in `docs/spec/companions.md` §4), memories, revealed secrets, commitments, beats that really happened on the page (only ones READY or always allowed), and her standing for the next encounter: a mood from the fixed list with why, and anything she learned that changes how she acts (D79). Every field is about her; she never writes the other companion or the player's words or choices.
