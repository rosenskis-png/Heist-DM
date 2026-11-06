// A companion file (content/companions/<id>.js). Fields: docs/spec/companions.md §2; special cases: §6.
// Every file in the registry is checked against this by `node --test`, so a new or rewritten companion that
// misses a field, or misspells one, fails before it reaches a prompt.
import { withDefs } from "./defs.js";
import { r, list, obj } from "./shape.js";
import { configText, stageLabels, tracks, axes } from "../content/relationship.js";

const t = r("text");
const SKILLS = ["Might", "Agility", "Stealth", "Lore", "Insight", "Presence"];
const all = (keys, value) => obj(keys, Object.fromEntries(keys.map((k) => [k, value])));
const some = (keys, value) => ({ ...all(keys, value), required: [] });

const ability = obj(["id", "name", "uses", "effect", "declared"], {
  id: r("id"),
  name: t,
  uses: t,
  perRest: { type: "integer", minimum: 1 },
  effect: t,
  declared: r("ability"),
});

// A relationship gate: alternatives, each a set of terms that must all hold (src/campaign/relationship.js `holds`).
const compare = { enum: ["<", "<=", "=", ">=", ">"] };
const term = { oneOf: [{ type: "boolean" }, { type: "array", prefixItems: [compare, { type: "number" }], minItems: 2, maxItems: 2 }] };
const gate = list({ type: "object", minProperties: 1, additionalProperties: term }, 1);

// She can change her shape (D101): what she can do, for her call; and the chance she comes in the other companion's
// place when the player sits with that one alone, by the first alternative whose gate holds.
const shapeshift = obj(["text"], { text: t, impersonation: list(obj(["chance"], { chance: { type: "integer", minimum: 0, maximum: 100 }, when: gate })) });

// A tie's entry for one other companion: fields it sets or extends, and what it adds.
const tieEntry = obj([], {
  set: { type: "object", additionalProperties: t },
  append: { type: "object", additionalProperties: t },
  gift: t,
  bond: t,
  partnerReacts: t,
  // Special cases she has only with this partner (D101).
  grants: obj([], { shapeshift }),
  // What she holds against or hides from this partner: always in her own call, never in the partner's (D99).
  secret: t,
  // The parked portrait feature (D24). On no allowlist.
  image: { type: "object", additionalProperties: t },
});
// A view of another companion: one number (affection) or any of the three axes (D92).
const view = { oneOf: [{ type: "integer", minimum: -10, maximum: 10 }, { ...some(axes, { type: "integer", minimum: -10, maximum: 10 }) }] };
// Limits on her view of another companion: a range per axis, how far one answer may move it, and the beat that
// lifts the limits (D92).
const range = { type: "array", prefixItems: [{ type: "integer" }, { type: "integer" }], minItems: 2, maxItems: 2 };
const limits = obj([], { ...Object.fromEntries(axes.map((k) => [k, range])), perScene: { type: "integer", minimum: 0 }, until: r("id") });

