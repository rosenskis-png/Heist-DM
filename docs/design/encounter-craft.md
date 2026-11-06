# Encounter craft

How to design a room that plays the way a great DM would run it, in a game where the DM rules (D125) and every adventure is a one-way escape through a living place (D140). This is the rethought design D139 asked for. Its sources are the Angry GM's scenario design series (reading notes in `docs/design/references/angry-scenario-design.md`), the designer's discussions of 2026-11-05 and 06, and what the table playtest showed about the Cells.

**Who this is for.** Anyone designing a room by hand, and the generator's sketch and critique calls (`docs/spec/generation.md`), which get slices of it.

**This is not a prompt.** Rules in a prompt compete (`docs/principles.md`). The generator gets small slices as judgment; anything checkable becomes a check in code.

---

## 1. What a room is now

- **A room is one place in a living place,** busy with its own purpose: a kitchen feeding a garrison, a chapel mid-rite, a forge on deadline. Its people are most likely hostile, but they're going about their business, not hunting the party. The party is a nuisance to it, not its subject.
- **Design a situation the DM runs, not a mechanism the player solves.** The engine era built locks and listed how they behave. Now a room is people who want things, in a place with real constraints, under pressure that moves on its own. The packet's job is to give the DM's judgment good material, never to have judged already. The judgment is the product.
- **The line isn't structure against openness. It's structure that creates pressure against structure that pre-solves.** A routine that finds the empty peg creates pressure. A property that says "several rats can carry it quietly" pre-solves.
- **A room is a scenario at room scale,** with a goal, a challenge, outcomes and context, like an adventure but smaller. Not every room is: a quiet room, a merchant or a campfire is there for pacing, a companion moment, a trade or a breath, and has no challenge (§11). That's fine. Empty rooms make a dungeon, too.
- **Everything is made of the same few levers:** what must happen to leave, what's worth having, what pushes, what it costs, and where it leads.

## 2. The design statement

Before anything is placed, state the room in prose (not bullets, which lose the "why it's hard"):

- **Where it starts:** an in-game circumstance that reveals the goal, shows why it's worth pursuing, and points somewhere to begin. None of that needs saying out loud.
- **The goal:** what the players are trying to accomplish, from inside the game. It isn't a motivation (fun, story) or a reward (loot). Implicit goals are best: the players infer them from the situation, and genre conventions make the inference reliable ("Because That's How the Game Works": an enemy patrol between you and the stair means getting past it).
- **The major challenge:** *the players must accomplish X by doing Y, and Y is hard because of Z.* If the goal and the challenge say the same thing, or the challenge fits in one imperative phrase ("stop the ritual"), the goal has been mistaken for the challenge. The challenge must follow directly from the goal, not by way of a gauntlet.
- **The outcomes, plural:** every reasonable way out the other end, good, bad and indifferent. One outcome is a railroad. Outcomes are where the players can actually get, and the goal is where they're trying to get; the goal must visibly close when an outcome is reached, or they won't know it's over.
- **The x-factor:** the players' main way of engaging with this room (explore, interact, acquire, overcome, get through). The goal, the challenge and the pressure should all be about it. Picking the x-factor first is a good way to find the challenge.

Winning and losing aren't outcomes. They're the players' own judgment of the outcome, read from every clue the room gives: how it ends, who reacts how, what's left behind. That judgment is designable, and the verdict call (D146) and the companions are its voices.

## 3. Challenge is choice

- **The game tests one thing: choices.** Which approach now, and how to prepare. A roll answers "did my choice work?", never "what should I do?". A difficulty band is probability, not challenge: remove every roll, and the decisions should still differ.
- **A choice is meaningful when the options differ in what they lead to, and different players would choose differently.** If everyone would pick the same option, it's a calculation. Some easy, meaningless steps are fine; a room made only of them is a slog of easy rolls.
- **What makes a choice meaningful:** costs that differ in *kind*, not amount (picking the lock takes time, forcing it makes noise); incomplete but not *zero* information (with none, the choice is random); obscured truths to deduce; options too different to compare; dilemmas (which wanted thing to give up); and prizes that compete (§7). Real choices mix these.
- **Never build a creativity test.** "Here's a problem, solve it" stalls when nobody has the flash of inspiration, which is most of the time. Players aren't genius problem-solvers, but they think they are, and their sense of agency comes from figuring things out, not from unlimited freedom. Design the room to be playable by a plain player using only what the opening makes salient and what their sheets say. The DM honours creative ideas when they come; the room must never depend on them.
- **At least two visible approaches, made of properties in view.** Visible means the system's defaults the players already know (fight, sneak, talk, pick, force) and leading description (the chandelier hangs on a frayed rope directly over the brute). It never means a list of options in the narration, and never routes in the packet.
- **Presentation is a difficulty dial.** The size of the leap from what's described to the option is the difficulty. The ideal miss ends with "we should have seen it from this, that and that". Tune so an inexperienced player very likely finds what they need and only a sharp one finds the edge.

