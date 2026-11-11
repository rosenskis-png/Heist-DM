# Verdict call

**Job:** when a room ends, judge how it went for the party and what it moved in each companion (D146).
**Runtime:** `sample.json`, replay off, `default`. One call when a room ends, after its hand-off is written.
**Sees:** the record, never the narration (`docs/spec/context.md`): the player and each companion's values (beliefs, rules, pursuit, mood, what she admires and despises, wants and can't stand); the whole encounter, with its purpose, what could be had and its ways on; the ledger and the log as they stand at the end; and how it ended, from the hand-off (the ending, optional objectives met and missed, the exit left by, what the party carried out, its hurts).

## Returns (`schemas/calls/verdict.js`)
- **The rating,** 1 to 10, against anchors written into the prompt for 3 (a rough room), 6 (an ordinary one) and 9 (a great one), so it uses the whole range rather than settling on a polite 7.
- **Why:** one or two sentences, from the record.
- **Reactions:** for each companion, what about how the room went moved how she feels, by her own values, as tagged reactions (D20).
- **People:** up to two people from the room worth meeting again: who they are, what became of them, how they feel about the party (D164).

## What the engine does with it
- The rating moves how everyone feels when they reach camp: each companion's regard for the player, and her affection and trust toward the other (D131, numbers in `content/relationship.js`, `morale`). Each companion's reactions then apply to her, within the usual caps.
- The rating moves the leg's strain, which can lengthen the leg (`docs/spec/campaign.md` §2).
- After the climax, the rating decides how many relics the party keeps into the next act (§5).
- Its people join the campaign's memory (`camp.memory`, the last 30), from which a later encounter or oddity may bring one back (`docs/spec/generation.md`).

Nothing inside the room depends on it: it runs after the room is over.

## Validated by the engine
Every reaction is from one of the party's companions. Failures go back for one retry.

- **carried** (D178): what the party has with it as it leaves, the whole list: up to six lines, each an item, a follower or a thread. The call is told what they came in with.
