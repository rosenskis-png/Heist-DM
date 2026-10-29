# Encounter Design

How to design encounters that play the way a great DM would run them. This document consolidates the design discussions behind the project into principles that apply at any scale. Those discussions covered a heist told three ways, the same heist's layout and timing told three ways, a small cell-block escape, and a mid-prison cavern.

**Who this is for.** Anyone writing an encounter by hand, and anyone designing the encounter generator and its validation (v4 §3, §13.1).

**This is not a prompt.** Rules in a prompt compete with each other (see the README). Give the generator only a small slice of this document, as judgment. Wherever a principle can be checked, turn it into structure or an engine check instead (§10).

---

## 1. What makes an encounter good

An encounter is good when three things hold:

1. **Players make decisions whose consequences they can partly see coming.**
2. **Dice settle what's still uncertain after a decision.** They never stand in for the decision.
3. **Every outcome leads somewhere interesting, including success.**

The third fails most often. In a merely competent encounter, a group that plans well and rolls well gets pass, pass, pass, done. The best play produces the dullest session. All the interest comes from failure, which quietly pushes the DM to make players fail.

**Genres make promises.**
- A heist promises a competent crew, a clever plan, the plan going sideways, improvisation, and a payoff.
- A prison break promises being stuck, noticing things, and getting out by your own wits.

Design so the encounter can deliver every beat of its genre's promise.

**Planning is a deal between players and DM.** Players spend real time planning, and in return the DM promises that planning will matter.
- **What planning buys:** leverage (position, information, options), never certainty.
- **Scouting:** should turn up true but partial facts, each at a price: a face seen, a favor owed, time spent.
- **When the plan goes wrong,** that should test the plan, not prove it was pointless.

---

## 2. Scope first: find where the decisions are

Before placing anything, ask what the players are actually choosing in this encounter. Build for that choice and cut everything else.

| The decisions are about | Build | Example |
|---|---|---|
| **Routing:** which way, through what | loops, chokepoints, exits, response distances | the cavern floor |
| **Timing:** when to act | a learnable cycle, a deadline, windows | the cell block |
| **Approach:** force, talk, trick or magic | objects with properties, people with wants, something to do at each position | both |
| **What to keep:** the state the party leaves in | stakes beyond plain success: gear, the alarm, witnesses, allies, time | every scene where failure isn't really possible |

A principle that doesn't touch the encounter's decisions is decoration at best and bookkeeping at worst.
- **In the cell block,** loops, disguises and varied exits did nothing, because every decision happened inside the cells.
- **In the cavern,** those same three principles were the core of the design.

**Some scenes are guaranteed successes.** A jailbreak at the start of a campaign isn't really asking *whether* the party gets out, because the story needs them out. Put the stakes in *how* they leave:
- with or without their gear;
- with or without the alarm raised;
- with or without a witness, a new enemy, or a new ally.

This is also how a success produces something interesting.

**Size an encounter by its decisions, not its length in minutes.** v4 §3.1 already sizes encounters by the number of plans committed. Keep an encounter small enough that all of its facts fit in every call (v4 principle 4). Split a large set piece like the heist at its natural seams, such as the ballroom and the basement. Each piece then hands its state to the next (§3.8).

---

## 3. Principles at any scale

### 3.1 Decisions before dice
- **A roll answers "did my choice work?", never "what should I do?"**
  - "Roll Stealth" is not a choice.
  - "Go now while the music covers you, or wait for the quiet window and risk the bell" is a choice.
- **Leverage first, then the roll.** Without leverage, no roll talks the guard round. With leverage, the roll decides how far he goes.
- **State the stakes before rolling:** what success gets and what failure costs (the v4 plan card). Careful wording is not a mechanism.

### 3.2 Problems, not puzzles
- **A puzzle has one solution, the designer's. A problem has constraints, resources and people.** "One lock, one key" is a puzzle pretending to be a problem.
- **Never write down solutions.** That includes "the intended route" and "alternatives." Any list of routes drags the DM back toward steering players onto them. See the README, and the PATHS field in the Gravenhold generator.
- **Give things properties, not just difficulties.**
  - A vault door that is iron, warded, on a schedule, and has a clerk's deposit slot gives an improvised plan something to grab.
  - A door that is just "DC 20" gives it nothing.
  - Properties are what let the DM rule on a plan nobody anticipated.

