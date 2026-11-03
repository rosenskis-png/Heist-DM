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
