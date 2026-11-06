// The Gravenhold world (docs/spec/campaign.md §9, D150): the place every adventure in it escapes, and everything about it
// that changes with the world. The rules every world shares are in content/setting.js. Extracted from Gravenhold
// (legacy/gravenhold.html), except `invariants`, which comes from the design docs, and `roles`, `heart`, `life`,
// `tensions` and `features`, written for D150. acts[0] is Act 1.
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
      rules: `Chaotic and numerous, weak alone. Bribes work, loyalty doesn’t; grudges and infighting are exploitable. Noise draws crowds. War drums signal alarms. Hobgoblin officers are disciplined exceptions.`,
      goal: `Kharzakul means to devour the vault’s prisoner and become ancient overnight. Captives are tribute and key-blood.`,
      boss: "Warchief Grizzak, and Kharzakul himself",
    },
    illithid: {
      name: "The Silent Colony",
      short: "mind flayer colony",
      desc: `Mind flayers and their thralls, linked to an elder brain grown in the old dwarven forges.`,
      rules: `Telepathy: planning aloud near thralls or flayers risks being overheard; disciplined minds can shield (Lore or Insight). Thralls share senses, so one seeing you can mean all know. The elder brain’s pulse is the alarm.`,
      goal: `The colony means to dominate the vault’s prisoner and make it a brain of brains. Captives are specimens and keys.`,
      boss: "Ulitharid Xel’voth, and the elder brain",
    },
    undead: {
      name: "The Court of Ash",
      short: "lich court",
      desc: `The undead court of the Lich Queen Morvaine: dead nobles, bound knights, and the Ashbound, her living servants.`,
      rules: `Undead sense life (warmth, breath, heartbeat), not sight; masking life is stealth. Fire and holy power matter. They never tire. Court etiquette binds them: old courtesies can be invoked and bargained with. Mourning bells are the alarm.`,
      goal: `Morvaine means to merge with the vault’s prisoner and become a god of death. Captives are vessels and keys.`,
      boss: "Lord Chamberlain Vesk, and Morvaine herself",
    },
    drow: {
      name: "House Vaelith",
      short: "exiled drow house",
      desc: `An exiled drow house and its slaves, rebuilding power in the dark beneath the mountain.`,
      rules: `Bright light weakens them. House politics: rival daughters and ambitious priestesses can be played against each other. Spider-silk alarm webs, poison, slaves of many peoples who may be allies.`,
      goal: `Matron Ilphara means to bind the vault’s prisoner as her house’s patron and buy their way back into the Underdark.`,
      boss: "First Daughter Quavra, and Matron Ilphara",
    },
  },
  acts: [
    {
      name: "The Cells",
      sanctuary: `a collapsed shrine to a forgotten dwarven god, half-buried in rubble, one candle niche still whole`,
      mechanics: `guard rhythms, keys and cell locks, noise discipline, improvised tools; the party has almost no gear`,
      goal: `escape the cell block, recover some gear, learn who your companions are`,
    },
    {
      name: "The Warrens",
      sanctuary:
        "a forgotten cistern behind a forge wall: warm stone, dripping water",
      mechanics: `an alarm network (bells, drums, runners), crowds, the enemy’s internal politics and grudges, disguises, other prisoners who can help or betray`,
      goal: `cross the working levels, find the way down, learn what the enemy is really doing`,
    },
    {
      name: "The Undercroft",
      sanctuary: `a dwarven reading hall with a natural hot spring, shelves of stone books`,
      mechanics: `dwarven mechanisms with consistent rules (water locks, counterweights, rune-wards, pressure systems), ancient guardians, the fortress’s own history`,
      goal: `uncover why Gravenhold was built and why each of you was taken; find the way to the Sanctum and the forgotten shaft`,
    },
    {
      name: "The Sanctum",
      sanctuary: "a sealed warden’s tomb: carved stone sleepers, utter silence",
      mechanics: `the faction’s strongest magic and elite guards, ritual sites, every earlier mechanic combined`,
      goal: `decide whether to slip past the ritual, sabotage it, or stop it at a cost; reach the shaft`,
    },
    {
      name: "The Ascent",
      sanctuary: `a ledge in the shaft where, far above, a thread of real sky shows stars`,
      mechanics: `climbing, pursuit, collapse; allies freed earlier return and enemies spared come back`,
      goal: "get out of Gravenhold alive, together",
    },
  ],
  openAct: {
    min: 2,
    sanctuary: "wherever the road offers shelter",
    mechanics: `the open world beyond Gravenhold; its consequences follow the party; the same puzzle standards apply`,
    goal: "whatever the story becomes",
  },
  playerSecrets: [
    `A forgotten ancestor of theirs was of the dwarven Warden-line; the vault’s final seal answers to their blood.`,
    `Years ago the vault’s prisoner touched their dreams and chose them as a vessel; it whispers more clearly the deeper they go.`,
    `They were not captured. They volunteered to infiltrate Gravenhold for a crown agent, and their memory was magically sealed to protect the mission; fragments return.`,
  ],
  roomKinds: {
    exploration: `a place built for open exploration: lore, history, wonder, planning the next move (a vast collapsed hall, a dwarven gallery, an underground river)`,
    social: `a place built around people: someone to trade with, learn from, or deal with, who is not an immediate threat (a black-marketeer serving prisoners, a fellow captive, an off-duty guard who doesn't care)`,
    respite: `a place that invites lingering and closeness: no time pressure, beauty or comfort, somewhere to wash and talk (a hot spring, a quiet chapel, a moonlit shaft)`,
  },
  // World facts that never change once in play (docs/spec/context.md, act gates).
  invariants: [
    {
      id: "heartbeat",
      fromAct: 4,
      text: `The Hollow King's heartbeat: a slow drumbeat beneath the fortress. It always keeps the same slow beat.`,
    },
  ],
};
