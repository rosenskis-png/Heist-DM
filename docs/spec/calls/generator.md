# Generator call

**Job:** build an encounter packet (`docs/spec/packet.md`).
**Runtime:** `sample.json`, replay off, `complex` (D15). Until Phase 7, packets are written by hand (D25).
**Sees:** the campaign tier, the hand-off from the last encounter (`docs/spec/state.md`), the act's goals and mechanics (`content/setting.js`), the party's abilities, and a small slice of `docs/design/encounter-craft.md` as judgment, never the whole guide as rules.

## Shape (Phase 7)
Built in stages, each validated by the engine before the next:
objective and people → zones and geometry → things → clock → alarm ladder → opening description.

A packet that fails the consistency checks is regenerated, with the errors listed. Quality checks only warn. The generator's private "a route exists" check is thrown away and never stored.

It writes topology and approximate sizes, never coordinates; code lays them out on the grid (D28). The format of that sketch is Phase 7's. If layout fails, the packet ships without a map (D9).
