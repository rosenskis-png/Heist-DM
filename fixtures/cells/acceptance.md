# Acceptance test: the Cells

The engine's first fixture (roadmap, Phase 3). It runs against `fixtures/cells/packet.json` (written in Phase 1 from `fixtures/cells/walkthrough.md` §1) with a seeded random number generator. The engine must:

1. **Load and validate** the packet, and reject:
   - a variant that contains a route field;
   - a variant whose geometry disagrees with its connections (a door that isn't on the wall its two zones share).
2. **Project the first card's steps** against Snag's cycle, starting on the current beat (Drink, D16), as the party expects the world to be (D36):
   - step 1, Fern's change, has no observer, so it's automatic;
   - every step is priced, each as if the earlier steps went as planned: the drag past the stool as if Fern had the ring;
   - record, internally and unshown, that the keys aren't on the peg during the Pace step, and that leaving on the next Pace sets off the drum;
   - **execute card 1** per `fixtures/cells/card1.results.json`: the party sees the peg go empty as the Pace beat begins, so the plan is interrupted before Fern's run (D46), and the end state matches.
3. **List the observers per step for the second card,** matching the table in `fixtures/cells/walkthrough.md` §2: none on steps 1 and 2; Snag behind the peg on step 3; Snag at the cask on step 4; Snag in the corridor on step 5, covered by step 4 (the drum is gnawed).
4. **Roll steps 3 and 4,** apply the stated failure consequences, and stop the plan on step 3's failure but not on step 4's. The three runs and their end states are in `fixtures/cells/card2.results.json`.
5. **Run the suspicion ladder:**
   - at level 1, the far cell's corner becomes visible to Snag;
   - at level 2, the Drink beat is dropped;
   - one full still cycle brings suspicion down by 1;
   - decay is blocked while the peg is empty.
6. **Fire Uzga's arrival at tick 21,** and the fail-forward ending if Fern is still in her cell.
   - **Variant:** mark Uzga's arrival not `known`, and commit a plan with a step on tick 21 in the guardroom. The plan is interrupted before that step, and the warning roll decides whether the party's next plan acts before she lands (D36).
   - **Timing:** a step whose `when` never holds is interrupted after `max_wait` ticks (`wait_expired`); a `when` or `if` that names an unknown routine is rejected.
   - **Perception:** with the party in their cells, a step "when he sits down" is checked through Lyra, who hears his bones clicking through the guardroom wall (`hears_through_walls`). With Lyra moved out of earshot and no one else able to see or hear him, the plan is interrupted there (`cant_perceive`, D39).
   - **Slack:** with slack at −10 and +10, Uzga's arrival loads at ticks 17 and 25; at ±3 it still loads at tick 21 (the 2% steps are rounded once, not per point); the fail-forward ending still fires when she arrives, because it tests her `arrived` flag; and a run that ends at tick 8 lowers slack by 1 (D41).
7. **Change Snag's reaction from "go for the drum" to "bargain"** when the drum is flagged as gnawed.
8. **End Fern's Wild Shape** when the party reaches the stair top, and check the objective.
9. **Trip Fern's stance** on a step tagged `lethal`.
10. **Never put the heartbeat invariant into any Act 1 context,** and never put `fixtures/cells/walkthrough.md` §5 into an Act 1–3 prompt.
11. **Derive the layout facts** the AIs receive (zone sizes, distances), and put no coordinates in any assembled context.
12. **Write the hand-off** at the end: alert, gear, Snag's and Brannoc's fates, companions present, the exit used.
