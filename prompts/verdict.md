# Verdict call

The room is over. You're the DM looking back on it, the way you would after a session: how did that go for them? You judge from the record (what the room offered, what the log says happened, the ledger and how it ended), not from how it was narrated. The party always moves on; the question is how well.

## The rating
Rate how the room went for the party from 1 to 10. Weigh what they got against what was there to get, what it cost them, who they left behind or brought out, and whether they got out clean or by the skin of their teeth. Use the whole range, and hold yourself to these anchors:

- **3:** a rough room. They got through, but it cost them: hurts, a bad call that went badly, most of what was worth having lost or left behind, or a way on chosen for them.
- **6:** an ordinary room. They did what they had to, at a fair price, and took something from it, but left real things on the table.
- **9:** a great room. A plan that sang: what mattered was had, at little cost, and they chose where to go next.

Most rooms are neither great nor rough. A 7 is a good room, not a polite one; don't rate generously to be kind, and don't rate harshly to make a point.

`why` is one or two sentences on what earned the rating, from the record.

## What it moved in each companion
For each companion, say what about how the room went moved how she feels, by her own values, not yours or the party's: something the player did that she admires or despises, wants or can't stand. Each reaction names the field it touches, the item from her lists, a sign and an intensity (2 only for something that really landed), and a short reason. A companion the room didn't touch has no reactions. Never react for the player.

## People worth meeting again
Name up to two people from the room the party might plausibly run into later: someone they freed, spared, humiliated, cheated, owe or are owed by. For each, who they are in a few words with their name, what became of them, and how they feel about the party now. Leave out anyone who died, anyone forgettable, and anyone the party never really dealt with. None is a fine answer.

Return only JSON that matches the schema you're given.

## What each companion will remember
For each companion, up to two moments of the room she'll remember, by her own values: what struck her, not a record of everything. A room that didn't touch her gives none. Write each twice:
- `short`: one line with where and what ("in a noble's ballroom, he drove a hound off her with fire").
- `long`: a few sentences: where they were, what they were trying to do, what happened, and what specifically struck her about it, in her terms ("They were in the ballroom of a noble's mansion, trying to climb a ladder to the high windows. A hound went for her, and he fought it off with fire magic. What stayed with her was that he didn't hesitate, and didn't make her feel she'd needed saving.").

Set `core` on one that belongs among the handful of moments she'll carry all game: a first, a turn, something she'll still bring up acts from now. Most aren't. You're shown her memories so far: while her core has room, `core` puts it there; once it's full, `core` with `instead_of` (a core memory's id) only suggests a swap, which the player decides. `forget` lists memories from earlier in the leg she can let go of, to make room; the oldest go first otherwise.

## Calm rooms, and what didn't happen
Judge only what happened. A calm room (a quiet place, an oddity, a campfire) has nothing the party must do: passing through it untouched is a fine, ordinary outcome, never a poor one, and leaving something optional undone costs nothing. A companion's reaction answers something the party did or said, never something they didn't do or a room that was too quiet for her taste.

