# Encounter craft

How to design encounters that play the way a great DM would run them. This document consolidates the design discussions behind the project into principles that apply at any scale. Those discussions covered a heist told three ways, the same heist's layout and timing told three ways, a small cell-block escape, and a mid-prison cavern.

**Who this is for.** Anyone writing an encounter by hand, and anyone designing the encounter generator and its validation (`docs/spec/packet.md`, roadmap Phase 7).

**This is not a prompt.** Rules in a prompt compete with each other (`docs/principles.md`). Give the generator only a small slice of this document, as judgment. Wherever a principle can be checked, turn it into structure or an engine check instead (the validation section of `docs/spec/packet.md`).

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

**Size an encounter by its decisions, not its length in minutes.** The packet already sizes encounters by the number of plans committed (`docs/spec/packet.md` §1). Keep an encounter small enough that all of its facts fit in every call (principle 4). Split a large set piece like the heist at its natural seams, such as the ballroom and the basement. Each piece then hands its state to the next (§3.8).

---

## 3. Principles at any scale

### 3.1 Decisions before dice
- **A roll answers "did my choice work?", never "what should I do?"**
  - "Roll Stealth" is not a choice.
  - "Go now while the music covers you, or wait for the quiet window and risk the bell" is a choice.
- **Leverage first, then the roll.** Without leverage, no roll talks the guard round. With leverage, the roll decides how far he goes.
- **State the stakes before rolling:** what success gets and what failure costs (the plan card). Careful wording is not a mechanism.

### 3.2 Problems, not puzzles
- **A puzzle has one solution, the designer's. A problem has constraints, resources and people.** "One lock, one key" is a puzzle pretending to be a problem.
- **Never write down solutions.** That includes "the intended route" and "alternatives." Any list of routes drags the DM back toward steering players onto them. See the reflexes in `docs/principles.md`, and the PATHS field in Gravenhold's generator (`legacy/README.md`).
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
  - In the cell block, the war drum connects to the jailer's response to a loose prisoner, to the starving rats in the gutter who can gnaw its hide head, and to whether a loud plan is safe.
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
- **NPCs act from their sheets, not from difficulty numbers.** A sheet has wants, fears, and things they'll never do (`docs/spec/packet.md` §2).
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
- **No improvised twists** (principle 8). Everything the players don't see coming is placed while designing.

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
  - If the drum sounded, the party arrives to full alert.
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

- **Define observers by their senses, not just their positions:** who sees, who hears, who smells, and in what light. The packet already requires every observer to state what it can see and hear (`docs/spec/packet.md`).
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
    - **Then throw both runs away.** They are tests: never stored and never sent to any call (`docs/spec/packet.md` §1).
11. **Learnability check.** For every pattern or fact the players need: how can they learn it, and how cheaply, within the time they have?
12. **Show-before-it-matters check.** For every behavior rule: when will the players first see it?

### Don't over-build

This guide pushes toward more prepared structure, and the reflexes in `docs/principles.md` warn about exactly that: pre-simulating everything (tick schedules for every NPC, senses for every creature, exhaustive contents) makes the game feel like a stealth video game.

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

- **Which principles become engine checks:** the validation section of `docs/spec/packet.md`. They are warnings, not rejections, until playtests show which ones predict a bad encounter.
- **The worked example:** the Cells, rebuilt as a packet, in `fixtures/cells/walkthrough.md`.

Everything the engine can't check stays as judgment. Improve that judgment with better information (the purpose line, the table read, worked examples), not with more rules in the prompt.

---

## Appendix: the reference encounters, in brief

- **The heist (the Vantorre counting house).**
  - Two clocks, driven by the bells and the orchestra.
  - The keys and the signet ring sit where guest and servant spaces meet.
  - A dumbwaiter connects the split groups.
  - Exits close in order as the alarm rises.
  - The stolen ledger ends the job in a choice, not a roll.
  - A lesson learned: the Baron's office was open only twice, too few times to learn unaided. Either give the players the schedule through legwork, or open with a long, free stretch of time.
- **The cell block** (built out in full in `fixtures/cells/walkthrough.md`).
  - One guard with a three-beat cycle: Pace, Sit, Drink.
  - The key ring's location moves with the beat.
  - Each cell has one thing to do: physical work, talking, or seeing.
  - The war drum is the only alarm, and the sergeant's arrival at the watch change is the deadline.
  - It deliberately drops loops, disguises and varied exits, because the decisions happen inside the cells.
- **The cavern.**
  - A goblin camp that sees, and a wolf den that smells.
  - Disguises that help with one side and give you away to the other.
  - A ring of loops, with chase-stoppers matched to each kind of pursuer.
  - A patrol the players can watch.
  - A surprise (the Hunt) that only opens options, and a deadline they know about (the discovery of the escape) that closes them.
  - Four exits, each leading to a different next scene.
