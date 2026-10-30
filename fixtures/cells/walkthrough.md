# The Cells: worked example

The project's first fixture: a worked example of good encounter design (`docs/design/encounter-craft.md`), the reference packet for Phase 1, and the source of the engine's acceptance test (`fixtures/cells/acceptance.md`).

Gravenhold's defining failure was its opening cell-block escape. The player's first-turn plan ("Fern turns into a rat, gets the keys, everyone walks out") took ten exchanges and zero dice. Below is the same encounter as a packet (`docs/spec/packet.md`), built on the encounter craft guide.

**The test it has to pass:** that plan gets a card on turn one. Whether the player catches its mistake on the card or the world interrupts it, the party is out of their cells within four exchanges, with a couple of rolls. Whether the plan works isn't the interesting question. The interesting question is the goblin standing between the party and the stair when it does.

**If this is used as a prompt example,** send only §1–4. §5 names an Act 4 invariant, and per the act gate (`docs/spec/context.md` §3), no Act 1–3 call may contain it.

**Assumptions:**
- Act 1, Red Maw faction.
- The player is a rogue, and the companions are Fern and Lyra, with their abilities as in `content/companions/`.
- The prologue's three adjacent cells.

## 1. The packet

As data: `content/encounters/cells.json`. The two cards below: `card1.json` and `card2.json`, with card 2's expected results in `card2.results.json`. Sample outputs for the other calls: `calls.json`.

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
| **Uzga**, hobgoblin sergeant | tribute delivered on time | Warchief Grizzak | — | tolerate a sloppy jailer. **Schedule:** comes down at tick 21 for Fern (before slack, D41) |
| **Brannoc**, human miner in the cell opposite | out | being left behind | Snag's routine (a week of watching); where the occupiers dig at the sacred spring; that Snag comes back from his breaks smelling of wet stone | keep quiet if they leave him: "Take me, or I tell the sergeant everything I saw." He also has a hoard of crusts |

**Snag's cycle.** One plan step is one tick, and the cycle repeats every three ticks.

| Beat | Snag | Keys | Sees | Hears | Cue |
|---|---|---|---|---|---|
| **Pace** | walks the corridor, dragging his club along every bar | on his belt | the cell he's passing | nothing quiet | clatter |
| **Sit** | on the stool in the guardroom doorway, playing bones | on the peg behind him | the corridor and all cells, except the far cell's back corner | speech | bones clicking |
| **Drink** | at the cask with his back to the door, humming | on the peg, 5 ft from him | nothing outside the guardroom | only loud noise | tap squeak, humming |

**Reactions**
- **He hears a noise:** he comes to look on the next tick, and Suspicion goes up by 1.
- **Something has touched his keys:** he wears them on his belt until his Suspicion is back to 0.
- **The peg is empty when he reaches for it:** he won't report it. He searches the corridor with his club.
- **A prisoner is loose:** he goes for the drum.
- **The drum is useless:** he bargains.

**Suspicion ladder**

| Suspicion | What changes |
|---|---|
| **1** | On his Sit beat he stops playing bones and watches the cells, so the far cell's back corner is no longer hidden from him. |
| **2** | He stops drinking. His cycle becomes Pace, Sit. |
| **3** | His keys stay on his belt, his club stays out, and he keeps out of reach. |

**Bringing suspicion back down.**
- Suspicion drops by 1 after a full cycle (three ticks) in which Snag notices nothing odd and every prisoner he can see is lying still. Pretending to sleep counts.
- It can't drop while something he knows is wrong is still wrong, such as an empty peg or a torn drum.
- Lying low costs three of the twenty-one ticks before Uzga arrives, so it trades safety for time.

**Map, written as relationships**
- **Cells (far, middle, near):** "where the Maw keeps tribute until it's sorted."
  - The player is in the far cell, Fern in the middle, and Lyra in the near cell, which shares a wall with the guardroom.
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
- **Bars and locks are iron,** so Fern's magic can't touch them. Her Entangle only works on the mossy far end of the corridor.
- **Shouting doesn't carry past the stair door.** Only the war drum reaches the Warrens.
- **Ruling made in advance:** Fern's Wild Shape ends when the party leaves the cell block.

**Opening description.** It's written from the map and puts everything on the table:
- Snag's club rattling along the bars, and his keys jangling at his belt while he walks.
- The drum and the keys, visible from the near cells.
- Uzga's voice on the stair as she leaves: "The druid goes up at watch change. Have her clean."
- Brannoc's terms, stated out loud.

