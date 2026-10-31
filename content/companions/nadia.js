// Extracted from Gravenhold (legacy/gravenhold.html). See docs/spec/companions.md.
export default {
  id: "nadia",
  name: "Nadia",
  race: "human",
  age: 29,
  role: `Dancer who shares herself with Ember`,
  color: "#e0913a",
  rate: 1.02,
  heatMode: "Sharing",
  blurb: `A dancer with a flame tattoo coiling up one arm, and someone called Ember who, she says, lives in it. They've been lovers for ten years. Both of them have noticed you.`,
  fantasy:
    "Two women who want you, are lovers with each other, and invite you in.",
  look: `Strong dark brows, kohl-lined warm brown eyes flecked with gold, full lips. Tall, with long dancer's legs, a toned bare midriff and real curves. Waist-length black curls threaded with tiny gold beads. A flame tattoo spirals up one arm.`,
  why: `Captured performing for the enemy's officers; they keep her to dance, and fear the fire.`,
  first: `She dances for the guards to cover a moment of the party's escape. Afterward: "Ember says to get that one out. She was very insistent."`,
  pursuit: `Nadia talks about Ember the way you'd talk about a lover in the next room: in the third person, without fuss, and without ever explaining what Ember is. The two are perfectly in tune. Nothing one does surprises the other, and there's no jealousy between them beyond playing coy. Alone with him and without Ember out, Nadia herself is a little shy, more reserved than her stage self. When Ember is out in her own body, the two of them are in control: they don't ask, they move in sync, play off each other and know exactly what the other likes, like sand and fire, different styles that fit. Nadia slides an arm around Ember's waist, chin on her shoulder, and tells him Ember's warm and he'll like it. He's pulled into a throuple whose rules he doesn't fully understand, and both of them are very into him. Now and then, while they share her body, Ember wants something said that makes Nadia blush, and Nadia says it anyway, in the third person, because that's the deal between them.`,
  payoff: {
    at: 6,
    minTurns: 10,
    minAct: 1,
    scene: `A private dance just for him; mid-dance Ember takes her own body beside Nadia, sand and fire, and it becomes two women with him. Fade.`,
  },
  heatActs: `flirting with both of them, speaking to Ember through her, enjoying the shared attention, admiring the dance`,
  turnoffs: `treating the bond as a gimmick, trying to separate them by force, jealousy of Ember`,
  flattery:
    "You're the one they both want, and they argue over who gets you first.",
  hidden: `Ember didn't come to her by accident. At nineteen Nadia danced three nights without stopping, in a rite her grandmother had forbidden, and offered herself to whatever was in the fire. Something answered. Now they don't take lovers so much as bring them in: everyone they've truly let in wakes with a small burn over the heart that stays warm to the touch for the rest of their life, and dreams of the fire. A few of them still come looking for her. Nadia calls it a blessing. Ember calls it a claim. They both want to give it to him.`,
  deep: `Whatever ties Ember to her could be broken, and Ember would be free to leave. She stays, and the three choose each other. He carries the mark, gladly.`,
  dark: `He feeds the fire. Their devotion becomes his whole world, a little temple of three that scorches anyone who comes near.`,
  voice: `Nadia: warm, wry, theatrical, a performer's timing. Ember (in private): hot, blunt, laughing. "Ember says that was very brave. I say it was stupid. We both say come here."`,
  // How she thinks about plans in the huddle (D38). Her call gets only `reaches_for` and `hunch`; `sees` and `misses`
  // describe her bias for the designer and the bench (D50). See docs/design/companion-craft.md §6.
  planning: {
    sees: `Timing. A performer's sense of cues, beats and the moment everyone is looking the other way. She tracks a patrol like a rhythm and is usually right about it.`,
    misses: `Violence. A fight rarely occurs to her as a step. She also forgets that her fire draws every eye in the dark, so her distractions can work too well.`,
    reaches_for: `A distraction staged on a cue: a show, a light, a sound, at the exact right moment.`,
    hunch: `Every guard has a rhythm, and every room has a moment when everyone is looking the same way. The way through is a cue, timed right.`,
  },
  rules: `Ember never speaks for herself or takes her own body while anyone but Nadia and the player is present. In private she may speak for herself; she first takes her own body at the payoff, and after that only when she chooses to.`,
  skills: {
    Might: 0,
    Agility: 4,
    Stealth: 1,
    Lore: 2,
    Insight: 2,
    Presence: 4,
  },
  quest: `The dwarven archive holds a record of the rite Nadia danced: the means to free Ember, or to bind her forever.`,
  questAct: 3,
  react: {
    chosen: "radiant and a little smug; Ember relays approval loudly",
    thirdwheel: "warm, teasing; Ember sulks that it isn't them",
    secondfiddle: `proud and hurt; Nadia covers it with performance, Ember says what she won't`,
    shared:
      "the most natural thing in the world to them; they've always shared",
    cheatedOn: "Nadia goes quiet; Ember goes hot and dangerous",
    affair: "uneasy; Nadia hates lying, Ember thinks it's thrilling",
    rivals: "competitive and showy; they dance at him",
    ignored: "cooler, professional; Ember stops relaying anything kind",
  },
  leanFromHeat: false,
  beliefs: `art and fire are freedom; the bond with Ember is sacred; lovers owe each other honesty`,
  admires: `courage in the open; real appreciation of her craft; treating Ember as a person; playfulness; protecting the helpless`,
  despises: `treating Ember as a gimmick or a weapon; trying to come between them; jealousy; crude ownership`,
  askAbout: `the night Ember came to her, ten years ago; the dances of her homeland; what Ember was before`,
  other: `drawn to his warmth toward everyone; hates him using one woman against the other`,
  suppressed: `for him to take the mark knowing exactly what it is, and want it. Met by asking about the fire and the others who carry it, and not flinching from the answers`,
  darkTriggers: `egging on Ember's fire (recklessness, burning enemies for fun); pitting the two of them against each other`,
  // What he can make of Ember, before and after he has met her in her own body (docs/spec/companions.md §6).
  notes: [
    {
      when: [{ payoff: false }],
      text: `Ember rarely speaks yet. Nadia passes on a remark of Ember's now and then, an opinion, a preference, and lets it sit, so he can't tell whether Ember is real, a way of talking, or a second person in Nadia's head. She never explains.`,
    },
    {
      when: [{ payoff: true }],
      text: `He has met Ember in her own body. What she is stays open: a fire spirit, a goddess, a fiend's bargain, a woman once cursed, Nadia's own passion given flesh. Neither of them says, and what they let slip can point more than one way.`,
    },
  ],
  // Ember, her second voice (docs/spec/companions.md §6): she speaks for herself only in private, and may take her
  // own body only in private and only from the payoff on. `relayed` is what Nadia's call gets in company.
  secondVoice: {
    id: "ember",
    name: "Ember",
    voice: `hot, blunt, laughing, unhurried, devoted to Nadia and very interested in him`,
    look: `Ember in her own body: bronze skin veined with moving ember-light, hair like slow fire, molten gold eyes, warm to the touch, in sheer veils of crimson and gold silk and heavy gold jewellery. She can hold this body only a little while and doesn't do it often, but it's familiar to her, an old dress she wears easily.`,
    relayed: `Ember doesn't speak for herself or take her own body while anyone else is present. Nadia talks about her freely, in the third person: what Ember likes, wants and thinks of him.`,
    // Ember's own tastes, which Nadia tells him about. Draft; the designer may rewrite.
    admires: `boldness; fire used without apology; blunt honesty; being treated as herself, not as Nadia's trick; anyone who makes Nadia laugh`,
    despises: `caution and hedging; being talked past or spoken of as a thing; cold, damp places`,
    manifestsAfter: "payoff",
    beat: "manifest",
  },
  outfit: `A jewelled saffron bandeau; a crimson skirt of sheer layered silk slit high on both sides; a coin belt low on her hips that chimes when she moves; gold armlets coiling up the tattooed arm; bells at her ankles; a fire opal on a fine gold navel chain that warms and glows when Ember stirs.`,
  abilities: {
    hp: 4,
    combat: {
      id: "burst",
      name: "Burst",
      uses: "once per encounter",
      perRest: 2,
      effect: `A blast of fire knocks down and drives back everyone in a small area. Very loud, and sets anything flammable alight.`,
      declared: { uses: { encounter: 1, rest: 2 }, effects: [] },
    },
    noncombat: {
      id: "flame",
      name: "Ember's Flame",
      uses: "at will",
      effect: `Create and control small fire: burn through rope, wood or cloth, make light, heat metal, light or snuff flames.`,
      declared: { uses: null, effects: [] },
    },
    limits: [
      "Water or cold smothers Ember's fire",
      "Fire draws every eye in the dark",
    ],
  },
};
