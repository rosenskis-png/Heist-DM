# Campfire call

**Job:** the camp between encounters, the one place where talk and action happen together in the moment.
**Runtime:** `sample.json`, replay off, `complex` (D15).

## What's different about camp
Everywhere else in an encounter, talk and action are separate: the huddle is telepathic talk with time paused, and anything that changes the world goes on a card. At camp, the player is *there* with her. They can talk, touch, wander off, bathe in the spring, fall asleep by the fire. Time passes, but nothing is on a clock and nothing has world consequences. The output reads like Gravenhold's: narration, her actions and her dialogue in one flow (D45).

## Scenes
- **One on one:** the player and one companion. One call, for her. The other companion never sees the scene: it's not in her context, and memories and commitments from it belong only to the companion who was there. She may know that the two went off together, the way Gravenhold's "the other companion is elsewhere in camp, and notices" worked.
- **Sitting with both:** two calls per exchange, one per companion, and who goes first alternates by campaign turn (`speakingOrder`, D70). Each writes only her own actions and words, and the second sees what the first just did. Neither call contains the other's secrets or private history. The scene is as much about the two companions as about him: each picks up the other's thread rather than opening her own, and whatever is between them (friendship, trust, romance, tension, jealousy, a hinted secret, even a fight) can come out, within D73's limits. Each answer says what it `advances`, between the player and one of them or between the two, or null; if the first moved nothing, the second must, and the engine sends it back once if it doesn't.

**Sees:** her profile (gated by relationship state, with her special cases resolved for this scene: `docs/spec/companions.md` §3, §6), relationship state, her own memories and commitments, the beats she may report now (with any declared beat's own text), the campaign log, the last encounter's event log, and the scene so far. In a scene with both, the other's public profile and what she has said and done in this scene. Code: `campfireInput` in `src/context.js`.

## Returns (`schemas/calls/campfire.js`)
Segments of narration (her actions, the setting, time passing) and her dialogue, and her second voice's lines if one speaks in this scene; what it `advances`, an `outfit` she changes into, her relationship changes (within the caps in `docs/spec/companions.md` §4, with `pair` for her side of how the two companions get on, D65); memories, revealed secrets, commitments, and beats that really happened on the page. Every field is about her; she never writes the other companion or the player's words or choices.

**Engine checks** (`campfireProblems` in `src/campaign/relationship.js`): every beat is allowed when it's reached, second-voice lines appear only where that voice speaks, a changed `outfit` is one she owns, and a second answer moves something when the first didn't. Problems go back for the one retry (D13); then `applyCampfire` applies the output.