So the deadline, the miner's threat and where the keys live, on the peg or on his belt, are all perceivable from the start. Snag's routine is `known` in the packet: Lyra hears it through the wall. This is what makes the card's silence fair (D36).

## 2. How the rat plan plays

**Exchange 1: the huddle.** The companions talk like fellow players, from their own data:
- **Lyra** can hear through the wall: "He walks, he sits, he drinks. Over and over. Right now it's the cask." She also insists on freeing Brannoc, which follows from her trait "won't leave anyone behind." That becomes a pending stance the player rules on.
- **Fern:** "The rats down here are starving and very chatty."

The player commits the Gravenhold plan exactly as written: *Fern turns into a rat, gets the keys, brings them to me, I let everyone out, we go.* It has no timing in it, so each step happens right after the one before (D35).

**Card 1: the plan as written.** Every step is priced as the party expects the world to be (D36). The card shows when each step falls on Snag's routine, because the party knows it, and it warns about nothing.

| # | Step | Snag's beat | Difficulty |
|---|---|---|---|
| 1 | Fern changes shape | Drink | automatic |
| 2 | Fern runs to the guardroom and takes the keys off the peg | Pace | Easy: a rat in the corridor while he paces it |
| 3 | She drags the ring down the corridor to the far cell | Sit | Very hard: one rat, iron scraping on stone, past his stool |
| 4 | The rogue unlocks everyone | Drink | automatic |
| 5 | Everyone walks out | Pace | Near impossible: four people down the corridor he's pacing |
| 6 | Up the stair | Sit | automatic |

The card doesn't say that the keys are on Snag's belt during step 2, or that he'll see the open doors before step 5. The party knows his routine and can see the beats on the card; spotting it is their job.

**Exchange 2, path A: the player catches it.** Step 2 lands on his Pace, and his keys go on his belt when he walks. The player rewrites the plan with timing:

> "Do it on his drinks. Fern changes in her back corner while he's at the cask and goes down the gutter. When he sits back down, she and the rats lift the ring off the peg behind him, and Brannoc pays them with his crusts. On his next drink they carry it to Lyra, and Fern chews through the drumhead. Lyra lets us all out, Brannoc too."

That's Card 2, below.

**Exchange 2, path B: the player commits card 1.** Fern changes on the Drink beat. As the Pace beat begins, Snag lifts the ring off the peg and clips it to his belt, and everyone in the cells can see the peg from their bars. **The plan is interrupted right there, before Fern sets off** (D46; `card1.results.json`): nobody runs for a peg they can see is empty. It isn't a failure. Fern is a rat in her cell at tick 1, Snag is pacing, and on his next Sit the keys go back on the peg. The player plans from that moment, and the next card can be card 2's steps 2–5 on the same beats: the interruption cost an exchange, not time.

**Card 2: the edited plan**

| # | Step | Snag's beat | Risk | Difficulty | If it fails |
|---|---|---|---|---|---|
| 1 | Fern changes at the back of her cell | Drink | — | automatic | — |
| 2 | Fern goes down the gutter to the guardroom drain | Pace | — | automatic | — |
| 3 | Brannoc tosses his crusts; Fern and the rats lift the ring off the peg | Sit, with the peg behind him | iron clinking behind him in a quiet room | Easy | He swats the rats and clips the ring to his belt. Suspicion 1. The plan stops. |
| 4 | The rats carry the ring to Lyra; Fern gnaws the drumhead | Drink | gnawing hide ten feet behind him | Easy | He kicks the rat off his drum (Fern loses 1 HP). Suspicion 1. The drum still works. The plan continues. |
| 5 | Lyra unlocks all four doors | Pace: **he reaches for the empty peg** | none: he sees the doors open, but the drum is already gnawed (step 4), and a key is a key | automatic | — |

- **Steps 1, 3 and 4 carry the player's own timing** (`when`: "while he's at the cask", "when he sits back down", "on his next drink"). Steps 2 and 5 have none, so each happens right after the step before.
- **Lyra's stance** is resolved, because the plan frees Brannoc.
- **The cost:** two dice, both Easy, across five steps on one card.

