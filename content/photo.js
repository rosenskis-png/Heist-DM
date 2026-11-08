// The photo prompt's fixed words (docs/spec/calls/photo.md, D170). Code assembles them around a companion's picture
// identity (`photo` in her file) and the slots the photo call fills, so she looks the same in every picture. The
// words are Gravenhold's, tuned against an image model: ordinary, short and concrete.
export const photo = {
  opener: "Photoreal digital-art of D&D.",
  // One of these always follows her garments: grit for any dirt, fighting, prison grime or wear; clean otherwise.
  grit: "She is covered in dirt. Her skin is unwashed, and her clothing has seen heavy use with rips and stains from combat. No makeup, poor skincare, blemishes.",
  clean: "No makeup, natural skin texture.",
  // Her face when her file has no picture identity.
  face: "Naturally pretty face",
  // Each slot's value when it's left empty.
  defaults: {
    setting: "grimy medieval dungeon at night",
    light: "so dark it's nearly black",
    position: "In the shadows",
    action: "standing still",
    surroundings: "wet stone, mildew, rusty iron bars",
    light_source: "a single dim torch",
  },
  // Places to start from on the Dressing Room (bench/dressing.html): the slots that set the scene, in the same register.
  scenes: [
    { name: "Prison cell", setting: "grimy medieval dungeon at night", light: "so dark it's nearly black", surroundings: "wet stone, mildew, rusty iron bars", light_source: "a single dim torch", grit: true },
    { name: "Hot spring cave", setting: "a hidden underground cavern with mossy stone and hanging roots", light: "lit only by a natural hot spring of glowing cyan water, steam drifting", surroundings: "wet mossy stone, hanging roots, drifting steam", light_source: "the glowing water, casting cyan reflections across her face and the cave walls", grit: false },
    { name: "Campfire", setting: "a forest clearing at night", light: "dark beyond the circle of firelight", surroundings: "tall dark pines, a bedroll, packs and a cooking pot", light_source: "the campfire, warm orange light flickering across her face", grit: false },
    { name: "Tavern", setting: "a crowded low-beamed tavern late at night", light: "warm, dim and smoky", surroundings: "rough wooden tables, tankards, a stone hearth", light_source: "the hearth fire", grit: false },
    { name: "Candlelit room", setting: "a small stone bedchamber at night", light: "dim and warm", surroundings: "a narrow bed, rumpled linen, a shuttered window", light_source: "a single candle on the sill", grit: false },
    { name: "Moonlit ruins", setting: "crumbling stone ruins on a hill at night", light: "cold and blue, nearly dark", surroundings: "broken columns, ivy, scattered rubble", light_source: "the full moon", grit: false },
    { name: "Rainy street", setting: "a narrow city street at night in heavy rain", light: "dark, wet and glistening", surroundings: "wet cobblestones, shuttered shopfronts, running gutters", light_source: "one lantern above a doorway", grit: false },
    { name: "Mid-fight", setting: "a torchlit dungeon corridor in the middle of a fight", light: "harsh and flickering", surroundings: "blood on stone, a fallen guard, iron doors", light_source: "a wall torch", grit: true },
  ],
};
