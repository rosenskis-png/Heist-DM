// Camp in the game (docs/spec/calls/campfire.md, D45, D190): at a campfire or the sanctuary the player sits with both
// companions or one, talks and acts in the moment, gives the outfits waiting for them, and each answer moves how they
// feel. One continuous scene per campfire (D113), kept in the session as `fire` and gone when the party walks on.
//
// | The player                | Calls                                                         | Here        |
// |---------------------------|---------------------------------------------------------------|-------------|
// | says or does something    | the campfire call, for each companion present, in turn (D85)  | `campTalk`  |
// | whispers to one, with both | the campfire call, for her alone (D108)                      | `campTalk`  |
// | sits with one alone        | none: a shapeshifter may come in her place (D101)            | `sitWith`   |
// | gives a waiting outfit     | the campfire call, for whoever is there (D184)               | `giveOutfit`|
//
// No DOM, so `node --test` can play it with recorded outputs.
import * as Rel from "../campaign/relationship.js";
import { addOutfit } from "../campaign/wardrobe.js";
import { resolveParty } from "../campaign/roster.js";
import { clueTexts } from "../campaign/world.js";
import { campfireCall } from "../calls/campfire.js";
import { envFor } from "./session.js";

// Whether the party is at a fire: a campfire room or the sanctuary, not yet left.
export const atFire = (session) => !!session.camp && ["campfire", "sanctuary"].includes(session.camp.way.here) && !session.ended && session.state.packet.mode === "room";

// The scene at this fire, made once: everyone together to start.
export function fireOf(session) {
  session.fire ??= { with: "both", to: "all", disguise: null, transcript: [] };
  return session.fire;
}

const membersOf = (session) => resolveParty(session.state.party.slice(1), session.world);
const nameOf = (session, id) => session.state.party.find((p) => p.id === id)?.name ?? id;

// Who the player sits with: "both", or one companion's id. Alone with one, a shapeshifting other may come in her place,
// by her own declared chance (D101); the player sees the face she wears.
export function sitWith(session, value) {
  const fire = fireOf(session);
  const ids = session.state.party.slice(1).map((p) => p.id);
  if (value !== "both" && !ids.includes(value)) throw new Error(`no one called ${value} is at the fire`);
  Object.assign(fire, { with: value, to: "all", disguise: null });
  if (value === "both") return fire;
  const w = Rel.whoComes(session.camp.romance, membersOf(session), value);
  session.camp.romance = w.state;
  if (w.actor !== value) fire.disguise = { actor: w.actor, as: value };
  return fire;
}

// Words to everyone, or a whisper to one of the two over the rings (only with both there).
export function speakTo(session, to) {
  const fire = fireOf(session);
  fire.to = fire.with === "both" && to !== "all" ? to : "all";
  return fire;
}

// The scene as `viewer`'s next call reads it (D95, D108, D113): a private scene she wasn't in never reaches her; the
// player's whispers reach only the one whispered to; her ring words to him reach no one else; words to the other over
// the rings reach the other; a hidden action reaches the other only if caught, as plain scene text.
export function sceneFor(session, viewer) {
  const fire = fireOf(session);
  const party = session.state.party;
  const comp = (id) => party.find((p) => p.id === id);
  return fire.transcript.flatMap((t) => {
    if (t.present && t.present !== "both" && t.present !== viewer) return [];
    if (t.from === "player") return t.to && t.to !== viewer ? [] : [{ from: t.to ? "player, to you alone over the rings" : "player", text: t.text }];
    if (!t.out) return [];
    const c = comp(t.from);
    const mine = t.from === viewer;
    const name = t.as && !mine ? comp(t.as).name : c.name + (t.as ? ` (wearing ${comp(t.as).name}'s face)` : "");
    const shown = (g) => g.aside === "no" || mine || g.aside === "to_other" || (g.aside === "action" && t.caught);
    const tag = (g) => {
      if (g.aside === "to_other") return mine ? " (to her alone, over the rings)" : " (to you alone, over the rings)";
      if (!mine) return "";
      return g.aside === "ring" ? " (to him alone, over the rings)" : g.aside === "action" ? " (out of her sight)" : "";
    };
    return t.out.segments.filter(shown).map((g) => ({ from: (g.speaker === "narrator" ? "narrator" : g.speaker === "second_voice" ? c.secondVoice?.name ?? "second voice" : name) + tag(g), text: g.text }));
  });
}

// The scene as the player sees it: everything but what passed between the two companions alone, which shows only as
// a look exchanged, and with a disguised companion shown by the face she wears. Her `inner` is the developer view's.
export function fireView(session) {
  const fire = fireOf(session);
  return fire.transcript.map((t) => {
    if (t.from === "player") return { from: "player", text: t.text, to: t.to ?? null, gift: t.gift ?? null };
    if (t.error) return { from: t.as ?? t.from, error: t.error };
    const shownAs = t.as ?? t.from;
    const other = session.state.party.slice(1).find((p) => p.id !== t.from);
    const c = session.state.party.find((p) => p.id === t.from);
    return {
      from: shownAs,
      segments: t.out.segments.map((g) =>
        g.aside === "to_other"
          ? { kind: "look", text: `${nameOf(session, shownAs)} and ${other?.name ?? "the other"} exchange a look; something passes between them over the rings.` }
          : { kind: g.speaker === "narrator" ? "narration" : "line", who: g.speaker === "second_voice" ? c.secondVoice?.name ?? "second voice" : g.speaker === "self" ? nameOf(session, shownAs) : null, text: g.text, aside: g.aside },
      ),
    };
  });
}

