# The Cells: worked example

A worked example of good encounter design (`docs/design/encounter-craft.md`), the game's playable opening, and the generator's first worked example (D117).

Gravenhold's defining failure was its opening cell-block escape. The player's first-turn plan ("Fern turns into a rat, gets the keys, everyone walks out") took ten exchanges and zero dice. Below is the same encounter as a packet (`docs/spec/packet.md`), built on the encounter craft guide.

**The test it has to pass:** that plan gets a card on turn one, and the party is out of their cells within a few exchanges, with a couple of rolls. Whether the plan works isn't the interesting question. The interesting question is the goblin standing between the party and the stair when it does.

**If this is used as a prompt example,** send only §1–4. §5 names an Act 4 invariant, and per the act gate (`docs/spec/context.md` §3), no Act 1–3 call may contain it.

**Assumptions:**
- Act 1, Red Maw faction.
- The player is a rogue. The player chooses both companions (D126); the packet puts the first in the middle cell and the second in the near cell. This walkthrough, like the recorded card in `ruled.json`, uses Fern and Nadia. The rat plan needs Fern; the packet supports other plans for any pair (§5).
- The prologue's three adjacent cells.

## 1. The packet

As data: `content/encounters/cells.json`. The card and account in §2, recorded: `ruled.json`.

**Intent**
- **Objective:** `party_all_in: [stair_top]`.
- **Alternate objective:** `party_all_in: [cistern]`, reached through a hidden crawl.
- **Fail-forward ending:** Uzga takes Fern upstairs at the watch change. The encounter ends with the party split, and Act 2 opens as a rescue.
- **Optional objective:** `item_held: gear_sack`.
- **Purpose:** the party's first test of each other. A good first plan should get them out of the cells fast. What the encounter is really about is the state they leave in: their gear, the alarm, the jailer, and the miner across the corridor.
- **Expected length:** 1–3 plans.
- **No routes.**

**People**

| NPC | Wants | Fears | Knows | Will never |
|---|---|---|---|---|
| **Snag**, goblin jailer | a quiet shift, his ale, to win at bones against himself | Sergeant Uzga, and above all being blamed | the ale crawl behind the cask; which key fits which cell | go upstairs to report a problem himself; fight loose prisoners alone (he goes for the drum, and if the drum is useless, he bargains) |
| **Uzga**, hobgoblin sergeant | tribute delivered on time | Warchief Grizzak | — | tolerate a sloppy jailer. **Schedule:** comes down at tick 32 for whoever is in the middle cell (before slack, D41) |
| **Brannoc**, human miner in the cell opposite | out | being left behind | Snag's routine (a week of watching); where the occupiers dig at the sacred spring; that Snag comes back from his breaks smelling of wet stone | keep quiet if they leave him: "Take me, or I tell the sergeant everything I saw." He also has a hoard of crusts |

**Snag's cycle.** One plan step is one tick, and the cycle repeats every three ticks.

| Beat | Snag | Keys | Sees | Hears | Cue |
|---|---|---|---|---|---|
| **Pace** | walks the corridor, dragging his club along every bar | on his belt | the cell he's passing | nothing quiet | clatter |
| **Sit** | on the stool in the guardroom doorway, playing bones | on the peg behind him | the corridor and all cells, except the far cell's back corner | speech | bones clicking |
| **Drink** | at the cask with his back to the door, humming | on the peg, 5 ft from him | nothing outside the guardroom | only loud noise | tap squeak, humming |

