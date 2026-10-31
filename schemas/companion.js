// A companion file (content/companions/<id>.js). Fields: docs/spec/companions.md §2; special cases: §6.
// Every file in the registry is checked against this by `node --test`, so a new or rewritten companion that
// misses a field, or misspells one, fails before it reaches a prompt.
import { withDefs } from "./defs.js";
import { r, list, obj } from "./shape.js";
import { configText, stageLabels, tracks } from "../content/relationship.js";

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

// A tie's entry for one other companion: fields it sets or extends, and what it adds.
const tieEntry = obj([], {
  set: { type: "object", additionalProperties: t },
  append: { type: "object", additionalProperties: t },
  gift: t,
  bond: t,
  partnerReacts: t,
  // The parked portrait feature (D24). On no allowlist.
  image: { type: "object", additionalProperties: t },
});
const config = { enum: Object.keys(configText) };

export const companionFileSchema = withDefs({
  $id: "companion_file",
  ...obj(
    ["id", "name", "race", "age", "role", "color", "rate", "heatMode", "blurb", "fantasy", "look", "outfit", "why", "first",
      "pursuit", "payoff", "heatActs", "turnoffs", "flattery", "hidden", "deep", "dark", "voice", "planning", "rules", "skills",
      "quest", "questAct", "react", "leanFromHeat", "beliefs", "admires", "despises", "askAbout", "other", "suppressed",
      "darkTriggers", "abilities"],
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
      questAct: { type: "integer", minimum: 1 },
      // Her reaction to each configuration; "open" (nothing settled) needs none.
      react: { ...some(Object.keys(configText), t), required: Object.keys(configText).filter((k) => k !== "open") },
      leanFromHeat: { type: "boolean" },
      beliefs: t,
      admires: t,
      despises: t,
      askAbout: t,
      other: t,
      suppressed: t,
      darkTriggers: t,
      abilities: obj(["hp", "combat", "noncombat", "limits"], { hp: { type: "integer", minimum: 1 }, combat: ability, noncombat: ability, limits: list(t) }),

      // Special cases, declared (docs/spec/companions.md §6). All optional.
      tie: obj(["by"], {
        required: { type: "boolean" },
        set: { type: "object", additionalProperties: t },
        append: { type: "object", additionalProperties: t },
        toPartner: t,
        triangle: obj([], {
          shared: { type: "boolean" },
          bothInvolved: obj(["self", "partner"], { self: obj(["known", "secret"], { known: config, secret: config }), partner: config }),
        }),
        by: { type: "object", minProperties: 1, propertyNames: { pattern: "^[a-z][a-z0-9_]*$" }, additionalProperties: tieEntry },
      }),
      secondVoice: obj(["id", "name", "voice", "look", "relayed", "manifestsAfter", "beat"], {
        id: r("id"),
        name: t,
        voice: t,
        look: t,
        relayed: t,
        // Where she differs from the companion she shares a body with.
        admires: t,
        despises: t,
        manifestsAfter: { enum: ["payoff", "vuln", "deep", "bond"] },
        beat: r("id"),
      }),
      extraBeats: list(obj(["id", "cooldown", "text"], { id: r("id"), cooldown: { type: "integer", minimum: 0 }, text: t, cooling: t })),
      stageLabels: some(Object.keys(stageLabels), t),
      notes: list(obj(["when", "text"], { when: gate, text: t })),
      // Outfits she owns from the start besides her `outfit` (docs/spec/companions.md §7).
      wardrobe: { type: "object", propertyNames: { pattern: "^[a-z][a-z0-9_]*$" }, additionalProperties: obj(["name", "text"], { name: t, text: t }) },
    },
  ),
});
