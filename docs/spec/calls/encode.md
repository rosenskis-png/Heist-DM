# Encode call

**Job:** turn a finished sketch into an encounter packet (`docs/spec/packet.md`), with only what the DM reads (D116).
**Runtime:** `sample.json`, replay off, `default`. Output: `schemas/calls/encode.js`.
**Sees:** the sketch, the packet schema's slice for its stage, and the stages already encoded.

## Stages
Each stage is one call, validated by the engine before the next:
objective and people → zones and connections → things → clock (routines and placed events) → notes on how people react → opening description.

It must also:
- mark which routines and events the party knows from the start (`known`), and which events are deadlines that slack can move (`deadline`, D41);
- make everything a plan could depend on perceivable or learnable before the player commits (`docs/design/encounter-craft.md` §4.3), since the card never warns (D36);
- write the sketch's design faithfully, adding nothing the sketch doesn't have.

A stage that fails the consistency checks goes back once, with the errors listed. Quality checks only warn.

It writes topology and approximate sizes, never coordinates; code lays them out on the grid (D28).
