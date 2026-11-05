// The bench's automatic checks. Each check is {name, ok: true | false | "near", detail}.
// The designer judges feel; these only point at evidence.

const check = (name, ok, detail = "") => ({ name, ok, detail });

export function companionChecks(out) {
  const longest = (out.message ?? "").length;
  return [check("Messaging length", longest <= 450 ? true : "near", `${longest} characters`)];
}

// The huddle in one call: short lines. Either may let it go, so one silent companion is only worth a look.
export function partyChecks(out, companions) {
  const lines = out.lines ?? [];
  const longest = Math.max(0, ...lines.map((l) => l.message.length));
  const silent = companions.filter((c) => !lines.some((l) => l.from === c.id)).map((c) => c.name);
  return [
    check("Messaging length", longest <= 450 ? true : "near", `longest ${longest} characters`),
    check("Both have a voice", silent.length === 0 ? true : "near", silent.length ? `${silent.join(", ")} lets it go` : ""),
  ];
}