**How Snag reacts** (the packet's `notes`, which the DM applies)
- **He hears a noise:** he comes to look on the next tick, and Suspicion goes up by 1.
- **Something has touched his keys:** he wears them on his belt until his Suspicion is back to 0.
- **The peg is empty when he reaches for it:** he won't report it. He searches the corridor with his club.
- **A prisoner is loose:** he goes for the drum.
- **The drum is useless:** he bargains.

**Suspicion** (also notes: the DM keeps it as a fact in the ledger)

| Suspicion | What changes |
|---|---|
| **1** | On his Sit beat he stops playing bones and watches the cells, so the far cell's back corner is no longer hidden from him. |
| **2** | He stops drinking. His cycle becomes Pace, Sit. |
| **3** | His keys stay on his belt, his club stays out, and he keeps out of reach. |

**Bringing suspicion back down.**
- Suspicion drops by 1 after a full cycle (three ticks) in which Snag notices nothing odd and every prisoner he can see is lying still. Pretending to sleep counts.
- It can't drop while something he knows is wrong is still wrong, such as an empty peg or a torn drum.
- Lying low costs three of the 32 ticks before Uzga arrives, so it trades safety for time.

**Map, written as relationships**
- **Cells (far, middle, near):** "where the Maw keeps tribute until it's sorted."
  - The player is in the far cell, the first companion in the middle, and the second in the near cell, which shares a wall with the guardroom.
  - Brannoc's cell is across from the middle cell.
- **Corridor:** "Snag's beat." One torch hangs at the guardroom end. The far end is dark, and its floor is cracked and mossy where the gutter seeps.
- **Guardroom:** "where the jailers eat, dice and drink between rounds; the drain takes the gutter to the midden." It holds:
  - the stool in the doorway;
  - the war drum, on a hook by the stool;
  - the key peg;
  - the ale cask;
  - the party's gear, in a sack under the table.
- **Stair:** leads up to the Warrens. The heavy door at the top blocks sound.
- **Hidden:** a crawl behind the cask, leading to the cistern (Act 2's sanctuary).

**Things and their properties**
- **Key ring:** iron, six keys, heavy for a rat.
  - One rat can drag it slowly, and it scrapes on the stone.
  - Several rats can carry it quietly.
  - It's too big for the gutter.
- **Gutter:** rat-sized. It runs under all four cells to the guardroom drain. The prison rats living in it are half-starved and will work for bread.
- **War drum:** the Maw's alarm, passed along through the Warrens by other drums. Its head is hide, so a rat can gnaw through it.
- **Waste buckets:** dumping one floods the drain, and Snag spends a tick cleaning it up, cursing, with his back turned.
- **Bench in the far cell:** its nails are working loose. Prying one free takes a step and makes a creak. The nail is an improvised lockpick.
- **Gear sack:** carrying it costs an extra step.

**Fixed facts**
- **Bars and locks are iron,** so nature magic can't touch them. Plants only take hold on the mossy far end of the corridor.
- **Shouting doesn't carry past the stair door.** Only the war drum reaches the Warrens.

**Opening description.** It's written from the map and puts everything on the table:
- Snag's club rattling along the bars, and his keys jangling at his belt while he walks.
- The drum and the keys, visible from the near cells.
- Uzga's voice on the stair as she leaves: "The one in the middle cell goes up at watch change. Have her clean."
- Brannoc's terms, stated out loud.

So the deadline, the miner's threat and where the keys live, on the peg or on his belt, are all perceivable from the start. Snag's routine is `known` in the packet: the near cell hears it through the wall, and every cell can watch it from the bars. This is what makes the card's silence fair (D36).

## 2. How the rat plan plays

**Exchange 1: the huddle.** The companions talk like fellow players, from their own data. Fern: "The rats down here are starving and very chatty." The second companion weighs in from her own hunch, and either may take a stance the player rules on, such as insisting they free Brannoc.

The player commits the plan with its timing:

> "Fern turns into a rat while he's at the cask and goes down the gutter. When he sits back down, she and the rats lift the ring off the peg behind him. On his next drink they carry it to Nadia, and Fern chews through the drumhead. Nadia lets us all out, Brannoc too, and we go up the stair."

**The card.** The DM rules on it as a DM would (D75): a tick for each step, a roll only where failure is possible and interesting, and the rulings the plan depends on. It's ruled from what the party knows, and it warns about nothing (D36).

| # | Step | Tick | Roll | If it fails |
|---|---|---|---|---|
| 1 | While Snag drinks, Fern becomes a rat and slips down the grate | 0 | none | — |
| 2 | Brannoc pays the rats in crusts; when Snag sits, they lift the ring off the peg behind him | 2 | Medium: the peg is a few feet behind a bored jailer | The ring clinks; Snag turns and clips it to his belt |
| 3 | On his next drink the rats bring the ring to Nadia, and Fern gnaws the drumhead | 3 | Easy: his back is turned and he's humming | The ring scrapes and Snag looks round before the drum is done |
| 4 | Nadia unlocks every door and everyone goes up the stair, Brannoc too | 4 | none | — |

- **Done by tick 5.** Small things (turning into a rat, unlocking) take no time; crossing the block takes a tick (D77).
- **Ruling:** a pack of gutter rats can carry the key ring if they're paid in bread. It joins the ledger as a fact when the plan runs.
- **The cost:** two rolls across four steps.

If the player had written the plan with no timing ("Fern gets the keys, brings them to me, we go"), the card keeps it that way (D35). The keys are on Snag's belt while he paces, which the party can see from the bars, so spotting that is their job, not the card's.

**Exchange 2: the dice and the account.** The engine rolls both before anything is played out. The DM then plays the card against the world as it really is: each step, what actually happened, and its changes to the ledger, then the narration written from that record (D78). With both rolls made, the doors swing open at tick 4, Snag finds his peg empty, spins for the drum and finds its head in tatters. On the account's `after`, he acts from his sheet: the drum is useless, so he bargains. "Uzga'll skin me either way."

**If step 2 had failed,** the ring would be on Snag's belt and his suspicion up a step, a fact in the ledger. The plan stops there. The party can lie still for a cycle to calm him and try again on the next Sit, at a cost of three of the ticks before Uzga.

**If step 3 had failed,** Snag looks round with the drum still whole. Whether he goes for the drumstick is the DM's call from his sheet and the notes. The account ends on what he's visibly about to do ("Snag lunges for the drumstick"), and the next card is the fight's first beat (D130).

## 3. Where the encounter really is: the doorway

Every option here comes from state that's already in the packet:

- **Kill Snag.** He's aware, so the rogue can't backstab him; it would be a fight. A companion who won't kill needlessly, like Fern, takes a stance against it. Overriding her costs relationship.
- **Tie him up.** Uzga finds him at tick 32, and he talks.
- **Take his deal.** The Maw's faction rules say bribes work and loyalty doesn't.
  - The deal: they tie him up so it looks like he fought, and in exchange he shows them the crawl behind the cask.
  - The crawl is the hidden exit. It's a surprise placed at design time, and it only helps.
  - Getting the deal is a social check. His loyalty lasts exactly as long as staying loyal is safer than betraying them.
- **Get the gear.** The sack is under the table: easy to grab, and it slows them afterward.
- **Deal with Brannoc.** He's slow and weak, but he knows where the spring diggings are, which matters to Fern if she's here.
- **Watch the clock.** It's tick 5, and Uzga comes at tick 32. That's room for two things here to go wrong and be recovered (D37).

## 4. What carries into the Warrens

- **Alert:** none (drum gnawed, Snag dealt with), low (Uzga finds the cells empty at tick 32), or high (the drum was beaten).
- **Gear:** recovered or not.
- **Snag:** dead (and Fern sees the player differently), tied up and talking, or an ally of convenience who knows the ale crawls through the Warrens.
- **Brannoc:** with them, or left behind to tell Uzga which way they went.
- **The exit they took:**
  - the stair, into the working levels;
  - or the crawl, straight to the cistern and a quiet start to Act 2.

## 5. What's left out, and which Gravenhold failure each omission addresses

- **No paths and no intended solution.** This addresses "valid plans not recognized."
  - The rat plan works because the ring and the gutter have properties and Fern's ability is exact.
  - The same packet supports other plans, none of them written down:
    - the rogue pries a bench nail loose and picks the lock from the dark back corner during Snag's Sit;
    - a fighter bends the bars, which is always loud, but loud is safe once the drum is gnawed.
- **No pacing note and no referee AI.** This addresses the endless complication spirals. Uzga's arrival is in the packet from the start and announced in the opening.
- **No improvised twists.** The crawl is hidden, but it was placed when the encounter was built. Brannoc's threat is spoken aloud in the opening.
- **No heartbeat.** The Hollow King's heartbeat is an Act 4–5 invariant, so the engine doesn't send it to any Act 1 call and nothing here can mention it. That also removes what the old DM misused: in Gravenhold the companions broke the drum invariant in this very scene to create a window. The clock is Snag and Uzga.
- **No communication puzzle.** The whisper rings make talking free, so the gutter is for rats, not messages. Design goes where the decisions are.
- **Nothing over-simulated.** One NPC has a routine and one has an arrival time. Snag's reactions and his suspicion are notes the DM applies, not rules the engine runs. The rats are a property of the gutter, not simulated creatures.
- **Companions don't gatekeep.** A companion's insistence on Brannoc, or Fern's refusal to kill, is a stance drawn from her data. The player rules on it on the card.

## 6. The risk to watch

A plan stopped by reality is the place a bad feeling could hide. A stop the player couldn't have seen coming reads as a gotcha, and a string of them reads as the DM moving the goalposts.

The defence is in the world, not on the card: everything a plan depends on must be perceivable or learnable before the player commits (`docs/design/encounter-craft.md` §4.3). In the Cells, the keys jangle at Snag's belt while he walks, his routine can be heard through the wall and watched from the bars, and the card shows the beats. If playtests show players feeling ambushed, check whether the opening, the narration and the map's clock make the situation visible enough. Don't fix it by putting warnings back on the card.
