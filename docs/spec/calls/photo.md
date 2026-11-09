# Photo call

**Job:** fill the slots of a fixed text-to-image prompt for one moment with one companion, so the designer can see her drawn (D170). Code assembles the prompt; the call never writes it whole. Gravenhold's photo card, ported.
**Runtime:** `sample.json`, replay off, `default`. On the bench only (the Dressing Room, `bench/dressing.html`); the game doesn't make photos yet.
**Sees:** her picture identity (age, role, face and identity lines, her garments line, bold or soft, her usual expression), her `look` as the game describes her (a shapeshifter's current form, if she's changed it), what she has on, whether her second voice stands beside her, and the moment in the designer's words.
**Never sees:** her name, her story, the style guide, or anything about the world. The slots are for an image model, which would draw a name or a story term literally.

## Picture identity
The fixed words about her, in her file's `photo` (`docs/spec/companions.md` §2): `role` (what she is, with any non-human features: "succubus with deep red skin, curled black horns…"), `face`, `identity` (eyes, hair, build), `garments` (her usual outfit as a short line), `bold` and `expression`, and `age` when her own isn't a number. A tie entry's `photo` replaces fields for that partner. A second voice's `photo` is a line describing her beside the companion. They're written for an image model, in the register of the examples in `prompts/photo.md`, and reach no other call. `photoOf` in `src/campaign/photo.js` resolves it: without a `photo`, her race is her role and her face is a plain default; while she wears anything but her usual outfit, her garments line is what she has on.

They're a second rendering of her `look` and `outfit`, so the two can drift: the Dressing Room shows them side by side.

## Returns (`schemas/calls/photo.js`)
The slots: `setting`, `light`, `position`, `action` (one clause, caught mid-moment), `face_extra` (marks the moment adds, or empty), `garments`, `grit` (true for any dirt, fighting or wear), `surroundings`, `light_source` (exactly one) and `expression`.

## Assembled by code
`photoPrompt` in `src/campaign/photo.js`, from the fixed words in `content/photo.js`:

> Photoreal digital-art of D&D. Scene of [setting], [light]. [position] is a {age}yo {role}[action]. {face}[face_extra]. {identity} [her second voice, if asked for] [garments]. [grit or clean line]. Surrounded by [surroundings]. only source of light is [light_source]. Expression is [expression]

An empty slot takes its default (a dark dungeon cell, her usual garments and expression). The designer can edit every slot by hand after the call, or fill them without it.

## Validated
The slots name no one: neither companion nor a second voice. A failure goes back for the one retry.