### 3.3 Interlock
- **Solving one obstacle should change another.** For example:
  - The key ring is on the guard's belt during one beat of his routine and on the peg during another.
  - The ring that opens the vault also commands the guard hound.
  - One prisoner's chatter covers another prisoner's noise.
- **The connection test: every element should connect to at least two others.**
  - In the cell block, the horn connects to the guard's response, to the cord made from a blanket, and to whether grabbing the guard is safe.
  - The guard's drinking connects to the near cell's line of sight, to the leverage over him, and to the quiet window.
  - An element that connects to nothing is decoration. Cut it, or keep it as deliberate decoration.
  - This replaces Gravenhold's rule that "an element exists only if it takes part in a path," which only worked because paths were written down.
- **Links only work if the space and the clock make them physical.** A hound that rests at each quarter bell only opens a window if its resting spot is far from the vault.

### 3.4 Everyone has essential work
- **Give each position or character something only they can do.** In the cell block, the far cell has physical work, the middle cell faces the guard, and the near cell has the line of sight. The environment gives every position something to do; class abilities speed it up.
- **Watch for a player whose fun depends on the plan failing,** such as the fighter waiting for combat. That's a sign the design is working against itself.
- **Small encounters usually fail by having one solution. Large ones fail by having solutions that never meet.**
  - The fix for small encounters: spread the parts of a solution across the players.
  - The fix for large ones: make split groups hand things to each other, through a dumbwaiter or a signal.

### 3.5 People with wants
- **NPCs act from their sheets, not from difficulty numbers.** A sheet has wants, fears, and things they'll never do (v4 §3.2).
  - "Greedy, DC 15" is just a modifier.
  - "Terrified of the sergeant" is a lever the players can pull.
- **Let what players observe become leverage.** Seeing the guard drinking on duty is what makes a threat against him believable. Information gathered in play should be something players can spend.
- **An NPC whose agenda is stated can betray the party as a consequence of their choices.** An NPC who betrays without one is just a twist (§3.6).

### 3.6 Foreshadow
- **Surprise is cheap; dread has to be earned.** A trap the players can see is a decision. A hidden one is a tax.
- **Show every behavior rule before it matters.** Say goblins won't enter the wolf den and wolves avoid fire. Before players need either rule, they must see a goblin give the den a wide berth and a torch drive off a wolf. A rule the players haven't seen doesn't exist for them.
- **Surprises should only open options; deadlines the players know about may close them.**
  - In the cavern, the Hunt empties the wolf den. It's a surprise, but it only helps.
  - The discovery of the escape, which raises the alarm, is something the players know is coming.
- **No improvised twists** (v4 principle 8). Everything the players don't see coming is placed while designing.

### 3.7 Failure changes the situation
- **Failure is partial and clear to the players:** suspicion rises, a window closes, a resource is spent, someone is taken.
- **It never ends the encounter, and it never adds busywork** (new sub-steps nobody needs). Busywork complications were one of Gravenhold's root problems.
- **Design failure as a new problem made of the same parts.**
  - The deadline arrives and the cell door opens, but now there are two guards.
  - A party member taken upstairs turns an escape into a rescue.
- **Taking things away is not difficulty.**
  - Stripping spells, gear and information "to make it a challenge" removes decisions, not power.
  - Constrain instead. For example: no material components, but spoken spells can be heard.

### 3.8 Consequences pile up and carry forward
- **The end of an encounter is the bill for everything before it.** Players should recognize every line item: who saw their faces, who got branded, whether the alarm sounded, whether the ring was put back.
- **Carry state into the next encounter's starting conditions.**
  - If the horn sounded, the party arrives to full alert.
  - If the guard is cooperating, discovery of the escape is delayed.
  - If the party kept their deal with the guard, they have a guide.
- **The climax can be a choice instead of a roll.** Deciding what to do with the stolen ledger is a better ending than one more check.

---

## 4. Time

### 4.1 Few sources, one grid
- **Drive every clock from one or two sources,** so windows emerge from how they interact.
  - In the heist, the bells drove the guards and the hound, and the orchestra drove the noise level and the Baron's movements.
  - Several clocks that don't affect each other produce nothing but fudging.
