// The table read (docs/spec/state.md): how the encounter has actually gone, as facts with no verdicts.
// Sent only to the world call, which judges pacing from it (docs/spec/calls/world.md).

// The run of identical outcomes at the end of the rolls, if it's two or longer.
function streak(rolls) {
  const last = rolls.at(-1);
  if (last === undefined) return null;
  let n = 0;
  while (n < rolls.length && rolls[rolls.length - 1 - n] === last) n++;
  return n >= 2 ? { of: last ? "successes" : "failures", length: n } : null;
}

// `said` is the player's own recent messages, word for word, from any interface.
export function tableRead(s, said = []) {
  const h = s.history;
  const [lo, hi] = s.packet.intent.expected_plans ?? [];
  return {
    plans_committed: h.plans,
    plans_expected: lo === undefined ? null : `${lo}–${hi}`,
    rolls: h.rolls.slice(-8).map((ok) => (ok ? "success" : "failure")),
    streak: streak(h.rolls),
    consequences_landed: h.landed.slice(-5),
    plans_interrupted: h.interrupts,
    tick: s.tick,
    player_said: said.slice(-3),
  };
}

// Folds a card's results into the history the table read uses.
export function record(s, card, results) {
  const priced = new Map(card.pricing_call.steps.map((p) => [p.n, p]));
  s.history.plans += 1;
  for (const r of results) {
    for (const roll of r.rolls) {
      s.history.rolls.push(roll.success);
      if (!roll.success) {
        const risk = priced.get(r.n)?.risks.find((x) => x.id === roll.risk);
        if (risk) s.history.landed.push(risk.on_fail.summary);
      }
    }
    if (r.outcome === "interrupted") s.history.interrupts += 1;
  }
}