**Exchange 3: execution.**
- **Step 3** rolls 34: success.
- **Step 4** rolls 52: success.
- **Step 5:** at tick 4, the doors swing open just as Snag reaches for an empty peg. He comes down the corridor with his club, finds three loose prisoners and a miner, and spins for the drum. Its head is in tatters.

That's the plan done. On the world turn, Snag acts from his sheet. The drum is useless, so he bargains: "Uzga'll skin me either way."

**If step 3 had failed,** the ring would be on Snag's belt and his Suspicion at 1. He's still drinking, but the keys stay on him until his Suspicion is back to 0. The party can lie still for a cycle to bring it down and try again on the next Sit. That costs three of the eighteen ticks left before Uzga.

**If step 4 had failed,** the same moment at tick 4 has Snag diving for the drumstick. A fight starts, with the Warrens one beat away from being alerted.

## 3. Where the encounter really is: the doorway

Every option here comes from state that's already in the packet:

- **Kill Snag.** He's aware, so the rogue can't backstab him; it would be a fight. The step is tagged `lethal`, which trips Fern's conditional stance ("won't kill needlessly"). Overriding her costs relationship.
- **Tie him up.** This costs a step. Uzga finds him at tick 21, and he talks.
- **Take his deal.** The Maw's faction rules say bribes work and loyalty doesn't.
  - The deal: they tie him up so it looks like he fought, and in exchange he shows them the crawl behind the cask.
  - The crawl is the hidden exit. It's a surprise placed at design time, and it only helps.
  - Getting the deal is a social check. His loyalty lasts exactly as long as staying loyal is safer than betraying them.
- **Get the gear.** The sack is under the table: one step to grab, and it slows them afterward.
- **Deal with Brannoc.** He's slow and weak, but he knows where the spring diggings are, and that's Fern's personal quest.
- **Watch the clock.** It's tick 5, and Uzga comes at tick 21. That's room for two things here to go wrong and be recovered (D37).

## 4. What carries into the Warrens

- **Alert:** none (drum gnawed, Snag dealt with), low (Uzga finds the cells empty at tick 21), or high (the drum was beaten).
- **Gear:** recovered or not.
- **Snag:** dead (and Fern sees the player differently), tied up and talking, or an ally of convenience who knows the ale crawls through the Warrens.
- **Brannoc:** with them, or left behind to tell Uzga which way they went.
- **The exit they took:**
  - the stair, into the working levels;
  - or the crawl, straight to the cistern and a quiet start to Act 2.

## 5. What's left out, and which Gravenhold failure each omission addresses

- **No paths and no intended solution.** This addresses "valid plans not recognized."
  - The rat plan works because the ring has properties and Fern's ability is exact.
  - The same packet supports other plans, none of them written down:
    - the rogue pries a bench nail loose and picks the lock from the dark back corner during Snag's Sit;
    - a fighter bends the bars, which is always loud, but loud is safe once the drum is gnawed.
- **No pacing note and no referee AI.** This addresses the endless complication spirals. Uzga's arrival is in the packet from the start and announced in the opening.
- **No improvised twists.** The crawl is hidden, but it was placed when the encounter was built. Brannoc's threat is spoken aloud in the opening.
- **No heartbeat.** The Hollow King's heartbeat is an Act 4–5 invariant, so the engine doesn't send it to any Act 1 call and nothing here can mention it. That also removes what the old DM misused: in Gravenhold the companions broke the drum invariant in this very scene to create a window. The clock is Snag and Uzga.
- **No communication puzzle.** The whisper rings make talking free, so the gutter is for rats, not messages. Design goes where the decisions are.
- **Nothing over-simulated.** One NPC has a schedule and one has an arrival time. The rats are a property of the gutter, not simulated creatures.
- **Companions don't gatekeep.** Lyra's insistence on Brannoc and Fern's refusal to kill are stances drawn from their data. The player rules on them on the card.

## 6. The risk to watch

Interruptions are the new place a bad feeling could hide. An interruption the player couldn't have seen coming reads as a gotcha, and a string of them reads as the DM moving the goalposts.

The defence is in the world, not on the card: everything a plan depends on must be perceivable or learnable before the player commits (`docs/design/encounter-craft.md` §4.3). In the Cells, the keys jangle at Snag's belt while he walks, Lyra hears his routine through the wall, and the card shows the beats. If playtests show players feeling ambushed, check whether the opening, the world turns and the map's clock make the situation visible enough. Don't fix it by putting warnings back on the card.
