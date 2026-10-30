# Architecture

Who does what, the encounter loop, and time. For why it's shaped this way, see `docs/principles.md`.

---

## Actors

| Actor | Calls | Job |
|---|---|---|
| **Engine** | none | Owns all state. Does geometry, dice, ticks, schedules, validation, objective checks, the event log and the table read. Pure code: no DOM, no AI calls (D12). |
| **Generator** | Once per encounter, plus a validation retry | Builds the encounter packet (`docs/spec/packet.md`). Hand-authored packets replace it until Phase 7 (D25). |
| **Plan AI** | Step, pricing, world and narration calls | Turns committed plans into resolvable steps, prices them, plays the world's response, and narrates. |
| **Moment AI** | One call per exchange; one per combat round | Answers questions, runs checks, plays NPCs, runs combat, and redirects actions to the draft card. |
| **Companion AI** | One call per companion per message; campfire | Voices each companion in the huddle and at the campfire. |

Every AI call goes through the artifact runtime's `sample` (D2). Each call's contract is in `docs/spec/calls/`.

The plan side is split into several small sequential calls (decide → validate → narrate). The player expects to wait when committing a plan, so the extra latency is acceptable there. Moment and huddle calls stay single and fast because they're conversational.

## Modes

| Mode | Cards | Ticks | Calls |
|---|---|---|---|
| **Encounter** | yes | yes | all |
| **Room** (exploration, social, respite; D22) | no | no | moment, companion |
| **Campfire** (between encounters) | no | no, time passes freely | campfire, one call per companion (D45) |

## Encounter loop

1. **World turn.** The engine applies pending ticks and schedules. The world call decides NPC reactions and arrivals; the narration call describes the situation.
2. **Huddle** (time paused). The player talks with the companions. Their stances go onto the draft card as pending.
3. **Moments** (optional). Questions, checks, conversations and fights (`docs/spec/calls/moment.md`). Actions are redirected to the draft card.
4. **Commit.** The player writes the plan, with any timing and conditions (D35), and decides each pending stance (keep / resolved / override). Only the player writes plan content.
5. **Card.** The step call, engine validation and the pricing call. Every step is priced as the party expects the world to be; the card warns about nothing (D36). The player confirms or edits.
6. **Execute.** The engine resolves the card step by step (`docs/spec/engine.md` §6). Narration covers everything up to the end of the plan or the first stop.
7. **Stop, interruption or finish.** A failed risk can stop the plan. Reality can interrupt it: something the party didn't foresee, a step that can't happen as they expected. Either way, go back to step 1 from that moment. The engine checks the objective after every step, and the encounter ends when it's met.

## Time

Ticks exist only in encounters. Schedules are written in ticks when the packet is built.

| Event | Ticks |
|---|---|
| Plan step | 1 |
| Waiting in a plan (`when`) | 1 per tick waited |
| Extra-time consequence | as stated |
| Check | 1 (added to pending) |
| Conversation | 1 when it ends |
| Combat | 1 on rounds 2, 4, 6, … |
| Question, huddle, card review | 0 |

**A step takes place in the tick it starts in** (D16). A committed plan's first step happens on the current beat, and the tick advances when the step ends. The engine projects every later step's tick from that.

Pending ticks are applied one at a time at the next world turn, checking for arrivals after each.
