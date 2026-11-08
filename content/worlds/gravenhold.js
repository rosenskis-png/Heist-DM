// The Gravenhold world (docs/spec/campaign.md §9, D150): the place every adventure in it escapes, and everything about it
// that changes with the world. The rules every world shares are in content/setting.js. Extracted from Gravenhold
// (legacy/gravenhold.html), except `invariants`, which comes from the design docs, `roles`, `heart`, `life`,
// `tensions` and `features`, written for D150, and `regions`, `mysteries` and the factions' ladders, written for D164.
// regions[0] is Act 1's.
export default {
  id: "gravenhold",
  name: "Gravenhold",
  // The place, in a sentence or two.
  place: `Gravenhold, a dwarven prison-citadel sunk into a mountain, built centuries ago to contain an ancient being sealed in its deepest vault (the Hollow King). The dwarves vanished; the fortress was abandoned.`,
  escape: `The main gate is sealed and garrisoned; the only real escape is a forgotten dwarven shaft that begins below the vault, so the party must descend toward the danger before climbing out.`,
  // The role nouns companion text uses as slots (`{place}`, `{master}`, ...; capitalised as `{Master}` at the start
  // of a sentence). Filled by src/campaign/world.js.
  roles: {
    place: "Gravenhold",
    kind: "fortress",
    builders: "the dwarves",
    builders_adj: "dwarven",
    rulers: "the occupiers",
    commander: "the occupying commander",
    master: "the warden",
    // The working levels, the old deep parts, and the seat of power.
    working: "the Warrens",
    depths: "the Undercroft",
    sanctum: "the Sanctum",
  },
  // What's sealed at the bottom, that the factions want.
  heart: `The Hollow King, an ancient being sealed in the deepest vault. Every faction in the fortress wants it: to devour it, dominate it, merge with it or bind it.`,
  // What the place is busy with, whatever the party does.
  life: `Four powers squat in the dead dwarven fortress and work it for their own ends: goblins hauling tribute up to the dragon in the gate tower, thralls labouring in the old forges, a dead court keeping its etiquette in the halls, a drow house scheming in the dark below. Prisoners are labour, tribute and keys to the vault.`,
  // What the factions want from each other, not just from the party.
  tensions: [
    `Every faction wants the vault's prisoner for itself, so each would gladly see another's ritual fail.`,
    `The Red Maw's dragon wants the drow's slaves as tribute; House Vaelith wants the goblins out of the deep roads.`,
    `The Court of Ash keeps old dwarven courtesies the others don't know, and trades in captives with whoever pays.`,
  ],
  // What the place holds that companions' stories need (each companion's \`needs\`, D150).
  features: {
    sacred_spring: `A sacred spring rises beneath the fortress; the occupiers are mining it.`,
    builders_archive: `The dwarves left an archive of their records deep in the fortress.`,
    builders_wards: `The dwarves' old wards still hold in parts of the fortress, and bind what they caught.`,
    masters_records: `The warden keeps chambers and records of everyone the fortress has held, bought or sold.`,
  },
  factions: {
    goblins: {
      name: "The Red Maw",
      short: "goblin warband",
      desc: `Goblins and hobgoblins of the Red Maw warband, serving Kharzakul, a young red dragon nesting in the gate tower.`,
      rules: `Chaotic and numerous, weak alone. Bribes work, loyalty doesn’t; grudges and infighting are exploitable. Noise draws crowds. Hobgoblin officers are disciplined exceptions.`,
      goal: `Kharzakul means to devour the vault’s prisoner and become ancient overnight. Captives are tribute and key-blood.`,
      ladder: [
        { name: "Snagtooth the Keymaster", hook: "a fat goblin jailer who wears every key in the block on a chain of ear-bones" },
        { name: "Warchief Grizzak", hook: "a scarred hobgoblin who has never lost a duel and duels anyone who questions him" },
        { name: "Kharzakul", hook: "a young red dragon coiled on the gate tower's hoard, hungry to become ancient overnight" },
      ],
    },
    illithid: {
      name: "The Silent Colony",
      short: "mind flayer colony",
      desc: `Mind flayers and their thralls, linked to an elder brain grown in the old dwarven forges.`,
      rules: `Telepathy: planning aloud near thralls or flayers risks being overheard; disciplined minds can shield. Thralls share senses, so one seeing you can mean all know.`,
      goal: `The colony means to dominate the vault’s prisoner and make it a brain of brains. Captives are specimens and keys.`,
      ladder: [
        { name: "Thrall-Overseer Bek", hook: "a dwarf thrall with blank eyes who speaks for the colony in a voice that isn't his" },
        { name: "Ulitharid Xel’voth", hook: "a towering mind flayer with six tentacles, who collects the brains of clever prisoners" },
        { name: "The elder brain", hook: "a vast brain floating in a forge-vat, its pulse felt through every wall" },
      ],
    },
    undead: {
      name: "The Court of Ash",
      short: "lich court",
      desc: `The undead court of the Lich Queen Morvaine: dead nobles, bound knights, and the Ashbound, her living servants.`,
      rules: `Fire and holy power matter. They never tire. Court etiquette binds them: old courtesies can be invoked and bargained with.`,
      goal: `Morvaine means to merge with the vault’s prisoner and become a god of death. Captives are vessels and keys.`,
      ladder: [
        { name: "Sir Hollin the Ashbound", hook: "a living knight in a dead court's livery, desperate to earn his own undeath" },
        { name: "Lord Chamberlain Vesk", hook: "a skeletal courtier who forgives anything but bad manners" },
        { name: "Morvaine, the Lich Queen", hook: "a queen in a crown of grave-candles, who means to wear the Hollow King like a cloak" },
      ],
    },
    drow: {
      name: "House Vaelith",
      short: "exiled drow house",
      desc: `An exiled drow house and its slaves, rebuilding power in the dark beneath the mountain.`,
      rules: `Bright light weakens them. House politics: rival daughters and ambitious priestesses can be played against each other. Poison, and slaves of many peoples who may be allies.`,
      goal: `Matron Ilphara means to bind the vault’s prisoner as her house’s patron and buy their way back into the Underdark.`,
      ladder: [
        { name: "Slavemaster Nilzra", hook: "a drow with a whip of living spider-silk who sells prisoners to whoever pays" },
        { name: "First Daughter Quavra", hook: "the matron's heir, who would trade her mother to the dragon for a throne" },
        { name: "Matron Ilphara", hook: "the house's mother, carried on a palanquin of spiders, who means to bind the Hollow King as her god" },
      ],
    },
  },
  regions: [
    {
      name: "The Cells",
      what: `the prison block under the gate tower, where the goblins keep tribute and prisoners for the dragon`,
      sanctuary: `a collapsed shrine to a forgotten dwarven god, half-buried in rubble, one candle niche still whole`,
      holders: ["goblins"],
      feel: `cramped, filthy and loud; torchlight, chains, goblin jeering, the dragon's heat through the stone above`,
    },
    {
      name: "The Warrens",
      what: `the old dwarven working levels: forges, kitchens and halls, now run by four powers who hate each other`,
      sanctuary: "a forgotten cistern behind a forge wall: warm stone, dripping water",
      holders: ["goblins", "illithid", "undead"],
      feel: `crowded and busy; forge-glow, thrall gangs, a dead court's etiquette in the great halls, everyone watching everyone`,
    },
    {
      name: "The Undercroft",
      what: `the deep dwarven halls the occupiers fear: archives, wards and the machinery that keeps the vault shut`,
      sanctuary: `a dwarven reading hall with a natural hot spring, shelves of stone books`,
      holders: ["drow", "undead"],
      feel: `vast, dark and silent; carved halls going on forever, old wards humming, drow lights far off`,
    },
    {
      name: "The Sanctum",
      what: `the vault's antechambers, where every faction is racing to finish its ritual on the Hollow King`,
      sanctuary: "a sealed warden's tomb: carved stone sleepers, utter silence",
      holders: ["goblins", "illithid", "undead", "drow"],
      feel: `enormous and shaking; four rituals at once, the Hollow King's heartbeat in the floor`,
    },
    {
      name: "The Ascent",
      what: `the forgotten dwarven shaft below the vault, climbing up through the mountain to the sky`,
      sanctuary: `a ledge in the shaft where, far above, a thread of real sky shows stars`,
      holders: ["goblins", "drow"],
      feel: `a long climb through collapse and pursuit, with whatever the party did below coming after them`,
    },
  ],
  mysteries: [
    {
      id: "seal_of_fire",
      truth: `The dwarves sealed the Hollow King with fire: the vault's wards are forge-runes, and flame still binds it.`,
      edge: { act: 4, at: "climax", text: `Steps that turn fire on the Hollow King or its bindings are more likely to work than they look.` },
      clues: [
        { id: "forge_runes", says: `"...the runes must be struck hot, in the vault's own forge, or the King will..."` },
        { id: "burned_warden", says: `Dwarves with torches drive a great shadow down into a pit; one of them burns on the threshold, holding the door.` },
        { id: "cold_wards", says: `"Where the forges went cold, the wards went quiet. Keep the fires lit below, whatever it costs."` },
        { id: "ash_hymn", says: `"Fire on the door, fire on the King, fire till the deep stops stirring."` },
      ],
    },
    {
      id: "court_of_debts",
      truth: `The Court of Ash is bound by the dwarves' old oaths of hospitality: a guest who claims the old rite can't be harmed at table.`,
      edge: { act: 2, at: "undead", text: `In the Court of Ash's rooms, invoking dwarven guest-rite or old courtesies makes its people far more likely to hold back.` },
      clues: [
        { id: "guest_tablet", says: `"Who breaks bread under this roof by the old rite shall not be..."` },
        { id: "chamberlain_rule", says: `"Even the Queen bows to a guest who asks the rite. Even the dead keep that much."` },
        { id: "spared_thrall", says: `"I asked for bread the dwarf way, and the dead man put down his sword and let me go."` },
      ],
    },
  ],
  playerSecrets: [
    `A forgotten ancestor of theirs was of the dwarven Warden-line; the vault’s final seal answers to their blood.`,
    `Years ago the vault’s prisoner touched their dreams and chose them as a vessel; it whispers more clearly the deeper they go.`,
    `They were not captured. They volunteered to infiltrate Gravenhold for a crown agent, and their memory was magically sealed to protect the mission; fragments return.`,
  ],
  // World facts that never change once in play (docs/spec/context.md, act gates).
  invariants: [
    {
      id: "heartbeat",
      fromAct: 4,
      text: `The Hollow King's heartbeat: a slow drumbeat beneath the fortress. It always keeps the same slow beat.`,
    },
  ],
};