export const companionFileSchema = withDefs({
  $id: "companion_file",
  ...obj(
    ["id", "name", "race", "age", "role", "color", "rate", "heatMode", "blurb", "fantasy", "look", "outfit", "why", "first",
      "pursuit", "payoff", "heatActs", "turnoffs", "flattery", "hidden", "deep", "dark", "voice", "planning", "rules", "skills",
      "quest", "questAct", "react", "leanFromHeat", "beliefs", "admires", "despises", "askAbout", "other", "suppressed",
      "darkTriggers", "abilities", "boundaries", "honesty", "means", "whenRefused"],
    {
      id: r("id"),
      name: t,
      race: t,
      // A number, or text for the ageless ("centuries").
      age: { oneOf: [{ type: "integer", minimum: 18 }, t] },
      role: t,
      color: { type: "string", pattern: "^#[0-9a-f]{6}$" },
      rate: { type: "number" },
      heatMode: t,
      blurb: t,
      fantasy: t,
      look: t,
      outfit: t,
      why: t,
      first: t,
      pursuit: t,
      payoff: obj(["at", "minTurns", "minAct", "scene"], {
        at: { type: "integer", minimum: 1, maximum: tracks.heat[1] },
        minTurns: { type: "integer", minimum: 0 },
        minAct: { type: "integer", minimum: 1 },
        scene: t,
      }),
      heatActs: t,
      turnoffs: t,
      flattery: t,
      hidden: t,
      deep: t,
      dark: t,
      voice: t,
      planning: all(["sees", "misses", "reaches_for", "hunch"], t),
      // Her hard rules; may be empty.
      rules: { type: "string" },
      skills: all(SKILLS, { type: "integer" }),
      quest: t,
      // What her story needs the world to hold: keys of a world's `features` (D150).
      needs: { type: "array", items: { type: "string" } },
      questAct: { type: "integer", minimum: 1 },
      // Her reaction to each configuration; "open" (nothing settled) needs none.
      react: { ...some(Object.keys(configText), t), required: Object.keys(configText).filter((k) => k !== "open" && k !== "former") },
      leanFromHeat: { type: "boolean" },
      beliefs: t,
      admires: t,
      despises: t,
      askAbout: t,
      other: t,
      suppressed: t,
      darkTriggers: t,
      // How she gets what she wants (D107).
      boundaries: t,
      honesty: t,
      means: t,
      whenRefused: t,
      abilities: obj(["combat", "noncombat", "limits"], { combat: ability, noncombat: ability, limits: list(t) }),

      // How she judges the other companion on each axis: what earns it and what wears it down (D94).
      inOthers: some(axes, t),
      // Tracks that never move (D100).
      fixed: some(["heat", "intimacy", "regard", "lean"], { type: "number" }),
      // Her own gates for gated profile fields, replacing the defaults in content/relationship.js `reveal` (D100).
      reveal: { type: "object", propertyNames: { enum: ["first", "why", "hidden", "deep", "dark", "payoff_scene", "quest"] }, additionalProperties: gate },
      shapeshift,
      // How she takes it when her read of the other turns out wrong: out loud, or only inside (D94).
      recalibrates: t,
      // Limits on her view of any other companion (D92).
      limits,
      // The view the other companion believes she holds, at the start (D99).
      mask: view,
      // A state that builds and falls slowly: tiers from mild to worst, what calms it, and the tier from which she may
      // act on the other companion's body (D97).
      escalation: obj(["name", "tiers", "rises", "calms"], { name: t, tiers: list(t, 1), rises: t, calms: t, actsOnOther: { type: "integer", minimum: 1 } }),

      // Special cases, declared (docs/spec/companions.md §6). All optional.
      tie: obj(["by"], {
        required: { type: "boolean" },
        set: { type: "object", additionalProperties: t },
        append: { type: "object", additionalProperties: t },
        toPartner: t,
        triangle: obj([], {
          shared: { type: "boolean" },
        }),
        // Her and her partner's starting views of each other, the view her partner believes she holds, limits on her
        // view of her partner (D99), and whether she takes up her partner's pursuit once things are in the open.
        start: view,
        partnerStart: view,
        mask: view,
        limits,
        mirrorsWhenOpen: t,
        secret: t,
        by: { type: "object", minProperties: 1, propertyNames: { pattern: "^[a-z][a-z0-9_]*$" }, additionalProperties: tieEntry },
      }),
      secondVoice: obj(["id", "name", "voice", "look", "relayed", "beat"], {
        id: r("id"),
        name: t,
        voice: t,
        look: t,
        relayed: t,
        // Where she differs from the companion she shares a body with.
        admires: t,
        despises: t,
        // Optional: she can take her own body only once this flag is set or due.
        manifestsAfter: { enum: ["payoff", "vuln", "deep", "bond"] },
        // Optional: she may speak and take her own body in company, in person, while this gate holds (D98).
        inCompany: gate,
        beat: r("id"),
      }),
      extraBeats: list(obj(["id", "text"], { id: r("id"), cooldown: { type: "integer", minimum: 0 }, once: { type: "boolean" }, when: gate, text: t, cooling: t })),
      stageLabels: some(Object.keys(stageLabels), t),
      notes: list(obj(["when", "text"], { when: gate, text: t })),
      // Outfits she owns from the start besides her `outfit` (docs/spec/companions.md §7).
      wardrobe: { type: "object", propertyNames: { pattern: "^[a-z][a-z0-9_]*$" }, additionalProperties: obj(["name", "text"], { name: t, text: t }) },
    },
  ),
});
