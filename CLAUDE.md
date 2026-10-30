# Working in this repo

## Read first
1. `README.md`: the vision and the map.
2. `docs/principles.md`, especially the reflexes to resist, before proposing any system or mechanic.
3. `docs/roadmap.md`: the current phase and its open questions.
4. `docs/decisions.md`: before reopening anything, read why it was decided.
5. Only the `docs/spec/` files your task touches. They're split small so you can load just your slice.

Don't design from `legacy/`. Use `legacy/README.md` to find what to port and what is banned.

`Dn` anywhere in the docs means entry n in `docs/decisions.md`.

## Where things go
| It's… | It goes in… |
|---|---|
| An open question | `docs/roadmap.md`, under the phase that must answer it, with a recommendation |
| A settled decision | A new entry in `docs/decisions.md`, plus the spec change, in the same commit |
| How the game works now | `docs/spec/`, one home per fact |
| The exact shape of a packet, card or call output | `schemas/`; the spec links to it |
| Encounter design theory | `docs/design/encounter-craft.md` |
| How to play the companions (tone, romance, table behaviour) | `docs/design/companion-craft.md` |
| Game data | `content/` |
| Prompt text | `prompts/<call>.md` |
| A worked example or test fixture | `fixtures/` |

## Rules
- **One home per fact.** Link to it; don't restate it.
- **Specs describe only the current design.** No version numbers in filenames, no "previously" or "removed" text. History goes in `docs/decisions.md`; old text is in git.
- **One name per AI call everywhere:** `docs/spec/calls/<call>.md`, `schemas/calls/<call>.js`, `prompts/<call>.md`, and later `src/calls/<call>.js` and its tests.
- **`node --test` passes before every commit.**
- **Never edit an old decision.** Supersede it with a new one.
- **The roster is open** (D8). Engine code and prompts never name a companion id. A companion is one file in `content/companions/` plus one line in its `index.js`.
- **No companion betrays the party** (D7).
- **The engine is pure** (D12): no DOM, no AI calls, seeded randomness, runnable with `node --test`.
- **`legacy/` is read-only.**
