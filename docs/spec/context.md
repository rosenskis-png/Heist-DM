# Context assembly

What each AI call is given, in what order, and how it's sent.

---

## 1. Blocks, in order

| Tier | Blocks | Changes |
|---|---|---|
| **Campaign** | The call's job, the shared style guide, worked examples for this act, invariants in play this act, the output format | When the act changes |
| **Encounter** | Character sheets, the encounter as plain lines, the opening | Per encounter |
| **Live** | The ledger, what's coming, recent narration and log, the draft or card, the conversation, the request | Every call |

Prompts are always ordered campaign → encounter → live. `sample` gives no prompt-caching control (D2), but the ordering costs nothing and helps if the platform caches prefixes on its own.

## 2. Who gets what

The encounter reaches the DM's calls as plain lines, not the packet's JSON (`encounterText`, D76): places, ways between them, things where they are now, fixed facts, people's sheets and routines, the packet's prose `notes` on how they react, what's coming, and hidden things listed apart and marked. The ledger comes the same way (`ledgerText`), with the last 16 log entries and the last 10 lines of texture.

| Call | Gets |
|---|---|
| Adjudicate | Characters; the party's gold and relics (D147); the encounter with only the routines and events the party knows; the ledger; what the party expects next; the plan and its stances |
| Resolve | Characters; the party's gold and relics; the whole encounter; the ledger; what really happens tick by tick; the plan, the card and which rolls succeeded |
| Scene | Characters; the party's gold and relics; the encounter without the objective; the opening; the ledger; what's coming; the draft; the conversation |
| Question | The read-only slice (D127, D133): the party and its abilities, with what's left of them; its gold and relics; the encounter without the objective, sheets or reaction notes, with only the routines and events the party knows; the opening; the ledger without its event log; the DM's recent answers; the question |
| Verdict | The record of a room that has ended (D146): the player; each companion's values (beliefs, rules, pursuit, mood, what she admires, despises, wants and can't stand); the whole encounter with its ways on; the ledger and the log at the end; how it ended, from the hand-off |
| Party | Both companions' briefs, each exactly as her companion call has it (D132); the room sheet, as for the companion call; the DM's last two narrations, without the opening; the pair's dynamic; the table without private words or narration; the draft and the card as shown |
| Companion | Her brief and the special cases she acts on (D79, D114, D175); the room sheet (D174); the DM's last two narrations, without the opening; the draft and the card as shown (D40); her private channel |
| Campfire | Her full profile, gated (`docs/spec/companions.md`); the scene; the story so far and the last encounter |
| Pitch | Its job and the format; the two companions' names, roles and blurbs; the features their stories need, with Gravenhold's version of each; Gravenhold as the worked example; pitches the player turned down; the vibe (D151) |

- **Allowlists** (D59): each row is built from an explicit list. Abilities go without their `declared` blocks; a limited one says what's left of it instead (D128).
- **Coordinates never go to any call** (D9). Zones come with their size in feet, and openings in rough real dimensions. Code: `src/context.js`.
- **Hidden things** go only to the resolve and scene calls, marked hidden. The card names nothing the party doesn't know.
- **Companions** see only what the party knows, plus their own data. What they see of the room is the room sheet (D174; `roomSheet` and `sheetText` in `src/context.js`): the opening, the places and who's in them, the ways between, the things, the people in sight or earshot, the facts that aren't hidden, what the party has learned and how things stand. The page shows the player the same sheet (`docs/spec/ui.md`), so no call at the table knows more of the room than the player can read.
- **Budgets** (D76): every call has an input budget (`BUDGET` in `src/ask.js`). One that crosses it still runs, but the page records a warning in the save and shows it in the developer view. `test/budget.test.js` holds every DM and companion call under its budget with the ledger at its limits, mid-fight (D130).
- Generation's calls (sketch, encode) see what `docs/spec/generation.md` lists, and no play call sees their output except the packet.

## 3. Act gates

An invariant or worked example can carry an act gate: the first act it applies in. The engine leaves it out of context entirely before that act. A prompt rule forbidding it would compete with everything else; absence can't.

- **Example:** the Hollow King's heartbeat (`content/worlds/gravenhold.js`, `invariants`) is gated to Act 4. Before then it's in no context at all.
- **Worked examples need act tags too.** The Cells walkthrough's §5 names the heartbeat, so only §1–4 may be sent in Acts 1–3.
- The campaign tier is rebuilt when the act changes.
- The same mechanism gates companion data by relationship state (`docs/spec/companions.md`) and the player's secret by act (the world's secrets, revealed by `content/setting.js`).

## 4. Runtime policy (D2, D13–D15)

| Call | Method | Replay cache | Starting tier |
|---|---|---|---|
| Adjudicate | `sample.json` | on | `default` |
| Resolve | `sample.json` | off | `default` |
| Scene | `sample.json` | off | `default` |
| Question | `sample.json` | off | `quick` (D133) |
| Verdict | `sample.json` | off | `default` (D146) |
| Party | `sample.json` | off | `quick` (D132) |
| Companion | `sample.json` | off | `quick` (D58) |
| Campfire | `sample.json` | off | `complex` |
| Pitch | `sample.json` | off | `complex` (D151) |
| Sketch | `sample.json` | off | `complex` |
| Read | `sample.json` | off | `quick` (D177) |
| Encode | `sample.json` | off | `default` |
| Photo | `sample.json` | off | `default` (D170; the bench only) |

- **Replay on** means identical input returns the stored answer for 5 minutes without calling Claude: the same ledger and plan get the same card, for free. Conversation and prose must never repeat, so their replay is off.
- **Cost** is roughly input size × number of calls, charged to the player's usage. The biggest levers: keep packets small (D26), send raw exchanges only per the table above, answer questions on the cheap tier from the slice, voice both companions in one call, and call only the addressed companion on a private channel.
- **Input limit:** 256 KiB of text per call. The engine measures each assembled prompt and fails loudly if it goes over.
- **Tiers are a player setting** (D48). The table gives the middle position, Balanced; Faster moves every call one tier down and Smarter one tier up (D71). Code: `src/ask.js`.
- **Tidying** (D185): before an output is checked, fields its schema doesn't have and stray nulls are dropped, and each call may repair its own form (a verdict reaction's strength, a card's step order). Meaning is never repaired in code.
- **Retries:** one, with the validation errors listed (D13). Never loop on `rate_limited` or `invalid_json`. Each call has one module in `src/calls/`.