// What she brings to the fire from the road (D190): the rooms since the last fire, with only her own reactions, and the
// moments that stayed with her from earlier.
export function roadFor(camp, id) {
  const since = (camp.since ?? []).map((m) => ({
    room: m.room,
    what_happened: m.happened,
    ...(m.went ? { how_it_went: m.went } : {}),
    ...(m.felt?.[id]?.length ? { you_felt: m.felt[id].map((x) => `${x.sign > 0 ? "liked" : "disliked"}${x.intensity >= 2 ? " strongly" : ""}: ${x.reason}`) } : {}),
  }));
  const kept = (camp.kept?.[id] ?? []).map((x) => `${x.room ? `${x.room}: ` : ""}${x.sign > 0 ? "liked" : "disliked"}: ${x.reason}`);
  return { since, kept };
}

// The player says or does something at the fire. Each companion present answers in turn, by campaign turn (D85); with
// both there, the second must move something if the first didn't. A whisper is answered by her alone. A call that
// fails stops the exchange there, and the page shows it. `prompts` are the call prompts.
export async function campTalk(session, io, prompts, { text, gift = null }) {
  if (!atFire(session)) throw new Error("The party isn't at a fire.");
  const fire = fireOf(session);
  const both = fire.with === "both";
  const ids = session.state.party.slice(1).map((p) => p.id);
  const whisper = both && ids.includes(fire.to) ? fire.to : null;
  const answering = whisper ? [whisper] : both ? ids : [fire.disguise?.actor ?? fire.with];
  const present = both ? "both" : fire.disguise?.actor ?? fire.with;
  fire.transcript.push({ from: "player", text, present, ...(whisper ? { to: whisper } : {}), ...(gift ? { gift } : {}) });
  session.camp.romance = Rel.nextTurn(session.camp.romance);
  const order = answering.length > 1 ? Rel.speakingOrder(session.camp.romance, answering) : answering;
  const members = membersOf(session);
  const clues = clueTexts(session.world, session.camp.clues ?? []);
  let mustAdvance = false;
  for (const id of order) {
    const self = session.state.party.find((p) => p.id === id);
    const other = session.state.party.slice(1).find((p) => p.id !== id);
    const as = !both && fire.disguise?.actor === id ? fire.disguise.as : null;
    const where = { private: !both, inPerson: true, mustAdvance, ...(as ? { disguisedAs: as } : {}) };
    const c = { with: both ? ids : [id], ...(as ? { disguisedAs: as } : {}), scene: sceneFor(session, id), mustAdvance, log: session.camp.log ?? [], clues, ...roadFor(session.camp, id) };
    const env = envFor(session, prompts);
    let out;
    try {
      out = await campfireCall(io, env, c, self, [other], members, where);
    } catch (e) {
      fire.transcript.push({ from: id, present, ...(as ? { as } : {}), error: String(e?.message ?? e) });
      throw e;
    }
    const me = members.find((m) => m.id === id);
    const rom = Rel.applyCampfire(session.camp.romance, me, members, out, where);
    const caught = Rel.catchAside(rom, out, where);
    session.camp.romance = caught.state;
    // Where she stands for the rooms ahead (D79): written here, read in encounters.
    if (out.standing) {
      const was = session.standing?.[id] ?? { mood: "steady", learned: [] };
      session.standing = { ...session.standing, [id]: { mood: out.standing.mood, why: out.standing.why, learned: [...(was.learned ?? []), ...(out.learned ?? [])].slice(-4) } };
    }
    fire.transcript.push({ from: id, present, ...(as ? { as } : {}), out, ...(caught.caught ? { caught: true } : {}) });
    mustAdvance = !out.advances;
  }
  return fire;
}

// The player gives an outfit waiting in the pack (D184) to a companion at the fire: it's hers from now on, and she
// answers the gift in the scene.
export async function giveOutfit(session, io, prompts, { outfit, to }) {
  if (!atFire(session)) throw new Error("The party isn't at a fire.");
  const fire = fireOf(session);
  const here = fire.with === "both" ? session.state.party.slice(1).map((p) => p.id) : [fire.with];
  if (!here.includes(to)) throw new Error(`${nameOf(session, to)} isn't sitting with you.`);
  const fit = (session.camp.gifts ?? []).find((g) => g.id === outfit);
  if (!fit) throw new Error("there's no such outfit waiting");
  // A shapeshifter in another's place takes the gift as that one would: it's still given to the one he thinks he's with.
  session.camp.romance = addOutfit(session.camp.romance, to, fit.id, { name: fit.name, text: fit.text });
  session.camp.gifts = session.camp.gifts.filter((g) => g.id !== outfit);
  if (fire.with === "both") speakTo(session, "all");
  return campTalk(session, io, prompts, { text: `I give ${nameOf(session, to)} something I carried out for her: ${fit.name} (${fit.text}). It's hers now (outfit id "${fit.id}").`, gift: fit.id });
}