- **Put everything on one time grid, and pick a tick size that every scheduled event lands on.** With 10-minute ticks and bells every 15 minutes, the bells fall between ticks and the window gets fudged.

### 4.2 A cycle for mastery, events for pressure
- **A repeating cycle rewards watching and planning.**
- **One-time events make waiting expensive.** They are irreversible, and each one closes an option.
- **Waiting must cost something.** With twelve identical windows and nothing irreversible until the end, the best play is always to wait for the perfect gap, and tension goes flat.
- **Design windows that open in one place by closing another.** The bell that clears the basement also crowds the stairs, so that window only helps someone who is already below.

### 4.3 Make the cycle learnable
- **Players must be able to learn a cycle within the time they actually have.** Either:
  - they can watch it repeat at least twice at low cost, or
  - someone hands it to them: an informant, a document, a fellow prisoner.
- **Better still, make the cycle visible instead of something to memorize.** A patrol carrying a torch through a dark cavern shows its own position. The players watch it the same way their characters do.
- **Being locked in a cell, a good vantage point, or a quiet opening can make watching free on purpose.** The deadline then sets the price.
- **Anything the players must know to have a fair chance should be learnable in more than one way.**

### 4.4 Alarm: a resource that changes the tempo
- **The strongest single engine is a trade between two pressures:**
  - quiet and slow, which spends time, or
  - fast and loud, which spends alarm.
  
  Players then face the same clear trade-off again and again, in different forms.
- **A rising alarm should change how the world moves, not just add a penalty.** Examples: guards check in every 5 minutes instead of every 15, or a guard stops leaving his post.
- **A meter that only rises on bad rolls measures luck.** An alarm the players can choose to spend is a resource.
- **Let players lower it by spending time.**
  - Lying low for a while should bring suspicion back down: a prisoner pretending to sleep, a crew waiting out a patrol.
  - The alarm then trades against the clock instead of only ever rising, and a bad roll costs time instead of the whole encounter.

### 4.5 Write the schedule down
- **A schedule written before play is how a fair DM proves fairness.**
  - If the DM decides on the spot where a guard is, it reads as the DM choosing whether the players lose, however honest it is.
  - "This was always going to happen at 10:47" is believable only if it was written down at 10:00.
- **Never move a deadline because the scene is dragging.**
  - "The sergeant arrives when the scene drags" reads as punishment.
  - Gravenhold's pacing note ("stalled? add a complication") is the same failure in prompt form.
- **Reactions, not scripts. The schedule is a baseline.**
  - Patrols follow it until they meet something wrong: a door open that should be shut, a missed check-in, a body on the route.
  - Each of those has a defined response.
  - Patrols that ignore everything and move in lockstep get figured out during scouting, and play turns into reading a timetable.

### 4.6 Zoom
- **Match the tick size to the size of the decisions:**
  - coarse ticks while sneaking;
  - combat rounds as soon as anyone is within sight or earshot;
  - coarse again once the party is clear.

---

## 5. Space

### 5.1 Loops, not tubes
- **When routing matters, give every important area at least two ways in.**
  - In a single corridor, getting spotted means retreat or fight.
  - On a loop, getting spotted starts a chase, which the party can recover from: circle round, double back, break line of sight.
- **Three entrances that funnel into one corridor are a false choice.**
- **One mandatory chokepoint, like the vault door, is fine and often good.** Everything else should have a way around, at a cost.

### 5.2 Membranes: where different spaces meet
- **The interesting moments happen where spaces with different rules meet.** Examples:
  - the servants' door into the ballroom;
  - an office with both a guest door and a servants' door;
  - the mouth of the wolf den, between the goblins' firelight and the wolves' dark.
- **Put key objects on these boundaries.** That's where disguises switch, where handoffs happen, and where the social characters become essential. Move the signet ring away from a boundary and the party's talker is back to waiting.

### 5.3 Information and channels
- **Vantage points make information cost time.** Watching uses minutes the clock is counting.
- **Give split groups a channel** (a dumbwaiter, a gutter running between cells, a signal) so they can hand things to each other instead of playing separate solo games.

### 5.4 Distance is response time
- **Set distances by how fast help arrives.** For example: one minute from the guardroom to the vault, three minutes to the records room. The map should tell players how loud they can afford to be in each place.
- **"Reinforcements in 1d4 rounds" turns distance into nothing the players can use.**

