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
| Look | `look` (her body and face), `outfit` (what she usually wears), and optionally `wardrobe`: other outfits she owns from the start (§7) |
| Story | `why`, `first`, `quest`, `questAct` |
| Depth | `beliefs`, `admires`, `despises`, `askAbout`, `other` (how she wants the other companion treated), `suppressed`, `hidden`, `deep`, `dark`, `darkTriggers` |
| Reactions | `react`: one line per configuration (§4) |
| Voice and limits | `voice`, `rules` (hard rules), `skills` (roll modifiers) |
| Planning | `planning`: `sees` (what she reliably notices about a plan), `misses` (what she tends not to consider), `reaches_for` (the kind of plan she proposes first), `hunch` (a belief about the situation, phrased as a hint, that steers what her call attends to). Her call gets `hunch` and `reaches_for` only; `sees` and `misses` describe her bias for the designer and the bench (D50). How she thinks in the huddle (D38; `docs/design/companion-craft.md` §6). |
| Abilities | `abilities`: `hp`, `combat`, `noncombat`, `limits`. Exact, conditional and limited; the main way a plan handles a risk. Each ability's `declared` block is what the engine tracks (D30). |
| Special cases | optional, declared: `tie`, `secondVoice`, `extraBeats`, `stageLabels`, `notes` (§6, D66). |

The exact shape is `schemas/companion.js`, and `node --test` checks every file in the registry against it (D67).

