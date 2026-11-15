# Outfit call

**Job:** design one outfit found on the journey (D195): a memento of where it was found that the player dresses any companion in (D194). Generation only.
**Runtime:** `sample.json`, replay off, `default`. One call for a room whose seed holds an outfit: a calm room that hides one, or the climax, whose reward it is. It runs after the sketch and before encode.
**Sees:** the room's premise and what the party sees on arrival, from the sketch; at a climax, the act's mood too (the region's feel, the act's setting and question, and who stands at its peak); and the outfits found so far in the campaign, by name and main garment.
**Never sees:** the companions, the party, the packet. An outfit is written for no one.

## What makes a good one (`prompts/outfit.md`)
Very sexy first, before anything about the room: a specific style, its cuts placed exactly, a lot of skin, either a traditional garment recut to scandalise or something already scandalous. The room is only a faint reminder: one colour, at most one small nod. Clothes only, never the wearer.

## Returns (`schemas/calls/outfit.js`)
- **name:** two to four words.
- **text:** 20 to 70 words, two to five pieces separated by semicolons, the main garment first after "a" or "an".
- **from:** where it was found, in a few words.

Code gives it an id from its name, never one already found (`outfitId`).

## Validated
`outfitProblems` in `src/calls/outfit.js`: the shape of `text` above; no word about a wearer (she, her, curves, figure) and no "sexy", which code adds in a picture's register (D194); nothing slipping, sliding or falling off a shoulder; a name not already found. A failure goes back for the one retry; an outfit that still fails leaves the room without one, and the room goes on.

Code: `src/calls/outfit.js`; called from `designRoom` in `src/game/generate.js`.