## 4. Say what things are, never what they're for

- **Properties, not answers.** Material, size, state, who cares about it: "iron, six keys, heavy, the jailer's". What it lets you do is a ruling the DM makes when a plan arrives. The test: could the sentence be read as a hint? Then it's an answer.
- **Constraints are fixed before play; affordances are ruled in it.** What says *no* (it's iron, it's warded, the door is barred from the far side, she'd never cross the sergeant) has to be written down, because the DM leans toward yes and won't supply resistance unprompted. What says *yes* (whether one rat can drag the ring) is the DM's to rule. Pre-rulings may close doors, never open them.
- **A person's wants are both.** "Terrified of the sergeant" is a constraint the DM must honour and a lever the player can pull. That's why people are the richest material a room has.
- **Nothing is true until the players know it.** The garrison's exact size doesn't exist; there are as many as the challenge needs. That's not the quantum ogre (forcing a pet encounter whatever the players choose): using the limits of what players perceive to build fair challenges is design; cancelling out their choices isn't.

## 5. Where resistance comes from

- **No single point of failure for the danger.** If removing one element empties the threat (gnaw the drum and there's no alarm, no antagonist move, no deadline), the room is a puzzle with one key. Pressure should come in more than one kind (people, time, place, cost), so a clever bypass changes the situation rather than ending it.
- **People resist better than locks.** A lock resists once. A person adapts, bargains, panics, lies, wants something, and can be won over: people work on both sides at once, pushing back and offering a way forward.
- **At least two sides that want different things from each other,** not just from the party. That's where leverage comes from, and where surprise comes from without the DM inventing anything: their wants colliding.
- **A good solution creates the next problem.** The guard is tied up, so someone will miss him; the keys are gone, so the block is a crime scene.
- **The opposite failure is yes-and mush:** nothing resists, every plan works, the DM narrates success after success. Whatever resists has to be designed in.

## 6. Pressure is a gradient, not a cliff

- **No binary deadlines.** A hard cut-off at a tick the DM's own time rulings decide reads as the DM deciding whether you lose. Instead, pressure rises in steps, each step visibly changing the room (the water reaches the archive, the rite's light fades, the one who could guide them is led away). The order is shown before it bites, and no step ends the room.
- **The question is never whether, but how well.** A room may require something before the party can leave. Do it fast enough to grab extras, just fast enough to leave clean, or so slowly it costs.
- **Visible pressure should be a resource, not a punishment meter.** Something the players can choose to spend for speed or boldness, the way hit points are spent in a roguelike, not a counter that triggers when full. Hidden pressure is a slow gradient the fiction shows. No room needs a visible resource; one may have its own.
- **Waiting must cost something,** or the best play is always to wait for the perfect moment. Something one-way (an arrival, a closing, someone losing patience) makes waiting a choice.
- **Fairness lives in the world.** Everything a plan depends on must be perceivable or learnable before the player commits (D36). Show every behaviour rule before it matters: the goblin gives the den a wide berth before the den matters.
- **Few sources of time.** One or two things drive the room's clock, so windows come from how they interact. If the player needs arithmetic to use a timing, that's the engine's job, shown as a fact.

## 7. Prizes, the way on, and momentum

- **Prizes are one lever among several,** never a room full of loot. Gold, a relic, an outfit, a companion moment, progress on a companion's goal, knowledge of what's ahead, or the choice of where to go next (D147). Optional content has diminishing returns, and too much drowns the room.
- **The way on is part of the prize.** The party leaves by an exit it managed to reach (D144). One setup among many: to the left a prize guarded by one thing, leading to one kind of room; to the right another, leading elsewhere. A bold, successful party takes both and chooses; an adequate one takes one path; a poor one gets neither and is carried on. A forced way on should lead to a different kind of story, not simply a worse room.
- **Exits feel different.** Warm wet air one way, a kitchen's clatter the other. Choosing between identical doors is the worst choice a room can offer. Nothing two rooms ahead is shown (D140).
- **Momentum is progress that strengthens the party against what's coming,** not just progress. Things the party carries out (an ally, a weakness learned, a relic) should matter later. Inertia (what pushes back) and momentum are separate pulls, and the players should feel both.

## 8. Tone is a range

A room can sit anywhere from "very stressed about time" to "this is basically a fantasy playground". The living place has strange, funny and beautiful corners, and a well-equipped, successful party should get to do epic things. The same forge can be a desperate scramble for a hurt party and a stage for a party carrying the right tools.

## 9. The companions belong to the situation

- **A room can press on a companion's values,** and that's a source of stakes no ordinary scenario has: a plan that's efficient but costs a companion something she believes in. A stance the situation earned ("if the rats get hurt, I'm out") gives the romance pillar something to do between camps.
- **Their stories can be in the room:** a feature a companion needs (her spring, her archive, D150), or her personal quest, placed when its act allows (D83). Never forced, never improvised.
- **Everyone has work through properties, not slots.** Abilities touch the world because the world has properties to grab, not because a task was assigned to each character. Watch for a party member whose fun depends on the plan failing.

## 10. Blockout: blocks are games, not rooms

- **Lay out the gameplay before the architecture.** First the decision spaces (what is decided where, how they connect, which are optional), then dress them as a place. A block can be several rooms (a three-room library is one block), and a gap between blocks needn't be a wall (an impassable river with bridges, one retracted).
- **Realistic buildings are too open:** built so anyone can reach anything, which is the opposite of a room. Make the layout fit the blocks with rubble, flooding, barred doors, breaches, growth.
- **A golden path may live in the sketch, never in the packet.** The best route through the room is designer's working material, thrown away at encode like the critique's runs. The DM never sees a route.
- **Hide the path.** A side space or a cut between branches so the structure doesn't show.
- **Loops where routing matters, a chokepoint only where you mean one.** On a loop, being spotted starts a chase you can recover from; in a tube it means retreat or fight.
- **Put key objects where different spaces meet** (the servants' door into the hall), and set distances by how fast help arrives.

## 11. Kinds of room

Code draws each room's kind (D144); the room is written for it.

| Kind | What it's for |
|---|---|
| **Encounter** | A situation with a goal, a challenge, pressure and outcomes. Most rooms. |
| **Quiet** | A breath: a companion moment, a discovery, mood, scouting in disguise, maybe an outfit. No objective; something may happen if they linger. |
| **Oddity** | Something strange the place holds: a wonder, a bargain, a test, a fairy's puzzle. Light pressure at most; usually a prize and a story. |
| **Merchant** | Someone to trade with, for gold (D147). Things with prices, and a person with wants. |
| **Campfire** | Rest at night, everyone present (D142). A room whose only job is a safe, memorable place to sleep. |
| **Climax** | The act's peak: always won (D148). Stakes are how epic the escape is, a choice at the peak, and what comes away with them. What the act built up should show here. |
| **Sanctuary** | The act's main campfire, where it ends. |

## 12. Fights

A fight is a plan (D130). Fights are for something (hold the door, stop the horn), never "everyone down". The setup is the fun. Most people stop before they're beaten: each sheet says when (`breaks`). Outnumbered is the worst place to be. Threats are shown before they land. Violence costs: noise, bodies, how the companions feel about it.

## 13. Senses, disguise and pursuit

Define observers by their senses where it matters. Different senses make disguises double-edged (a cloak fools eyes, not noses). Pursuers should differ, and something that stops each kind should be within reach (water breaks a scent trail; a climb stops anything without hands).

## 14. The generator's order, and its tests

1. **Seed** (code): the kind, the x-factor, the shape, what makes its choices meaningful, the tone, motifs, the act and the factions present, and the exits' kinds.
2. **Design statement** (§2), then **blockout** (§10).
3. **People** with wants, fears and what they'll never do, and at least two sides wanting different things.
4. **Things** with properties (§4), and the **pressure** (§6).
5. **Prizes and exits** (§7), and **what the opening shows**: everything usable named, nothing said about what it's for (D136).
6. **Critique:** walk four approaches, clean and messy: force, guile, something odd, and a plain player with no clever ideas. Report: a clean run that produces nothing interesting; one roll deciding the room; an approach that hits a wall with nothing to grab; one approach plainly best; a party member with nothing to do; an element nothing touched; a bypass that empties the threat; a property that reads as a hint; only one side wanting anything; a companion the room never touches.
7. **Revise:** cut, connect or swap. Never add (D120). The good versions of a room have fewer branches and more connections.

## 15. Failure patterns

| At the table | Cause | Fix |
|---|---|---|
| The winning plan was written in the packet | properties that are answers | say what things are (§4) |
| One bypass empties the threat | one antagonist, one alarm, one deadline | pressure of several kinds (§5) |
| The last plans are mop-up on easy rolls | the room ran out of resistance | people who adapt; a solution that makes a new problem |
| Companion talk is arithmetic about a schedule | precision the player has to compute | pressure, not timetables; computed facts (§6) |
| A plan "fails" because the deadline was a tick away | a binary cliff at a DM-ruled time | a gradient of steps (§6) |
| Nobody sees the way forward | a creativity test | two visible approaches, a plain-player check (§3) |
| One player plays while the rest watch | the solution sits in one position | work through properties; parts spread across the party |
| Valid ideas get shut down | the DM protecting an intended solution | no routes anywhere in the packet |
| A clean success produces nothing | stakes only exist on failure | prizes, costs and the way on (§7) |
| Every room feels the same | the average room, every time | the seed's axes; the x-factor (§2, §14) |
| Nothing resists | yes-and mush | constraints written down (§4, §5) |
| Players argue at identical doors | undifferentiated exits | exits that feel different (§7) |