### 5.5 Exits
- **When the decisions happen on the way out, the exits should differ from the entrance and from each other.** Each exit has its own cost, its own closing condition, and its own pursuers.
- **Each exit can lead to a different next scene:** the road, the forest, a hilltop overlook, an unknown underground river. Choosing an exit then means choosing what happens next.
- **The rising alarm should close exits in a known order.** Choosing a way in then means choosing which ways out you keep.

---

## 6. Senses, disguise and pursuit

- **Define observers by their senses, not just their positions:** who sees, who hears, who smells, and in what light. v4 §3.3 already requires every observer to state what it can see and hear.
- **Different senses make disguises double-edged.**
  - A goblin cloak fools eyes but not noses.
  - Den muck fools noses but draws looks.
  - A disguise that fools one group should give you away to the other.
- **Territories can be refuges.** The den is safe from goblins if you smell right, and firelight is safe from wolves.
- **Chases need pursuers that differ from each other.**
  - Give each pursuer a profile: speed, senses, and what stops it.
  - Put things on the map that end the chase, matched to each pursuer:
    - water breaks a scent trail;
    - wolves won't cross a rope bridge;
    - cutting the bridge stops goblins;
    - a climb stops anything without hands.
- **Calibrate the chase.** From any point on the route, something that stops at least one pursuer should be within two rounds of running. Otherwise the faster pursuer always wins and the chase is a formality.
- **Trails last.** Trackers follow the route the party actually took. Where that route enters water, the trail ends.
- **Check what the rules actually say.**
  - The cavern relies on 5e wolves having no darkvision.
  - Play wolves that see in the dark and both the river and the den refuge get much weaker.
  - Note dependencies like this at design time.

---

## 7. Running it

These are execution jobs. In this project, most of them belong to the engine (code computes, AI judges).

- **Work out positions in advance.** A cycle table should be small, six rows or fewer. Nobody should be calculating where a guard is during play.
- **Keep the clock visible.** Players should never have to ask what time it is.
- **Narrate cues before events, without being asked.** Examples: the music winding down, the hound's ticking audible at 30 feet, lantern light coming around a corner.
- **Resolve a split party in clock order.** Whichever group's clock is earliest acts next, and no group gets more than one tick ahead.
- **Run chases by moving pieces on the map and applying the chase-stoppers** (§6), not with tables of random complications.

---

## 8. Process

1. **Objective and purpose.**
   - An objective the engine can check.
   - A fail-forward alternative.
   - One or two sentences on what the encounter is for.
   - The states the party could leave in.
2. **Where the decisions are** (§2). Pick the principles that act on them. Name the ones you're dropping and why.
3. **People.** A sheet for each NPC: wants, fears, what they'll never do. Give an NPC a schedule only if the schedule creates a choice.
4. **Places.**
   - Zones, each with a line saying what it's for.
   - Connections, each saying which side it can be operated from.
   - What can be seen and heard from where.
5. **Things.** A few objects with properties, placed so every position has something to do.
6. **Clock.** Its sources, the repeating cycle, the one-time events, and the cue for each. Check that waiting costs something.
7. **Alarm ladder.** Each level changes the map or the tempo, in a set order. Say how a level comes back down, if it can.
8. **Exits,** if leaving is where the decisions are: each one's cost, closing condition, pursuer, and next scene.
9. **Connection test.** Every element connects to at least two others.
10. **Walk two runs privately: a clean one and a messy one.**
    - Check that the clean run still produces something interesting.
    - Check that the messy run still leaves options open.
    - Check that no single roll decides the encounter.
    - **Then throw both runs away.** They are tests: never stored and never sent to any call (v4 §3.1).
11. **Learnability check.** For every pattern or fact the players need: how can they learn it, and how cheaply, within the time they have?
12. **Show-before-it-matters check.** For every behavior rule: when will the players first see it?

### Don't over-build

This guide pushes toward more prepared structure, and the README warns about exactly that: pre-simulating everything (tick schedules for every NPC, senses for every creature, exhaustive contents) makes the game feel like a stealth video game.

- **Where to draw the line:** prepare what the decisions depend on. Leave the rest as purpose and wants for the DM to judge.
- **If a schedule doesn't create a choice, cut it.**
- **Use one or two clock sources per encounter,** and define senses only for the observers that matter.