Text inside profiles may mention other companions by name (Fern's rule about Lisa and her sister). That's fine: it's characterization, not code.

## 3. What the companion call sees, and when

Gravenhold revealed parts of a profile as the relationship grew. Keep that, as engine-side gating: like an act gate, a field that isn't unlocked yet is absent from context, not forbidden by a rule.

Each channel sends an allowlist of fields (D59): the huddle and the campfire send identity, fantasy, look, voice, depth, rules, skills and abilities (effect text only), gated as below, plus her special cases as resolved for the party and scene (§6). The huddle adds `planning.hunch` and `reaches_for`. Fields on no list, such as `color`, `rate`, `leanFromHeat`, a tie's `image`, and any special-case data the engine hasn't resolved, are never sent. Code: `ownProfile` in `src/context.js`.

The gates are data (`reveal` in `content/relationship.js`, D65):

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

Ported from Gravenhold (legacy `newRel`, `computeReady`, `configOf`, `stageLabel`, `progress`, and the scoring in `applyResult`) with two changes: scoring input (§5), and no betrayal (D7). Every number and label below is in `content/relationship.js` (D65); the rules are `src/campaign/relationship.js`, pure, tested by `test/companions.test.js`.

**Tracks, per companion**
- `heat` 0–12: the shallow fulfilment, earned fairly quickly. Its payoff happens only when READY allows it.
- `intimacy` 0–10: the slow burn: opening up, vulnerability, love.
- `regard` −10..10: general approval. At −5 or below she is hurt.
- `lean` 0–10: toward her dark branch.
- Flags: `payoff`, `vuln`, `deep`, `bond`, `hurt`, `manifest`, plus the memory of what she leaves unsaid.

**Party-level:** the pair value (−10..10, starting from `content/pairs.js`, moved at most 1 a scene by the campfire); `knows` (the other companion knows about an involvement); `shared` (all three are openly together); the campaign `turn` (one per exchange with the player) and act.

**Caps:** each turn's change is clamped per track (heat −2..2, intimacy −3..2, regard −3..2, lean 0..2). Heat and intimacy gains are capped at +4 per encounter, reset when an encounter ends. After her payoff, heat stops rising; for a companion with `leanFromHeat` it feeds lean instead, and intimacy gained after the payoff draws lean back down. She's hurt when regard reaches −5 or intimacy drops 3 in one turn.

**READY** (code decides what may happen):
- `payoff` once heat ≥ `payoff.at`, the turn count ≥ `minTurns`, and the act ≥ `minAct`;
- `vulnerability` at intimacy ≥ 6;
- `deep` (after the payoff) or `bond` (without it) at intimacy ≥ 9, after vulnerability.

Nothing is ready while she's hurt.

**Beats** (reported by the campfire when they really happen on the page, D65): the READY ones, plus rupture, repair (only while hurt), discovered (once someone is involved and the other doesn't know), shared (both involved, and no tie rules it out), and declared beats (§6). The engine applies them in order, each checked when it's reached, so a payoff can make the beat that follows it possible in the same scene. A beat that isn't allowed goes back for the one retry (D13).

**Configurations:** the love-triangle state, computed from both companions' payoff flags (and which came first), `knows` and `shared`, unless a tie overrides it (§6). One of: chosen, thirdwheel, secondfiddle, shared, cheatedOn, affair, rivals, ignored, open. Each companion's `react` gives her reaction to each except open.

**Stage labels** (for the UI): Strangers → Friends / Drawn → Burning → Lovers / Opening up → Bonded / In love (Indulging and Consumed when lean runs high), with Hurt overriding. A companion can override the wording (§6).

## 5. Scoring input (D20)

Gravenhold's DM scored each companion every turn: heat −2..2, depth −3..2, dark 0..2, regard −3..2, with a six-word reason. Now each companion scores herself, through her own call:

- A reaction is tagged with the profile field it touches (`heatActs`, `turnoffs`, `admires`, `despises`, `darkTriggers`, `suppressed`), which item, a sign, an intensity (1–2), and a one-line reason.
- The engine maps each field to a track (`heatActs` and `turnoffs` → heat; `admires`, `despises` and `suppressed` → intimacy and regard; `darkTriggers` → lean) and applies the caps.
- Events from plan execution (a step tagged `lethal`, a stance overridden) reach her through the event log. She reacts at the next huddle or world turn.
- Campfire returns relationship changes directly, within the same caps.

## 6. Adding or removing a companion (D8)

**Add:** write `content/companions/<id>.js` with the fields in §2, and add one line to `content/companions/index.js`. Optionally add pair dynamics with existing companions to `content/pairs.js`. `node --test` tells you what's missing or misspelled.

**Change:** her look, outfit, voice, personality and abilities are all fields in her file. Nothing else reads them by name, so editing the file is the whole change.

**Remove:** delete the file and its registry line. Entries that name her in `pairs.js` or in another companion's `tie.by` are simply ignored.

**Rules that keep this true** (checked by `test/companions.test.js`, D67)
- Engine code, schemas and prompts never name a companion.
- A missing pair entry is normal: the pair starts at 0, and each companion judges the dynamic from her own profile and the other's public profile (D68).
- A companion that depends on another declares the dependency in her own file.

**Special cases** (D66). Each is a general mechanism; any companion can declare one. The engine resolves it for the current party and scene, and only the result reaches a prompt.

| Declaration | What it does | Example |
|---|---|---|
| `tie: { required, set, append, toPartner, triangle, by: { <other id>: { set, append, gift, bond, partnerReacts, image } } }` | She exists in relation to another companion. With that companion in the party, `set` replaces her fields and `append` extends them (the tie's own, then the entry's), with `{partner}` filled in. Her call gets `bond` and `gift`; the other's call gets `toPartner`, `bond`, `partnerReacts` and whether she knows. `triangle.bothInvolved` gives the configuration for each side when both are involved, and `triangle.shared: false` rules out the shared beat. With `required`, she can't join a party without a matching entry, and the setup screen doesn't offer it (`pairings` in `src/campaign/roster.js`). `image` is for the parked portraits and reaches no prompt. | Lisa and her older sister |
| `secondVoice: { id, name, voice, look, relayed, admires, despises, manifestsAfter, beat }` | A second character in her, with her own tastes (`admires`, `despises`), which her call always gets. In company, her call gets `relayed` and the companion speaks of her in the third person. In private she speaks with her own voice, and the campfire may give her lines (`second_voice`). In person and in private, once `manifestsAfter` is set or ready, she's there in her own body (`look`), and `beat` may be reported once. | Nadia's Ember |
| `extraBeats: [{ id, cooldown, text, cooling }]` | A beat of her own, allowed once `cooldown` campaign turns have passed since the last. Her campfire call gets `text` while it's allowed and `cooling` while it isn't. | Ruby's storm |
| `stageLabels: { <stage>: label }` | Her own wording for any stage in `content/relationship.js`. | Serena's "The chase", "Almost caught" |
| `notes: [{ when, text }]` | Text her call gets only while the gate `when` holds, in the same form as the reveal gates: a list of alternatives, each a set of terms on her tracks and flags, `turn`, `act`, `toPayoff` or `actsToQuest`. | Fern makes no advances until he shows interest |

## 7. Wardrobe (D71)

An outfit is a name and a description. Each companion owns her `outfit` (as "usual") and anything in her file's `wardrobe`, and wears one of them; in a tie's party, the tie's outfit is her usual one. Her profile in every call describes what she has on, so changing it changes how she's described.

She comes to own more in play (a gift, a find, a purchase) through `addOutfit`, and changes through `equip`: from the UI, or at the campfire, where her call lists what she could change into and may return `outfit`. Code: `src/campaign/wardrobe.js`; the state lives with the relationship state. Getting wet, torn or half-undressed is texture, not a change of outfit.

## 8. Not carried over
- Betrayal (D7).
- The group-dynamic hints (`DYN_PHASE`, `pickDynamic`) and the hidden deliberation phase. Both shaped the companions' talk from outside; the huddle now lets them talk as themselves.
- The DM writing companion dialogue inside narration. The narration call gets voice notes for montage lines, but the companions' own talk happens in their own calls.
