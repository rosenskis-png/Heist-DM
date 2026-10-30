# Companions

The pillar Gravenhold proved (D23). This file covers what a companion is in data, how she behaves at the table, the relationship model, and how to add or remove one (D8). Data: `content/companions/`.

---

## 1. At the table

Companions act like fellow players: opinions, reasoning, disagreement, in-character values. They **never** hold the plan hostage, gatekeep, invent conditions, or take actions that aren't on the card. If one won't do something, she takes a **stance** and the player rules on it.

- **Huddle:** time is paused. Each companion gets her own call; the second sees the first's reply (`docs/spec/calls/companion.md`). She sees what the player sees, including the draft card and the priced card. She thinks about a plan through her `planning` bias (D38), and the engine picks one of three things she might say (D40).
- **Private channel:** only the addressed companion is called. The whisper rings make this possible in the fiction (`content/setting.js`).
- **Stances:** refuse, insist, or conditional, with conditional triggers written in the condition language. They're traced to her profile (beliefs, despises, rules). Only the player writes plan content.
- **Campfire:** between encounters, with the full relationship picture: talk and action together, one on one or with both, one call per companion (D45; `docs/spec/calls/campfire.md`).

## 2. What a companion file holds

One file per companion, `content/companions/<id>.js`. Field groups:

| Group | Fields |
|---|---|
| Identity | `id`, `name`, `race`, `age`, `role`, `color`, `rate` (speech rate, for the parked voice feature), `blurb` |
| Fantasy | `fantasy`, `heatMode`, `pursuit`, `heatActs`, `turnoffs`, `flattery`, `payoff` (`at`, `minTurns`, `minAct`, `scene`), `leanFromHeat` |
| Look | `look`, `outfit` |
| Story | `why`, `first`, `quest`, `questAct` |
| Depth | `beliefs`, `admires`, `despises`, `askAbout`, `other` (how she wants the other companion treated), `suppressed`, `hidden`, `deep`, `dark`, `darkTriggers` |
| Reactions | `react`: one line per configuration (§4) |
| Voice and limits | `voice`, `rules` (hard rules), `skills` (roll modifiers) |
| Planning | `planning`: `sees` (what she reliably notices about a plan), `misses` (what she tends not to consider), `reaches_for` (the kind of plan she proposes first), `hunch` (a belief about the situation, phrased as a hint, that steers what her call attends to). Her call gets `hunch` and `reaches_for` only; `sees` and `misses` describe her bias for the designer and the bench (D50). How she thinks in the huddle (D38; `docs/design/companion-craft.md` §6). |
| Abilities | `abilities`: `hp`, `combat`, `noncombat`, `limits`. Exact, conditional and limited; the main way a plan handles a risk. Each ability's `declared` block is what the engine tracks (D30). |
| Special cases | currently inline, e.g. Nadia's `emberVoice` and `emberLook`, and Lisa's `sisterNote` and `variants`. Phase 5 turns these into declared data (§6). |