The good versions in the worked examples had fewer pre-written branches than the average versions. What they had more of was connections.

---

## 9. Failure patterns

| What happens at the table | Cause | Fix |
|---|---|---|
| One player plays while the rest watch | the solution sits in one position | spread its parts across positions (§3.4) |
| Valid ideas get shut down | the DM is protecting an intended solution | no written solutions; objects with properties (§3.2) |
| One roll decides the whole encounter | a check stands in for a decision, or every route funnels to one spot | real choices with costs; loops (§3.1, §5.1) |
| The choice of entrance doesn't matter | all routes funnel into one spot | loops; a chokepoint only where you mean one (§5.1) |
| Linked obstacles never connect in play | the layout or timing doesn't make the link physical | place things so the link happens on the map (§3.3) |
| Guard positions are decided on the spot and feel hostile | no written schedule | write it down beforehand (§4.5) |
| Players wait for the perfect window | waiting costs nothing | one-time events (§4.2) |
| Patrols get figured out in scouting; play is reading a timetable | identical patrols in lockstep that react to nothing | reactions to anomalies; clocks that interact (§4.1, §4.5) |
| Windows fall between ticks and get fudged | scheduled events don't land on the tick grid | one grid (§4.1) |
| The cycle is too fast to learn | no time budgeted for learning it | a visible cycle, an informant, or a free opening (§4.3) |
| The alarm response is "soon" or "1d4 rounds" | the response has no geography | distance equals response time (§5.4) |
| The alarm only measures luck | the meter only rises on bad rolls | let players spend it; let it change the tempo (§4.4) |
| The escape is the entry run in reverse | exits weren't designed | distinct exits (§5.5) |
| Three separate solo puzzles | each object is a full solution by itself | objects as parts of a solution; channels between groups (§3.4, §5.3) |
| A clean success produces nothing | the stakes only exist on failure | stakes in the state they leave in; success creates new situations (§2, §3.8) |
| The deadline arrives when the scene drags | pacing by the DM's mood | a fixed schedule (§4.5) |
| A hidden trap or a sudden betrayal | nothing was foreshadowed | visible threats; stated agendas (§3.5, §3.6) |
| Players never use a world rule | they were never shown it | show it before it matters (§3.6) |
| A "challenging" scene with nothing to do | options were stripped away | constrain instead of removing (§3.7) |
| Failure spirals into sub-tasks | complications add busywork | failure changes the situation (§3.7) |

---

## 10. In this project

This section maps the principles onto the encounter packet (v4 §3) and marks which ones could become engine checks. These are candidate answers to v4 §13.1 ("how the engine checks quality beyond the consistency checklist"). They are proposals, not spec.

| Principle | Where it lives | Engine-checkable? |
|---|---|---|
| Objective, fail-forward, purpose | Intent (§3.1) | The objective already is |
| No written solutions | Intent: no routes | Already a rule; the generator's private route check is discarded |
| People with wants | NPC sheets (§3.2) | Only that the fields exist |
| Properties, not difficulties | Usable things, fixed facts (§3.3) | Each usable thing has at least one property beyond its description |
| Connection test | All elements | **Yes:** count references between elements and flag any element with fewer than two |
| Loops, one chokepoint | Connections | **Yes:** a graph check. Zones the objective depends on have at least two routes, or are flagged as the chokepoint |
| Everyone has essential work | Usable things vs. character abilities | **Partly:** each party member's abilities interact with at least one element |
| Distance is response time | Connections with lengths, NPC schedules | **Yes,** once connections carry travel time |
| Exits | Zones flagged as exits | **Yes:** each exit has a closing condition that the alarm ladder references |
| Few clock sources, one grid | Schedules in ticks (§10) | **Yes:** schedule periods share a grid, and there are no more than two independent sources |
| Waiting costs something | Schedules | **Yes:** at least one one-time event before the encounter's natural end |
| Learnability, cues | Schedules, sightlines | **Partly:** every schedule has a cue the party can perceive from a zone they start in or can reach |
| Show before it matters | NPC sheets (`will_never`, reactions) | No, this is judgment |
| Foreshadowing, no twists | Hidden things placed at generation (principle 8) | Already structural |
| Reactions, not scripts | NPC sheets: reactions under pressure | Only that they exist; the behavior itself is judgment |
| Carry forward | Campaign layer (§13.6) | Open question |

