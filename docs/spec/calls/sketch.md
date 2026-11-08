# Sketch call

**Job:** design the next room whole, as a DM's prep note, premise first, before any of it becomes data (D117, D160).
**Runtime:** `sample.json`, replay off, `complex`. Budget 32 KB. Its output goes straight to encode; nothing reviews it (D156).
**Sees** (`sketchInput` in `src/context.js`): its prompt, which carries the craft as judgment (`docs/design/encounter-craft.md` §16); the seed, split into what it fixes (kind, tone, what the place is busy with in the act's words, whose place it is, the shape and its centrepiece, whose room it is, the kinds its exits lead to, the prize) and its one motif, a leaning; the place in brief, the region as the act's plan describes it now, and the faction whose place it is with its rules and local face (never the heart or the tensions outside a climax); the seed's prize (a journal page comes with its writer, never its words, D168) and at most one extra, someone from before or a sign of the act's peak (D164); the party (who each is, never their abilities, and each companion's values; for the companion whose room it is, the features her story needs and her quest once its act is near, D158); must honour, the way the party arrives and the last rooms' log lines; and the premises of the rooms already generated this act, so this one goes somewhere different (D162); and, for a climax only, the climax block: the act's goal and its peak from the act's plan, the heart, and the act's rooms so far (D163, D164). The prompt holds no concrete images: every one became an anchor (D163). No example rooms: examples become anchors (D161). On the Forge only, the designer's brief, when one is given (D154).

## Returns (`schemas/calls/sketch.js`)
In the order it's written:
- **premise:** the room in one sentence a player would repeat.
- **shape:** one picturable shape, where the party, the danger and the ways on sit on it, in relational words, and how the people there use the space, so the layout follows from what the place does. More than one way past the danger. No measurements.
- **things:** a line each for what matters: what it is, what state it's in, where it is next to the others; for a person, what they're busy with and where their eyes are. Never what it's for. A crowd is one line. Nothing placed or blocked for one party member's ability (D159).
- **cut:** the weakest thing, left out of everything else, or "nothing".
- **pressure:** what's already moving and what a player sees as it worsens; never a deadline; "none" for a calm room.
- **outcomes:** three to five end states, never how the party got there (D156).
- **notes:** what each person wants and fears and what pulls their attention away, what the place won't allow (never how anyone's senses work, or a rule a player must learn), anything worth having, and the ways on, one per kind drawn.
- **opening:** two or three short paragraphs in motion, with a small event that shows what's dangerous (`docs/spec/packet.md` §5, D155, D159).

Never a route, not even as a working note (D156). No play call ever sees a sketch (D59).
