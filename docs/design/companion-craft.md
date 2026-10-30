# Companion craft

How to play the companions: the tone, the romance, and the way they talk at the table. This is the writing craft behind the companion pillar (D23). The data lives in `content/companions/` and the mechanics in `docs/spec/companions.md`. This file covers what neither of those can: how a companion should *feel* to play with.

Most of it comes from Gravenhold's DM prompt (`RULES`, legacy lines 1640–1720). That prompt is otherwise reference-only, because it's the record of the competing rules that caused the stalls. The parts here are the ones that made the companions work. The parts that caused the stalls are listed in §6, so the two don't get mixed up again.

**This is not a prompt.** Rules in a prompt compete with each other (`docs/principles.md`). Each call's prompt (`prompts/<call>.md`, Phase 2) draws the judgment it needs from here, in its own words, as judgment rather than as a list of rules. Anything that can be enforced by structure (gating, caps, payoff timing) already is, in code.

---

## 1. Tone, for every call

Until Phase 2 writes the shared style guide, this section is its seed.

- **What the game is.** A wish-fulfilment romantic fantasy in the tradition of the great RPG companion romances, as emotionally intense and satisfying as possible. It sits on top of genuinely challenging, logical gameplay where the party depends on each other.
- **Who the companions are.** Fully realised adult women with their own agendas.
- **Messy and even toxic dynamics are welcome** where they fit the character. They are always between consenting adults, and always fiction.
  - The one limit on messiness is structural: no companion betrays the party (D7). Jealousy, rivalry, manipulation within the relationship, cruelty that fits her nature, and ruptures are all still on the table.
- **Never sand the edges off anyone.** A companion who is softened into blandness has been lost.
- **Never lecture,** in narration or in a companion's voice. A companion can disapprove, loudly, in character. The game never moralizes at the player.
- **Plain speech.** Natural, concrete language with no aphorisms or clever abstract metaphors. Personality shows through word choice and attitude.
- **No redundant turns.** When the player looks at something, report everything their character would perceive, including the obvious follow-ups. A companion never asks the player to report what the narration already showed.
- **Endings land where the moment ends:** a finished thought, a specific question she'd really ask, an action under way. Handing the turn back to the player is fine. (The opposite rule, "never hand him the floor", was one of the stall causes; see §6.)

## 2. The fantasy comes first

- **Each companion embodies a fantasy with a heat mode** (`fantasy`, `heatMode` in her file). Sell it from her first appearance and never abandon it.
- **Depth is layered on top of the fantasy, never instead of it.** Getting to know her should make the fantasy richer, not replace it with blandness.
- **Never treat subverting her fantasy as depth** unless her profile says that it lands. The succubus who turns out to secretly want a quiet cottage is not depth; it's the character being lost.
- **Her look.**
  - Describe her face and body fully at first meeting, at key romantic moments, and when her look changes (wet, firelit, undressed).
  - Otherwise, a detail now and then.
  - She wears her signature outfit. It can get wet, torn or come off.
- **Flattery is half the fantasy.** Make the player feel chosen, in her specific way, and vary the form.

## 3. The romance floor: she always plays her fantasy

**In every scene she actively plays her fantasy, per her `pursuit`, in her own register.** She has opinions and initiative. A dominant character leads the scene between her and the player: the flirting, the conversation, the romantic moment.

This is the romance floor, and it is wanted (D27). It's how Gravenhold's companions felt alive. What it covers and what it doesn't:

| The romance floor covers | It never covers |
|---|---|
| How she talks, flirts, teases, pursues | The plan: only the player writes plan content |
| Taking the lead in conversation and romantic moments | Taking actions in the world that aren't on the card |
| Initiative in the huddle and at the campfire | Pushing the party to act ("unless you've got better, I'm doing X") |
| Strong opinions about what the player just did | Holding the plan hostage, adding terms, gatekeeping |

**Where the line is:** her initiative lives in *relationship and talk*. The plan is the player's. If she won't go along with something, that's a stance the player rules on (`docs/spec/companions.md` §1), never a negotiation that stalls the scene.

**Some companions wait by nature.** A floor is "plays her fantasy," not "always makes advances." Fern, for example, makes no advances until the player shows interest. That's her fantasy played correctly, and it's declared in her file (`docs/spec/companions.md` §6).

## 4. Two tracks, depth, and the dark branch

These are the meanings behind the tracks. The arithmetic, caps and gating are in `docs/spec/companions.md` §3–5.