Everything that can't be checked by the engine stays as judgment. Improve that judgment with better information (the purpose line, the table read, worked examples, per v4 §6.3), not with more rules in the prompt.

---

## 11. Worked example: the Cells, rebuilt for Gravenhold

Gravenhold's defining failure was its opening cell-block escape. The player's first-turn plan ("Fern turns into a rat, gets the keys, everyone walks out") took ten exchanges and zero dice. Below is the same encounter as a v4 packet built on this guide.

**The test it has to pass:** that plan gets a card on turn one, at most one edit, and a couple of rolls, and the party is out of their cells by the third exchange. Whether the plan works isn't the interesting question. The interesting question is the goblin standing between the party and the stair when it does.

**If this is used as a prompt example** (worked examples go into every call, per v4 §9.1), send only §11.1–11.4. §11.5 names an Act 4 invariant, and per the act gate in v4 §3.5, no Act 1–3 call may contain it.

**Assumptions:**
- Act 1, Red Maw faction.
- The player is a rogue, and the companions are Fern and Lyra, with their abilities as written in the prototype.
- The prologue's three adjacent cells.

### 11.1 The packet

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
| **Uzga**, hobgoblin sergeant | tribute delivered on time | Warchief Grizzak | — | tolerate a sloppy jailer. **Schedule:** comes down at tick 12 for Fern |
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
- Lying low costs three ticks of the twelve before Uzga arrives, so it trades safety for time.

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
- Snag's club rattling along the bars.
- The drum and the keys, visible from the near cells.
- Uzga's voice on the stair as she leaves: "The druid goes up at watch change. Have her clean."
- Brannoc's terms, stated out loud.

So the deadline, the miner's threat and where the keys live are all known from the start.

### 11.2 How the rat plan plays

**Exchange 1: the huddle.** The companions talk like fellow players, from their own data:
- **Lyra** can hear through the wall: "He walks, he sits, he drinks. Over and over. Right now it's the cask." She also insists on freeing Brannoc, which follows from her trait "won't leave anyone behind." That becomes a pending stance the player rules on.
- **Fern:** "The rats down here are starving and very chatty."

The player commits the Gravenhold plan exactly as written: *Fern turns into a rat, gets the keys, brings them to me, I let everyone out, we go.*

**Card 1: the plan as written.** The engine projects each step's tick against Snag's cycle. Nothing is rolled yet; the card shows the plan's honest price.
- **Fern changes shape** while Snag is on the stool facing her torchlit cell: **Hard, 45%.** If it fails, he comes to the bars, Suspicion goes to 1, and the plan stops.
- **Fetching the keys** lands on a Pace beat, and **the keys aren't on the peg:** Snag carries them while he paces.
- **One rat dragging an iron ring** down the lit corridor past his stool: **Very hard, 20%.**

This one card teaches the player the whole cycle, through the card rather than through trial and error.

**Exchange 2: one edit.**

> "Do it on his drinks. Fern changes in her back corner while he's at the cask and goes down the gutter. When he sits back down, she and the rats lift the ring off the peg behind him, and Brannoc pays them with his crusts. On his next drink they carry it to Lyra, and Fern chews through the drumhead. Lyra lets us all out, Brannoc too."

**Card 2: the edited plan**

| # | Step | Snag's beat | Risk | Odds | If it fails |
|---|---|---|---|---|---|
| 1 | Fern changes in her back corner | Drink | — | automatic | — |
| 2 | Fern goes down the gutter to the guardroom drain | Pace | — | automatic | — |
| 3 | Brannoc tosses his crusts; Fern and the rats lift the ring off the peg | Sit, with the peg behind him | iron clinking behind him in a quiet room | Easy, 80% | He swats the rats and clips the ring to his belt. Suspicion 1. The plan stops. |
| 4 | The rats carry the ring to Lyra; Fern gnaws the drumhead | Drink | gnawing hide ten feet behind him | Easy, 80% | He kicks the rat off his drum (Fern loses 1 HP). Suspicion 1. The drum still works. The plan continues. |
| 5 | Lyra unlocks all four doors | Pace: **he reaches for the empty peg** | none (she sees in the dark, and a key is a key) | automatic | — |

