// Text to speech (D89): the pure parts of src/ui/speech.js, with plain voice objects.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rank, assign, chunks, score } from "../src/ui/speech.js";

const v = (name, lang = "en-US", voiceURI = name, localService = true) => ({ name, lang, voiceURI, localService });
const list = [
  v("Fred"),
  v("Daniel", "en-GB"),
  v("Samantha"),
  v("Ava (Premium)", "en-US", "com.apple.voice.premium.en-US.Ava"),
  v("Zoe (Enhanced)", "en-US", "com.apple.voice.enhanced.en-US.Zoe"),
  v("Thomas", "fr-FR"),
];

test("iPhone premium and enhanced voices rank first; novelties and other languages are left out", () => {
  const names = rank(list).map((x) => x.name);
  assert.deepEqual(names.slice(0, 2), ["Ava (Premium)", "Zoe (Enhanced)"]);
  assert.ok(!names.includes("Fred") && !names.includes("Thomas"));
  assert.ok(score(v("x", "en-US", "com.apple.voice.premium.en-US.x")) > score(v("Samantha")));
});

test("each speaker gets her chosen voice or a different good one; the narrator gets one nobody has", () => {
  const cast = assign(list, ["a", "b"], { b: "Daniel" });
  assert.equal(cast.a.name, "Ava (Premium)");
  assert.equal(cast.b.name, "Daniel");
  assert.ok(![cast.a.name, cast.b.name].includes(cast.narrator.name));
  assert.deepEqual(assign([], ["a"]), {});
});

test("long text is read in sentence-sized pieces, with markdown stripped", () => {
  const long = "She laughs. ".repeat(40) + "*Then* she stops.";
  const parts = chunks(long);
  assert.ok(parts.length > 1 && parts.every((p) => p.length <= 220));
  assert.ok(parts.at(-1).endsWith("Then she stops."));
});
