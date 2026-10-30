# Context assembly

What each AI call is given, in what order, and how it's sent.

---

## 1. Blocks, in order

| Tier | Blocks | Changes |
|---|---|---|
| **Campaign** | Role and judgment for the call, the shared style guide, worked examples for this act, invariants in play this act, character sheets (stable part), the companion's profile (companion calls) | When the act changes |
| **Encounter** | Intent, people, map, opening description | Per encounter |
| **Live** | State, canon added, event log, table read, draft card, recent raw exchanges, the request | Every call |

Prompts are always ordered campaign → encounter → live. `sample` gives no prompt-caching control (D2), but the ordering costs nothing and helps if the platform caches prefixes on its own.

## 2. Who gets what

| Block | Step | Pricing | World | Narration | Moment | Companion |
|---|---|---|---|---|---|---|
| Character sheets | full | full | condition | voice notes | full | own full; others' known abilities |
| Intent | ✓ | ✓ | ✓ | ✓ | — | — |
| People | ✓ | ✓ | ✓ | ✓ | ✓ | learned only |
| Map (relationships and derived facts) | full | full | full | full | full, hidden marked | known only |
| Opening description | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| State, canon, event log | full | full | full | full | full | known only |
| Engine route and observer facts | — | ✓, foreseen and unforeseen kept apart (D36) | — | — | — | — |
| Table read | — | — | ✓ | — | — | — |
| Card | plan + decided stances | validated steps (internal facts kept apart) | results | steps with their results + world actions | draft | draft and card as shown (D40) |
| Recent raw exchanges | few | — | — | few | current conversation | visible huddle this encounter, plus recent narration the party witnessed |
| Huddle content | — | — | — | — | — | own channels |
| Companion secrets and relationships | — | — | — | — | — | own only, gated (`docs/spec/companions.md`) |

- **Allowlists** (D59): each column above is built from an explicit list. Abilities go without their `declared` blocks; the party's map has no size categories; the world call gets only the people present, routines as labels, and the ids of the engine's reactions, with no prose style guide.
- **Coordinates never go to any call** (D9). The map block is relationships plus facts the engine derived from geometry.
- **Hidden things** go only to the plan calls and the Moment AI, marked hidden.
- **Companions** see only what the party knows, plus their own data.
- The generator and campfire calls are described in `docs/spec/calls/`.

## 3. Act gates

An invariant or worked example can carry an act gate: the first act it applies in. The engine leaves it out of context entirely before that act. A prompt rule forbidding it would compete with everything else; absence can't.

- **Example:** the Hollow King's heartbeat (`content/setting.js`) is gated to Act 4. Before then it's in no context at all.
- **Worked examples need act tags too.** The Cells walkthrough's §5 names the heartbeat, so only §1–4 may be sent in Acts 1–3.
- The campaign tier is rebuilt when the act changes.
- The same mechanism gates companion data by relationship state (`docs/spec/companions.md`) and the player's secret by act (`content/setting.js`).

## 4. Runtime policy (D2, D13–D15)

| Call | Method | Replay cache | Starting tier |
|---|---|---|---|
| Generator | `sample.json` | off | `complex` |
| Step | `sample.json` | on | `default` |
| Pricing | `sample.json` | on | `default` |
| World | `sample.json` | on | `default` |
| Narration | `sample.json` | off | `default` |
| Moment | `sample.json` | off | `default` |
| Companion | `sample.json` | off | `default` |
| Campfire | `sample.json` | off | `complex` |
| Ruling | `sample.json` | on | `quick` |

- **Replay on** means identical input returns the stored answer for 5 minutes without calling Claude: the same state and plan get the same ruling, for free. Conversation and prose must never repeat, so their replay is off.
- **Cost** is roughly input size × number of calls, charged to the player's usage. The biggest levers: keep packets small (D26), send raw exchanges only per the table above, and call only the addressed companion on a private channel.
- **Input limit:** 256 KiB of text per call. The engine measures each assembled prompt and fails loudly if it goes over.
- **Tiers are a player setting** (D48). The table gives the middle position; each position of the setting maps every call to a tier.
- **Retries:** one, with the validation errors listed (D13). Never loop on `rate_limited` or `invalid_json`.
