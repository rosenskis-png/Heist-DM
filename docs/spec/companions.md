# Companions

The pillar Gravenhold proved (D23). This file covers what a companion is in data, how she behaves at the table, the relationship model, and how to add or remove one (D8). Data: `content/companions/`.

---

## 1. At the table

Companions act like fellow players: opinions, reasoning, disagreement, in-character values. They **never** hold the plan hostage, gatekeep, invent conditions, or take actions that aren't on the card. If one won't do something, she takes a **stance** and the player rules on it.

- **Over the rings:** time is paused. Both companions share one call (`docs/spec/calls/party.md`, D132), after the DM rules on what the player did, when the player talks to the party, and when the plan is talked over; each is free to pass. They see what the player sees, including the draft and the DM's card. Each thinks about a plan through her own `planning` bias (D38), and they say one thing between them, which answers the player when he's said something to them (D137).
- **Private channel:** only the addressed companion is called. The whisper rings make this possible in the fiction (`content/setting.js`).
- **Stances:** refuse, insist, or conditional, with conditional triggers written in the condition language. They're traced to her profile (beliefs, despises, rules). A stance is for a line she holds, said once; disagreeing about tactics is just talk (D175). Only the player writes plan content.
- **Campfire:** between encounters, with the full relationship picture: talk and action together, one on one or with both, one call per companion (D45; `docs/spec/calls/campfire.md`).

## 2. What a companion file holds

One file per companion, `content/companions/<id>.js`. Field groups:

| Group | Fields |
|---|---|
| Identity | `id`, `name`, `race`, `age`, `role`, `color`, `rate` (speech rate for reading aloud, D104), `blurb` |
| Fantasy | `fantasy`, `heatMode`, `pursuit`, `heatActs`, `turnoffs`, `flattery`, `payoff` (`at`, `minTurns`, `minAct`, `scene`), `leanFromHeat` |
| Look | `look` (her body and face), `outfit` (what she usually wears), optionally `wardrobe`: other outfits she owns from the start (§7), and optionally `photo`: her picture identity, the fixed words in every photo prompt of her (`docs/spec/calls/photo.md`, D170) |
| Story | `why`, `first`, `quest`, `questAct`, and `needs`: what her story needs the world to hold, as keys of a world's `features` (D150) |
| Depth | `beliefs`, `admires`, `despises`, `askAbout`, `other` (how she wants the other companion treated), `suppressed`, `hidden`, `deep`, `dark`, `darkTriggers` |
| Reactions | `react`: one line per configuration (§4) |
| How she gets what she wants | `boundaries` (what she does with a no), `honesty` (when and how she lies), `means` (what she'll do), `whenRefused` (what she shows, and what she resolves inside). Fern is the honest baseline (D107). |
| Voice and limits | `voice`, `rules` (hard rules), `skills` (roll modifiers) |
| Planning | `planning`: `sees` (what she reliably notices about a plan), `misses` (what she tends not to consider), `reaches_for` (the kind of plan she proposes first), `hunch` (a belief about the situation, phrased as a hint, that steers what her call attends to). Her call gets `hunch` and `reaches_for` only; `sees` and `misses` describe her bias for the designer and the bench (D50). How she thinks in the huddle (D38; `docs/design/companion-craft.md` §6). |
| Abilities | `abilities`: `combat`, `noncombat`, `limits`. Exact, conditional and limited; the main way a plan handles a risk. Each ability's `declared` block is what the engine tracks (D30). |
| Special cases | optional, declared: `tie`, `secondVoice`, `extraBeats`, `stageLabels`, `notes` (§6, D81). |

The exact shape is `schemas/companion.js`, and `node --test` checks every file in the registry against it (D82).

Text inside profiles may mention other companions by name (Fern's rule about Lisa and her sister). That's fine: it's characterization, not code.

**Her text never names the world.** Where her story names the place she's escaping, it uses a role slot the world fills: `{place}`, `{kind}`, `{builders}`, `{builders_adj}`, `{rulers}`, `{commander}`, `{master}`, `{working}`, `{depths}` and `{sanctum}`, capitalised (`{Master}`) to start a sentence, with a possessive after it if needed (`{master}'s`). So the same hand-written companion works in any world, and no AI rewrites her (`docs/spec/campaign.md` §9, D150).

## 3. What the companion call sees, and when

Gravenhold revealed parts of a profile as the relationship grew. Keep that, as engine-side gating: like an act gate, a field that isn't unlocked yet is absent from context, not forbidden by a rule.

Each channel sends an allowlist of fields (D59).
- **In encounters** (the huddle, private channels, and the DM's calls that voice her), a companion is her brief (D79): name, race, role, `voice`, `beliefs`, `rules`, `planning.hunch` and `reaches_for`, skills and abilities (effect text only), and her standing: a mood from warm, glad, steady, wary, grumpy, jealous, with why, and what she has learned. With it go the special cases she acts on in the scene (D114): what she has on, her second voice, her shape, and her tie without its secret. Her `pursuit` stays at the campfire: in a room she's a friend at the table, talking the problem over in plain speech (D175). Code: `briefProfile` and `encounterCases` in `src/context.js`.
- **At the campfire** she gets her full profile: identity, fantasy, look, voice, depth, rules, skills and abilities, gated as below, plus her special cases as resolved for the party and scene (§6). The campfire writes her standing and what she learned. Code: `ownProfile` in `src/context.js`.

Fields on no list, such as `color`, `rate`, `leanFromHeat`, `photo` (only the photo call reads it), and any special-case data the engine hasn't resolved, are never sent.

The gates are data (`reveal` in `content/relationship.js`, D80):

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

Ported from Gravenhold (legacy `newRel`, `computeReady`, `configOf`, `stageLabel`, `progress`, and the scoring in `applyResult`) with two changes: scoring input (§5), and no betrayal (D7). Every number and label below is in `content/relationship.js` (D80); the rules are `src/campaign/relationship.js`, pure, tested by `test/companions.test.js`.

**Tracks, per companion**
- `heat` 0–12: the shallow fulfilment, earned fairly quickly. Its payoff happens only when READY allows it.
- `intimacy` 0–10: the slow burn: opening up, vulnerability, love.
- `regard` −10..10: general approval. At −5 or below she is hurt.
- Heat, intimacy and regard below +2 rise by 1 after any campfire answer that doesn't change them (D93).
- `lean` 0–10: toward her dark branch.
- Flags: `payoff`, `involved` (lovers now), `vuln`, `deep`, `bond`, `hurt`, `manifest`, plus the memory of what she leaves unsaid.
- `believes`: about him and the other companion, `past` (ever involved) and `current` (involved now). Only her own campfire output, and the `in_the_open` beat, change it; it can be wrong (D96).
- `storm`: her level on a declared escalation, 0 when calm (D97).
- `noticed`: asides of the other's she caught, for her next call only (D95).
- `agenda`: her private plan in a line, set by her campfire output and seen only by her own calls (D107).
- `form` (a shapeshifter's current look), `knowsShifter` (she knows the other can shift), `absent` (turns someone wore her face) (D101).

**Per companion, toward the other** (D92): her view of the other on three axes, `affection`, `respect` and `trust`, each −10..10, starting from the pair's `start` in `content/pairs.js` (one number for both or each one's own view keyed by id; a view is one number, meaning affection, or the axes) or from a tie (§6). Her read of the other's view on the same axes starts right, unless the other declares a mask, and only her own campfire output moves it, so it can be wrong (D91). Each moves at most 2 an answer, less within declared `limits`. No call or gate ever sees the other's real feelings.

**Party-level:** `open` (where everyone stands with him is out in the open), `shared` (all three are openly together), the campaign `turn` (one per exchange with the player), the act, and the seeded roll for catching asides.

**What her call reads** (D94): every number with a stance sentence from `stances` in `content/relationship.js`.

**Caps:** each turn's change is clamped per track (heat −2..2, intimacy −3..2, regard −3..2, lean 0..2). Heat and intimacy gains are capped at +4 per encounter, reset when an encounter ends. After her payoff, heat keeps moving; for a companion with `leanFromHeat`, heat gained then also feeds lean, and intimacy gained after the payoff draws lean back down (D93). She's hurt when regard reaches −5 or intimacy drops 3 in one turn.

**How the room went** (D131, D146): when a room ends, `endEncounter` reads the verdict's rating (`morale` in `content/relationship.js`) and moves each companion's regard for him, and her affection and trust toward the other, by up to 2 either way; then each companion's own reactions in the verdict apply to her. Her read of the other's view doesn't move; that's hers to revise at camp.

**READY** (code decides what may happen):
- `payoff` once heat ≥ `payoff.at`, the turn count ≥ `minTurns`, and the act ≥ `minAct`;
- `vulnerability` at intimacy ≥ 6;
- `deep` (after the payoff) or `bond` (without it) at intimacy ≥ 9, after vulnerability.

Nothing is ready while she's hurt.

**Beats** (reported by the campfire when they really happen on the page, D80): the READY ones, plus rupture, repair (only while hurt), breakup (while involved), rekindle (after a breakup), in_the_open (with all three present, until it has happened), shared (both involved, and no tie rules it out), and declared beats (§6). The engine applies them in order, each checked when it's reached, so a payoff can make the beat that follows it possible in the same scene. A beat that isn't allowed goes back for the one retry (D13).

**Configurations** (D96): the love-triangle state as she sees it, from her own involvement and her beliefs, never the truth about him and the other. One of: chosen, former, cheatedOn, affair, rivals, shared, thirdwheel, secondfiddle, ignored, open. Each companion's `react` gives her reaction to each except open (former is optional).

**Stage labels** (for the UI): Strangers → Friends / Drawn → Burning → Lovers / Opening up → Bonded / In love (Indulging and Consumed when lean runs high), with Hurt overriding. A companion can override the wording (§6).

## 5. Scoring input (D20)

Gravenhold's DM scored each companion every turn: heat −2..2, depth −3..2, dark 0..2, regard −3..2, with a six-word reason. Now each companion scores herself, through her own call:

- A reaction is tagged with the profile field it touches (`heatActs`, `turnoffs`, `admires`, `despises`, `darkTriggers`, `suppressed`), which item, a sign, an intensity (1–2), and a one-line reason.
- The engine maps each field to a track (`heatActs` and `turnoffs` → heat; `admires`, `despises` and `suppressed` → intimacy and regard; `darkTriggers` → lean) and applies the caps.
- What happened in a plan (a killing, a stance overridden) reaches her through the DM's narration. She reacts at the next huddle.
- Campfire returns relationship changes directly, within the same caps.

## 6. Adding or removing a companion (D8)

**Add:** write `content/companions/<id>.js` with the fields in §2, and add one line to `content/companions/index.js`. Optionally add pair dynamics with existing companions to `content/pairs.js`. `node --test` tells you what's missing or misspelled.

**Change:** her look, outfit, voice, personality and abilities are all fields in her file. Nothing else reads them by name, so editing the file is the whole change. The Dressing Room (`bench/dressing.html`, D170) shows what each call is sent about her appearance, and tries a change before it's made.

**Remove:** delete the file and its registry line. Entries that name her in `pairs.js` or in another companion's `tie.by` are simply ignored.

**Rules that keep this true** (checked by `test/companions.test.js`, D82)
- Engine code, schemas and prompts never name a companion.
- A missing pair entry is normal: the pair starts at 0, and each companion judges the dynamic from her own profile and the other's public profile (D83).
- A companion that depends on another declares the dependency in her own file.

**Special cases** (D81). Each is a general mechanism; any companion can declare one. The engine resolves it for the current party and scene, and only the result reaches a prompt.

| Declaration | What it does | Example |
|---|---|---|
| `tie: { required, set, append, toPartner, triangle, start, partnerStart, mask, limits, secret, mirrorsWhenOpen, by: { <other id>: { set, append, gift, bond, partnerReacts, secret, photo } } }` | She exists in relation to another companion. With that companion in the party, `set` replaces her fields and `append` extends them (the tie's own, then the entry's), with `{partner}` filled in. Her call gets `bond` and `gift`; the other's call gets `toPartner`, `bond`, `partnerReacts` and whether she knows. `triangle.shared: false` rules out the shared beat. `start` and `partnerStart` give both starting views, `mask` the view her partner believes she holds, `limits` cap her view of her partner until their `until` beat, `secret` reaches only her call, and `mirrorsWhenOpen` hands her her partner's pursuit once everything is in the open (D99). With `required`, she can't join a party without a matching entry, and the setup screen doesn't offer it (`pairings` in `src/campaign/roster.js`). `photo` replaces fields of her picture identity with that partner, for the photo call only (D170). | Lisa and her older sister |
| `secondVoice: { id, name, voice, look, relayed, admires, despises, manifestsAfter?, inCompany?, beat, photo? }` | A second character in her, with her own tastes (`admires`, `despises`), which her call always gets. In company, her call gets `relayed` and the companion speaks of her in the third person. In private she speaks with her own voice, and the campfire may give her lines (`second_voice`). In person and in private she may take her own body (`look`); whether she does is the scene's call (D87). With the optional `manifestsAfter`, she can only once that flag is set or ready. With the optional gate `inCompany`, she may also speak and take her own body in company, in person (D98). `beat` is reported the first time she does. The optional `photo` is a line that stands her beside the companion in a photo (D170). | Nadia's Ember |
| `extraBeats: [{ id, cooldown?, once?, when?, text, cooling? }]` | A beat of her own, allowed once `cooldown` campaign turns have passed since the last, only once with `once`, and only while the gate `when` holds. Her campfire call gets `text` while it's allowed and `cooling` while it isn't. | Lisa's reconciliation |
| `escalation: { name, tiers, rises, calms, actsOnOther? }` | A state that builds and falls slowly (D97): `rises` says what starts and raises it (D109); her call sees her level and every tier, says where it stands after each answer, and it falls at most one level an answer. From `actsOnOther`, she may act physically on the other companion. | Ruby's storms |
| `inOthers: { affection, respect, trust }`, `recalibrates` | How she judges the other companion on each axis, and how she takes a wrong read (D94). | Fern loses respect, never fondness |
| `limits: { <axis>: [lo, hi], perScene }` | Limits on her view of any other companion (D92). | Fern's affection never falls below 0 |
| `mask` | The view others believe she holds of them at the start (D99). | |
| `fixed: { <track>: value }`, `reveal: { <field>: gate }` | Tracks that never move, and her own gates for gated fields (D100). | The zealot's devotion |
| `shapeshift: { text, impersonation: [{ chance, when? }] }` | She can change her shape, reporting her new look as `form`, and may come in the other companion's place when the player sits with that one alone (D101). A tie entry's `grants` gives a special case with one partner only. | The shapeshifter, and Lisa as her sister |
| `stageLabels: { <stage>: label }` | Her own wording for any stage in `content/relationship.js`. | Any companion's own stage names |
| `notes: [{ when, text }]` | Text her call gets only while the gate `when` holds, in the same form as the reveal gates: a list of alternatives, each a set of terms on her tracks and flags, her view of the other (`affection`, `respect`, `trust`), her read of the other's (`readAffection`, `readRespect`, `readTrust`, which may be wrong; D91), `believesPast`, `believesCurrent`, `open`, `storm`, `knowsShifter`, `turn`, `act`, `toPayoff` or `actsToQuest`. | Fern makes no advances until he shows interest |

## 7. Wardrobe (D86)

An outfit is a name and a description. Each companion owns her `outfit` (as "usual") and anything in her file's `wardrobe`, and wears one of them; in a tie's party, the tie's outfit is her usual one. A new game starts her in her file's `wears` (an outfit she owns from the start), or her usual one. Her profile in every call describes what she has on, so changing it changes how she's described.

She comes to own more in play (a gift, a find, a purchase, and the one outfit every room holds, D121) through `addOutfit`, and changes through `equip`: from the UI, or at the campfire, where her call gets the id of what she has on and the id and description of each other outfit she owns, and returns `outfit` (an id she owns, or null). Code: `src/campaign/wardrobe.js`; the state lives with the relationship state, and holds only what play changes: what she has on and what she's gained in play. The outfits her file gives her are read from her file (with her live looks, §8) every time, so a change to them reaches every save (D171). If what she has on is taken away, she's in her usual outfit. Getting wet, torn or half-undressed is texture, not a change of outfit.

## 8. Live looks (D171)

How a companion looks can change without a republish. The game's db holds live looks: for each companion, changes to the appearance fields of her file (`look`, `outfit`, `wears`, her `wardrobe`, `photo`, `secondVoice.look` and `photo`, and what a tie changes of these), by path, with null taking a file outfit away. The game lays them over the roster every time it loads (`withLooks` in `src/campaign/looks.js`), before it builds the party, so new games and loaded saves alike use them; saves keep only ids and play state, never her looks. Changes to any other field, or that make her file fail its schema, are left out and reported, so a bad edit can't break a game.

They're made in the Dressing Room (`src/ui/dressing.js`), mounted in the game as a dev panel, where a draft can be applied, reverted, or sent to her notes for the design thread. Her file stays the base: the design thread folds live looks into it now and then, and clears them.

## 9. Not carried over
- Betrayal (D7).
- The group-dynamic hints (`DYN_PHASE`, `pickDynamic`) and the hidden deliberation phase. Both shaped the companions' talk from outside; the huddle now lets them talk as themselves.
- The DM writing companion dialogue inside narration. The companions' own talk happens in their own calls.
