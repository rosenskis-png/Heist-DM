# Gravenhold (legacy)

The original prototype: a single-file React 18 app that runs as a claude.ai artifact and calls Claude through `window.claude.use("sample")`. It proved the companion system and is the best record of what goes wrong. It stays here untouched and playable (D1).

| File | What it is |
|---|---|
| `gravenhold.html` | The original. Never edited. |
| `gravenhold.src.js` | The same script, prettified to be readable and searchable. Reference only; never loaded. Line numbers below refer to this file. |

Its game data now lives in `content/` (D6). Read this file to find logic worth porting, or to see how a failure happened. Don't design from it.

---

## Map of `gravenhold.src.js`

### Data (lines 4–1507): extracted to `content/`
| Lines | Constant | Now |
|---|---|---|
| 4–78 | `SKILLS`, `CLASSES` | `content/rules.js`, `content/classes.js` |
| 79–732 | `COMPANIONS` | `content/companions/<id>.js` (betrayal removed, D7) |
| 733–920 | `LISA_VARIANTS`, `HERITAGE`, `LISA_STYLE` | `content/companions/lisa.js` → `variants` (`HERITAGE` and `LISA_STYLE` were used only for photos) |
| 921–1013 | `PAIRS` | `content/pairs.js` |
| 1014–1106 | `FACTIONS`, `ACTS`, `OPEN_ACT` | `content/setting.js` |
| 1107–1156 | `ARCHETYPES` | not extracted: encounter-type seeds for the old generator; a possible reference in Phase 7 |
| 1157–1161 | `SECRETS` | `content/setting.js` → `playerSecrets` |
| 1162–1461 | `STRIKE`, `ABILITIES` | `content/rules.js`; class abilities in `classes.js`, companion abilities in each companion file |
| 1462–1470 | `ENEMY_TIERS`, `COMBAT_RULE` | `content/rules.js` |
| 1471–1480 | `INTRO_SCENARIOS` | not extracted: cell-block seeds for the old generator |
| 1481–1507 | `DYN_PHASE` | **banned** (below) |

### Logic (lines 1508–3722)
| Lines | What | Status |
|---|---|---|
| 1508–1524 | `compData`: Lisa's variant merged in by her sister's id | Port as data (`docs/spec/companions.md` §6) |
| 1534–1584 | `stageLabel`, `progress`, `newRel` | **Port** in Phase 5 |
| 1585–1634 | `newGame` | Reference for campaign state |
| 1640–1718 | `RULES`: the monolithic DM prompt | **Reference only.** The record of the competing rules that caused the stalls. Its whisper-ring and setting text is in `content/setting.js`. |
| 1719–1763 | `partyBlock`, `settingBlock`, `secretBlock` | Text extracted; `secretBlock`'s act gating is in `content/setting.js` |
| 1764–1820 | `computeReady`, `configOf`, `CONFIG_TEXT` | **Port** in Phase 5 |
| 1821–1850 | `betrayalOdds`, `maybeDecideBetrayal` | **Removed** (D7) |
| 1851–1981 | `compBlock`, `emberPrivate`, `emberCan` | Port the gating thresholds (`docs/spec/companions.md` §3), not the prose |
| 1982–2210 | `relationsBlock`, `stateBlock`, `canAdvance`, logs, `DYN_W`, `pickDynamic`, `buildDMPrompt`, `buildSummaryPrompt` | Reference. `canAdvance` informs the act-end rule (roadmap, Phase 6). Summaries are banned (principles: "summarize to save context"). |
| 2211–2513 | `applyResult`: one call's prose plus about 20 state fields | **Banned pattern** (principle 3). Its relationship clamps and caps are documented in `docs/spec/companions.md` §4. |
| 2514–2610 | `doRoll`, `postTurn`, `startCamp` | Reference |
| 2611–2662 | `getSample`, `parseJSON`, `askText`, `askJSON` | Replaced by `sample.json` (D13) |
| 2663–2736 | `Store`: saves in `db`, with a `localStorage` fallback | **Port** in Phase 4 (D11) |
| 2737–2837 | `NOVELTY`, `FEM`, `Speech` (text-to-speech) | Parked (D24) |
| 2838–2917 | Ability ownership and use tracking, HP | **Port** in Phase 3 |
| 2918–3046 | `MAP_W`/`MAP_H` grid, `normMap`, `normElements`, `validateEncounter`, `MAP_SPEC` | **Banned:** coordinate sketches that didn't follow the real layout (D9) |
| 3047–3148 | `buildEncounterPrompt`, `ROOM_KINDS` | **Banned:** ELEMENTS / FACTS / CLUES / PATHS. `ROOM_KINDS` is in `content/setting.js`. |
| 3149–3303 | `buildRoomPrompt`, `pacingNote`, `encounterBlock`, `roomBlock`, `buildRefereePrompt` | **Banned:** the pacing note and the referee AI |
| 3304–3523 | `applyProgress`, `prepEncounter`, `applyCombat`, `syncDown`, `endCombat`, `resolveStrike` | Combat: reference for Phase 3. Progress: banned (principle 6). |
| 3524–3722 | `PHOTO_ID`, `LISA_IMG`, the photo prompt skeleton | Parked (D24) |

### UI (lines 3723–5761)
| Lines | Component | Status |
|---|---|---|
| 3745–3943 | `Sigil`, `App`, `Title` | Port: save slots, the title screen, the relationship sigil |
| 3944–4063 | `Setup` | Port: name, class, faction, two companions |
| 4064–4993 | `Game` | Not reused: built around one chat log (`docs/spec/ui.md`) |
| 4994–5077 | `VoicePicker` | Parked (D24) |
| 5078–5236 | `Entry`, `Modal` | Reference |
| 5237–5398 | `MapSVG` | Not reused (D9) |
| 5399–5761 | `AbilitySheet`, `PhotoCard`, `Bar`, `Drawer` | Port the ability sheet, bars and drawer; the photo card is parked |

The CSS theme tokens at the top of `gravenhold.html` (light and dark) are worth porting as is.

---

## Banned patterns, and why

| Pattern | Where | Why |
|---|---|---|
| Solution paths (`PATHS`), facts with clue lists | `buildEncounterPrompt` | An answer key drags the DM toward steering players onto it |
| A pacing note ("stalled? add a complication") | `pacingNote` | Very likely caused the drumroll; the same symptom needs opposite cures |
| A referee AI supervising the DM | `buildRefereePrompt` | Rules correcting rules: prompt iteration had hit its ceiling |
| Group-dynamic hints and a hidden deliberation phase | `DYN_PHASE`, `pickDynamic`, `RULES` | Scripted the companions' talk from outside |
| "Floor" rules for companions ("push the scene forward", "never hand him the floor") | `RULES`, `compBlock` | Named causes of the stall |
| One call returning prose and all state changes | `applyResult` | Prose invents state (principle 3) |
| A grid sketch as the map, with the prose as the real layout | `MAP_SPEC`, `MapSVG` | The layout drifted and the map was useless (D9) |
| Rolling summaries of the story | `buildSummaryPrompt` | Every compression loses information for good |
| Companion betrayal | `maybeDecideBetrayal` | Removed (D7) |