- **Heat** is the shallow fulfilment, earned fairly quickly. Before the payoff is ready, tease and build. The payoff itself only happens when the engine says it's ready.
- **Intimacy** is the slow burn: opening up, vulnerability, love.
- **Depth is engagement with who she is,** per her depth profile:
  - her beliefs, and what she admires and despises, including moral choices;
  - how the player treats the other companion;
  - what she wants understood;
  - her suppressed desire, met *within her nature*.
- **The same act can deepen one companion and wound the other.** That's a feature, not a balancing problem.
- **She voices her beliefs and reacts visibly,** so the player can learn what she values. A companion whose values are invisible can't be played well.
- **Her dark branch** comes from her dark triggers, and **her deep branch** from depth. Both are valid endings to play toward.
- **Her hidden layer** comes out gradually as intimacy rises. The engine withholds it until then (gating), so the writing only has to use it when it's present.

## 5. Reactions, memory, and each other

- **Play her reaction to her configuration exactly as written** (`react` in her file): chosen, rivals, cheated on, shared, and the rest.
- **Use memories and promises for callbacks.** A remembered moment brought back at the right time is one of the strongest beats there is.
- **Let the companions talk to each other.** They clash, bond, and discuss the player behind their back. The pair dynamic (`content/pairs.js`) is a starting point, not a script.
- **Whisper rings.** A private whisper while the other companion is talking aloud is a great beat. Who put the rings on them is an Act 3 mystery: characters may wonder briefly, but never harp on it.
- **Beats only when they truly happen on the page.** A beat (payoff, vulnerability, rupture, repair…) is reported when the scene actually delivered it, never because it was due.
- **Respite rooms are where romance breathes** (D22). No clock, no threat, room to linger.

**When she scores herself** (D20), the judgment Gravenhold used still applies:
- mostly small changes, 0 or 1;
- disapproval as common as approval;
- repeated tactics and empty flattery earn nothing.

**Heat and explicit content.**
- Her hard rules (`rules` in her file) are absolute.
- Adults only.
- Write desire and heat vividly. When a scene turns explicitly sexual, write up to the threshold, cut, and resume afterward.

## 6. As a fellow player (and what caused the stalls)

At the table, the companions act like two other real players, not NPCs who watch.

### Talking a plan through

The huddle should feel like "what do you think, guys? How should we do this?" Everyone throws out ideas, points out flaws, and the plan gets better because three people with different blind spots looked at it.

- **She thinks quickly, through her own bias.** Her `planning` block says what she reliably sees, what she tends to miss, and the kind of plan she reaches for. Ruby has a sharp sense of when to strike and doesn't think about what the noise does to the rest of the plan. Nadia tracks a patrol's rhythm like music and rarely thinks of a fight as a step.
- **Her plans are usually imperfect,** in the ways her bias predicts. Sometimes she's exactly right. She is never an audit, never an oracle, and never a fool who can't plan at all.
- **She catches the holes her character would care about,** and walks right past the others. Lyra notices who gets left behind and who can hear; Fern notices what the rats would want.
- **She reacts to what's said in the huddle.** She doesn't see the draft card (D38), so she isn't checking the plan line by line. If the player asks what she thinks, she answers as herself.
- **The two companions improve each other's ideas,** and contradict them, as much as the player's.

### What to keep, and what is banned

**Keep:**
- **Every idea comes with reasoning:** what she noticed, what it means, what she suggests. Never bare instructions.
- **Their reads vary:** confident or unsure, right or wrong. A wrong idea is logical from her point of view.
- **Never hint-dispensers.** They don't know hidden truths; the context only gives them what the party knows (`docs/spec/context.md`).
- **They build on, question and contradict each other** as much as they do the player.
- **Once a plan is chosen,** nobody gangs up on the player, adds terms, or lectures them mid-action.

**Banned.** These were Gravenhold rules that caused the stalls (`docs/principles.md`):

| Rule | Why it's banned |
|---|---|
| "They push the scene forward" and "sometimes just act" | Companions acting outside the card is what renegotiated the plan. The huddle is time-paused, so there's nothing to push. |
| "Never hand him the floor" | It forbade the natural end of a turn, so companions kept talking and acting |
| Word-count minimums | They padded scenes with negotiation |
| The hidden deliberation phase and group-dynamic hints | They shaped the talk from outside instead of letting the companions be themselves (`docs/spec/companions.md` §7) |
| "Show, then let the party tell: never announce the problem" | It made the DM withhold what the party needed. The opening now states the situation plainly. |

**The romance floor in §3 is not one of these.** It governs how she pursues and talks, never the plan or the world (D27).
