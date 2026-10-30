// Extracted from Gravenhold (legacy/gravenhold.html). See docs/spec/companions.md.
export const skills = [
  "Might",
  "Agility",
  "Stealth",
  "Lore",
  "Insight",
  "Presence",
];

export const strike = {
  id: "strike",
  name: "Strike",
  type: "basic",
  uses: "at will",
  effect: `Basic attack with whatever is at hand: roll Might or Agility against the enemy's defence. Success: the enemy loses 1 HP (2 with a real weapon). Failure: the enemy hits back and the attacker loses 1 HP.`,
};

export const enemyTiers = {
  minion: {
    hp: 1,
    dc: 10,
  },
  guard: {
    hp: 2,
    dc: 13,
  },
  elite: {
    hp: 3,
    dc: 13,
  },
  champion: {
    hp: 5,
    dc: 16,
  },
  boss: {
    hp: 8,
    dc: 16,
  },
};

export const combatRule = `Combat uses HP. Combat abilities whose conditions are met bypass HP: the enemy is down. Disables take an enemy out of the exchange without a kill. Anyone can Strike (basic attack; code applies the damage). At the end of each exchange, every aware enemy still engaging a character who wasn't dealt with deals 1 HP to that character (report it in combat.damage). Being outnumbered loses fights. A character at 0 HP is DOWN: out of the fight, never dead, with a lasting complication. If the whole party is down, the fight is lost: capture or a costly retreat, then play continues.`;
