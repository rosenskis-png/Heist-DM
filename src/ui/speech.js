// Text to speech (D104), ported from Gravenhold's `Speech` (legacy/gravenhold.src.js 2737–2837). Browser only: it
// uses the Web Speech API and touches no engine state. The ranking and assignment are pure and tested with plain
// voice objects ({ name, lang, voiceURI, localService }).

// Novelty voices nobody wants reading a romance.
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|junior|organ|ralph|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|eddy|flo\b|reed|rocko|sandy|shelley|kathy|hysterical|deranged|pipe organ/i;
// Voices that read as female, for companions.
const FEM = /female|samantha|karen|moira|tessa|victoria|zira|fiona|susan|allison|ava|kate|martha|libby|sonia|aria|jenny|emma|michelle|nicky|zoe|joanna|salli|kimberly|ivy|amy|olivia|natasha|clara|sara|catherine|stephanie|serena|nora|isha|siri female/i;

export const isFemale = (v) => FEM.test(v.name) || /female/i.test(v.voiceURI ?? "");

// Higher is better. Apple names its downloaded voices "Ava (Premium)" or "Zoe (Enhanced)", with ".premium." or
// ".enhanced." in the voice URI; other platforms mark neural voices in the name.
export function score(v) {
  const id = `${v.name} ${v.voiceURI ?? ""}`;
  let s = 0;
  if (/premium/i.test(id)) s += 8;
  if (/enhanced|natural|neural|wavenet|studio|journey/i.test(id)) s += 6;
  if (/google|online|siri/i.test(id)) s += 2;
  if (v.localService) s += 1;
  if (isFemale(v)) s += 1;
  if (/en[-_](us|gb|au|ie|ca|nz)/i.test(v.lang)) s += 1;
  return s;
}

// A voice's identity: its URI, which tells apart voices that share a name (a standard and a downloaded Samantha).
export const idOf = (v) => v.voiceURI || v.name;

// Its quality, from Apple's URI or the name: "Premium", "Enhanced", or "" for a standard voice.
export const quality = (v) => {
  const id = `${v.name} ${v.voiceURI ?? ""}`;
  return /premium/i.test(id) ? "Premium" : /enhanced/i.test(id) ? "Enhanced" : "";
};

// How the picker shows it: name, region, quality.
export const labelOf = (v) => [v.name.replace(/\s*\((premium|enhanced)\)/i, ""), `(${v.lang})`, quality(v)].filter(Boolean).join(" ");

// English voices, best first, without novelties.
export const rank = (voices) => voices.filter((v) => /^en/i.test(v.lang) && !NOVELTY.test(v.name)).sort((a, b) => score(b) - score(a));

// A voice for each speaker id: the one chosen for it if it exists, else the best unused female voice, else the
// best unused one. The narrator gets the best voice nobody else has.
export function assign(voices, speakers, chosen = {}) {
  const ranked = rank(voices);
  if (!ranked.length) return {};
  // A choice is a voice URI (or, from older saves, a name).
  const by = (id) => (id ? ranked.find((v) => idOf(v) === id) ?? ranked.find((v) => v.name === id) : null);
  const used = new Set();
  const out = {};
  for (const id of speakers) {
    const v = by(chosen[id]) ?? ranked.find((x) => isFemale(x) && !used.has(idOf(x))) ?? ranked.find((x) => !used.has(idOf(x))) ?? ranked[0];
    out[id] = v;
    used.add(idOf(v));
  }
  out.narrator = by(chosen.narrator) ?? ranked.find((x) => !used.has(idOf(x))) ?? ranked[0];
  return out;
}

// Split text into sentence-sized pieces: long utterances get cut off on some browsers.
export function chunks(text, max = 220) {
  const clean = text.replace(/[*_#]/g, "").trim();
  const sentences = clean.match(/[^.!?…]+[.!?…]+["'”’)]*\s*|[^.!?…]+$/g) ?? [clean];
  const out = [];
  for (const s of sentences) {
    const last = out[out.length - 1];
    if (last && last.length + s.length <= max) out[out.length - 1] = last + s;
    else out.push(s);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

// ---------- the browser side ----------

const synth = () => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);
export const available = () => !!synth();

// The voices the browser offers now. Some (iOS, Chrome) fill the list in late; `onChange` hears about it.
export function voices(onChange) {
  const s = synth();
  if (!s) return [];
  if (onChange) s.addEventListener?.("voiceschanged", onChange);
  return s.getVoices();
}

// iOS only lets speech start from a tap. Call this from one (a Send button), so later answers can be read aloud.
export function unlock() {
  const s = synth();
  if (!s || unlock.done) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  s.speak(u);
  unlock.done = true;
}

export function stop() {
  try {
    synth()?.cancel();
  } catch {}
}

// Read lines aloud in order: each { text, speaker, rate?, volume? }, with `cast` from `assign`.
export function speak(lines, cast, { onEnd } = {}) {
  const s = synth();
  if (!s) return;
  s.cancel();
  const queue = lines.flatMap((l) => chunks(l.text).map((text) => ({ ...l, text })));
  queue.forEach((l, i) => {
    const u = new SpeechSynthesisUtterance(l.text);
    const v = cast[l.speaker] ?? cast.narrator;
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = l.rate ?? 1;
    u.volume = l.volume ?? 1;
    if (i === queue.length - 1 && onEnd) u.onend = onEnd;
    s.speak(u);
  });
}
