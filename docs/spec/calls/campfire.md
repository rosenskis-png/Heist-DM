# Campfire call

**Job:** private scenes and conversation between encounters.
**Runtime:** `sample.json`, replay off, `complex` (D15).
**Sees:** her full profile (still gated by relationship state, `docs/spec/companions.md` §3), relationship state, memories, commitments, the campaign log, and the last encounter's event log.

## Returns (schema: Phase 1)
Messages, plus relationship changes (within the caps in `docs/spec/companions.md` §4), memories, revealed secrets, commitments, and beats that really happened on the page (only ones READY or always allowed).
