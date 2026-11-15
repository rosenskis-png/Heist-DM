# Sketch call

**Job:** design the next room whole, as a DM's prep note, premise first, before any of it becomes data (D117, D160).
**Runtime:** `sample.json`, replay off, `complex`. Budget 32 KB. Its output goes straight to encode; nothing reviews it (D156).
**Sees** (`sketchInput` in `src/context.js`): its prompt, which carries the craft as judgment (`docs/design/encounter-craft.md` §16); the seed, split into what it fixes (kind, whose place it is, whose room it is, the kinds its exits lead to, the prize; for an encounter the place, and for a calm room its tone, what the place is busy with, the shape and its centrepiece, D196) and its one motif, a leaning; the world's tone (D196); the place in brief, the region as the act's plan describes it now, and the faction whose place it is with its rules and local face (never the heart or the tensions outside a climax); the seed's prize (a journal page comes with its writer, never its words, D168) and at most one extra, someone from before or a sign of the act's peak (D164); the party (who each is, never their abilities, and each companion's values; for the companion whose room it is, the features her story needs and her quest once its act is near, D158); must honour, the way the party arrives and the last rooms' log lines; and the premises of the rooms already generated this act, so this one goes somewhere different (D162); and, for a climax only, the climax block: the act's goal and its peak from the act's plan, the heart, and the act's rooms so far (D163, D164). The prompt holds no concrete images: every one became an anchor (D163). No example rooms: examples become anchors (D161). On the Forge only, the designer's brief, when one is given (D154).

## Returns (`schemas/calls/sketch.js`)
In the order it's written:
- **premise:** the room in one sentence a player would repeat.
- **shape:** the place in a few sentences: what it is, and where the party, the people and the ways on are in it, in relational words, laid out the way such a place is. No measurements.
- **things:** a line each for what matters: what it is, what state it's in, where it is next to the others; for a person, what they're doing. Never what it's for. A crowd is one line. Nothing placed or blocked for one party member's ability (D159).
- **cut:** the weakest thing, left out of everything else, or "nothing".
- **pressure:** what's already moving and what a player sees as it worsens; never a deadline; "none" for a calm room.
- **notes:** for each person, what they believe and want, how they decide and how they'd take a stranger walking in; for anyone dangerous, how a straight fight with the party would likely go; the plain physical truth a ruling will turn on; what the place won't allow; anything worth having; and the ways on, one per kind drawn. Never a rule a player must learn or how anyone's senses work.
- **opening:** two or three short paragraphs, one picture: the place and who's in it; what the party might want here, when there is something, and the ways on; and, when there's danger, what the party makes of it (what it is, how a straight fight would likely go, whether it would talk first), or that they can't tell (`docs/spec/packet.md` §5, D196).

Never a route, not even as a working note (D156). No play call ever sees a sketch (D59).