- **Lyra's stance** is resolved, because the plan frees Brannoc.
- **The cost:** two dice, both Easy, across five steps on one card.

**Exchange 3: execution.**
- **Step 3** rolls 34: success.
- **Step 4** rolls 52: success.
- **Step 5:** at tick 6, the doors swing open just as Snag reaches for an empty peg. He comes down the corridor with his club, finds three loose prisoners and a miner, and spins for the drum. Its head is in tatters.

That's the plan done. On the world turn, Snag acts from his sheet. The drum is useless, so he bargains: "Uzga'll skin me either way."

**If step 3 had failed,** the ring would be on Snag's belt and his Suspicion at 1. He's still drinking, but the keys stay on him until his Suspicion is back to 0. The party can lie still for a cycle to bring it down and try again on the next Sit. That costs three of the eight ticks left before Uzga.

**If step 4 had failed,** the same moment at tick 6 has Snag diving for the drumstick. A fight starts, with the Warrens one beat away from being alerted.

### 11.3 Where the encounter really is: the doorway

Every option here comes from state that's already in the packet:

- **Kill Snag.** He's aware, so the rogue can't backstab him; it would be a fight. The step is tagged `lethal`, which trips Fern's conditional stance ("won't kill needlessly"). Overriding her costs relationship.
- **Tie him up.** This costs a step. Uzga finds him at tick 12, and he talks.
- **Take his deal.** The Maw's faction rules say bribes work and loyalty doesn't.
  - The deal: they tie him up so it looks like he fought, and in exchange he shows them the crawl behind the cask.
  - The crawl is the hidden exit. It's a surprise placed at design time, and it only helps.
  - Getting the deal is a social check. His loyalty lasts exactly as long as staying loyal is safer than betraying them.
- **Get the gear.** The sack is under the table: one step to grab, and it slows them afterward.
- **Deal with Brannoc.** He's slow and weak, but he knows where the spring diggings are, and that's Fern's personal quest.
- **Watch the clock.** It's tick 6, and Uzga comes at tick 12.

### 11.4 What carries into the Warrens

- **Alert:** none (drum gnawed, Snag dealt with), low (Uzga finds the cells empty at tick 12), or high (the drum was beaten).
- **Gear:** recovered or not.
- **Snag:** dead (and Fern sees the player differently), tied up and talking, or an ally of convenience who knows the ale crawls through the Warrens.
- **Brannoc:** with them, or left behind to tell Uzga which way they went.
- **The exit they took:**
  - the stair, into the working levels;
  - or the crawl, straight to the cistern and a quiet start to Act 2.

### 11.5 What's left out, and which Gravenhold failure each omission addresses

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

### 11.6 The risk to watch

The card-edit loop is the new place a stall could hide. If each edit turned up one more problem, the player would be playing whack-a-mole with the AI that sets the odds, instead of with the companions as in the old game.

v4 already defends against this: that AI prices every observer along the whole route at its projected tick, so card 1 surfaces every timing problem at once. If playtests show players needing three or more edits, check whether the opening and world turns make the cycle visible enough. Don't fix it by adding a rule.

---

## Appendix: the reference encounters, in brief

- **The heist (the Vantorre counting house).**
  - Two clocks, driven by the bells and the orchestra.
  - The keys and the signet ring sit where guest and servant spaces meet.
  - A dumbwaiter connects the split groups.
  - Exits close in order as the alarm rises.
  - The stolen ledger ends the job in a choice, not a roll.
  - A lesson learned: the Baron's office was open only twice, too few times to learn unaided. Either give the players the schedule through legwork, or open with a long, free stretch of time.
- **The cell block.**
  - One guard with a three-beat cycle: Pace, Sit, Drink.
  - The key ring's location moves with the beat.
  - Each cell has one thing to do: physical work, talking, or seeing.
  - A horn is the only alarm, and the warren's shift drums mark the deadline.
  - It deliberately drops loops, disguises and varied exits, because the decisions happen inside the cells.
- **The cavern.**
  - A goblin camp that sees, and a wolf den that smells.
  - Disguises that help with one side and give you away to the other.
  - A ring of loops, with chase-stoppers matched to each kind of pursuer.
  - A patrol the players can watch.
  - A surprise (the Hunt) that only opens options, and a deadline they know about (the discovery of the escape) that closes them.
  - Four exits, each leading to a different next scene.
