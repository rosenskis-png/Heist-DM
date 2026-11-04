// The bench's automatic checks. Each check is {name, ok: true | false | "near", detail}.
// The designer judges feel; these only point at evidence.

const check = (name, ok, detail = "") => ({ name, ok, detail });

export function companionChecks(out) {
  const msgs = (out.candidates ?? []).map((x) => x.message);
  const distinct = new Set(msgs.map((m) => (m ?? "").trim().toLowerCase())).size;
  const longest = Math.max(0, ...msgs.map((m) => (m ?? "").length));
  return [
    check("Three different takes", distinct === 3 ? true : false, `${distinct} distinct`),
    check("Messaging length", longest <= 450 ? true : "near", `longest ${longest} characters`),
  ];
}

// The huddle in one call: three different exchanges, short lines, and each companion speaking in at least one.
export function partyChecks(out, companions) {
  const ex = out.exchanges ?? [];
  const lines = ex.flatMap((x) => x.lines ?? []);
  const distinct = new Set(ex.map((x) => (x.lines ?? []).map((l) => `${l.from}:${l.message.trim().toLowerCase()}`).join("|"))).size;
  const longest = Math.max(0, ...lines.map((l) => l.message.length));
  const silent = companions.filter((c) => !lines.some((l) => l.from === c.id)).map((c) => c.name);
  return [
    check("Three different takes", distinct === 3, `${distinct} distinct`),
    check("Messaging length", longest <= 450 ? true : "near", `longest ${longest} characters`),
    check("Both have a voice", silent.length === 0, silent.length ? `${silent.join(", ")} never speaks` : ""),
  ];
}