Text inside profiles may mention other companions by name (Fern's rule about Lisa and her sister). That's fine: it's characterization, not code.

## 3. What the companion call sees, and when

Gravenhold revealed parts of a profile as the relationship grew. Keep that, as engine-side gating: like an act gate, a field that isn't unlocked yet is absent from context, not forbidden by a rule.

Each channel sends an allowlist of fields (D59): the huddle sends identity, fantasy, look, voice, depth, rules, skills, abilities (effect text only) and `planning.hunch` and `reaches_for`, gated as below. Fields on no list, such as `color`, `rate`, `leanFromHeat` and undeclared special cases, are never sent.

| Field | Sent when (Gravenhold's thresholds) |
|---|---|
| `first`, `why` | early in the campaign (Gravenhold: the first 8 turns) |
| `hidden` | intimacy ≥ 2, or after the payoff |
| `deep`, `dark` | after the payoff, or intimacy ≥ 5, or lean ≥ 3 |
| `payoff.scene` | heat within 2 of `payoff.at`, before the payoff |
| `quest` | from the act before `questAct` |
| `planning.sees`, `planning.misses` | never (D50) |
| everything else in the profile | always |

**Don't port Gravenhold's instruction prose** (`compBlock`, legacy lines 1851–1970). It mixes character data with "floor" rules. Two kinds need separating (D27):
- **Banned:** "they push the scene forward" and "never hand him the floor". These are among the rules that caused the stalls.
- **Kept, narrowed:** "PURSUIT (her floor, every scene)" and "dominant characters take control of scenes". She always plays her fantasy, and a dominant companion leads the conversation and the romance, never the plan or the world.

Port the fields; write the judgment fresh in `prompts/companion.md`, drawing on `docs/design/companion-craft.md`.

## 4. Relationship model

As Gravenhold implemented it (legacy `newRel`, `computeReady`, `configOf`, `stageLabel`, `progress`, and the scoring in `applyResult`). Phase 5 ports it with two changes: scoring input (§5), and no betrayal (D7).

**Tracks, per companion**
- `heat` 0–12: the shallow fulfilment, earned fairly quickly. Its payoff happens only when READY allows it.
- `intimacy` 0–10: the slow burn: opening up, vulnerability, love.
- `regard` −10..10: general approval. At −5 or below she is hurt.
- `lean` 0–10: toward her dark branch.
- Flags: `payoff`, `vuln`, `deep`, `bond`, `hurt`, `manifest`, plus the memory of what she leaves unsaid.

**Party-level:** the pair value (−10..10, starting from `content/pairs.js`); `knows` (the other companion knows about an involvement); `shared` (all three are openly together).

**Caps:** each turn's change is clamped per track. Heat and intimacy gains are capped at +4 per encounter; Gravenhold reset them when an encounter ended.

**READY** (code decides what may happen):
- `payoff` once heat ≥ `payoff.at`, the turn count ≥ `minTurns`, and the act ≥ `minAct`;
- `vulnerability` at intimacy ≥ 6;
- `deep` (after the payoff) or `bond` (without it) at intimacy ≥ 9, after vulnerability.

Nothing is ready while she's hurt.

**Beats** (reported when they really happen on the page): payoff, vulnerability, deep, bond, rupture, repair (only while hurt), discovered, shared, plus companion-specific beats (§6).

**Configurations:** the love-triangle state, computed from both companions' payoff flags, `knows` and `shared`. One of: chosen, thirdwheel, secondfiddle, shared, cheatedOn, affair, rivals, ignored, open. Each companion's `react` gives her reaction to each.

**Stage labels** (for the UI): Strangers → Friends / Drawn → Burning → Lovers / Opening up → Bonded / In love, with Hurt overriding. Some companions override the wording (§6).

## 5. Scoring input (D20)

Gravenhold's DM scored each companion every turn: heat −2..2, depth −3..2, dark 0..2, regard −3..2, with a six-word reason. Now each companion scores herself, through her own call:

- A reaction is tagged with the profile field it touches (`heatActs`, `turnoffs`, `admires`, `despises`, `darkTriggers`, `suppressed`), which item, a sign, an intensity (1–2), and a one-line reason.
- The engine maps each field to a track (`heatActs` and `turnoffs` → heat; `admires`, `despises` and `suppressed` → intimacy and regard; `darkTriggers` → lean) and applies the caps.
- Events from plan execution (a step tagged `lethal`, a stance overridden) reach her through the event log. She reacts at the next huddle or world turn.
- Campfire returns relationship changes directly, within the same caps.

## 6. Adding or removing a companion (D8)

**Add:** write `content/companions/<id>.js` with the fields in §2, and add one line to `content/companions/index.js`. Optionally add pair dynamics with existing companions to `content/pairs.js`, and a Lisa variant (below).

**Remove:** delete the file and its registry line. Entries that name it in `pairs.js` or Lisa's `variants` are simply ignored.

**Rules that keep this true**
- Engine code and prompts never name a companion id.
- A missing pair entry is normal: the pair starts at 0, and each companion judges the dynamic from her own profile and the other's public profile.
- A companion that depends on another declares the dependency in her own file.

**Gravenhold's special cases, to become declared data in Phase 5**

| Companion | Gravenhold's code | Proposed declaration in her file |
|---|---|---|
| Lisa | Her race, look, outfit, manner and bond depend on which companion is her older sister (`LISA_VARIANTS`, `HERITAGE`, `LISA_STYLE`); special configurations when she's involved | `variants` keyed by the sister's id (already the shape in `lisa.js`). A companion without a variant can't be paired with her, and the setup screen hides that pairing. Configuration overrides as data. |
| Nadia | Ember, a second voice: speaks only in private, manifests in her own body after the payoff (`emberVoice`, `emberLook`, the `manifest` beat) | `secondVoice: { id, voice, look, speaksWhen, manifestsAfter }` |
| Ruby | A `storm` beat with a cooldown | `extraBeats: [{ id, cooldown, effect }]` |
| Serena | Her own stage labels ("The chase", "Almost caught") | `stageLabels` overrides |
| Fern | Makes no advances until he shows interest (heat < 2, no payoff) | A gated note, using the same mechanism as §3: `notes: [{ when, text }]` |

## 7. Not carried over
- Betrayal (D7).
- The group-dynamic hints (`DYN_PHASE`, `pickDynamic`) and the hidden deliberation phase. Both shaped the companions' talk from outside; the huddle now lets them talk as themselves.
- The DM writing companion dialogue inside narration. The narration call gets voice notes for montage lines, but the companions' own talk happens in their own calls.
