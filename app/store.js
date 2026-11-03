// Saves (D11): three slots per player in the artifact's db, private to that player, with this browser's storage
// as the fallback when the db isn't available. A save is a JSON snapshot; loading one never calls an AI.
export const SLOTS = ["slot1", "slot2", "slot3"];
const LIMIT = 240 * 1024;

const local = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(`heist-dm.${k}`));
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(`heist-dm.${k}`, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
  del(k) {
    try {
      localStorage.removeItem(`heist-dm.${k}`);
    } catch {}
  },
};

export async function openStore() {
  const [db, user] = await Promise.all([window.claude?.use("db") ?? null, window.claude?.use("user") ?? null]);
  let col = null;
  if (db && user) {
    try {
      col = db.collection(`data/users/${await user.id()}`);
    } catch {
      col = null;
    }
  }
  return {
    where: col ? "your saves" : "this browser only",
    async list() {
      const out = {};
      for (const slot of SLOTS) {
        let meta = null;
        if (col) {
          try {
            const d = await col.doc(slot).get();
            const v = d.data();
            meta = v ? { name: v.name, updated: v.updated, summary: v.summary } : null;
          } catch {}
        }
        meta ??= local.get(`${slot}.meta`);
        out[slot] = meta;
      }
      return out;
    },
    async load(slot) {
      if (col) {
        try {
          const v = (await col.doc(slot).get()).data();
          if (v?.data) return v.data;
        } catch {}
      }
      return local.get(`${slot}.data`);
    },
    // Returns where it saved, or throws when it couldn't save anywhere.
    async save(slot, meta, data) {
      if (data.length > LIMIT) throw new Error("This save is too big to store. Export it instead.");
      const doc = { ...meta, updated: Date.now(), data };
      if (col) {
        try {
          await col.doc(slot).set(doc);
          return "db";
        } catch {}
      }
      if (local.set(`${slot}.data`, data) && local.set(`${slot}.meta`, { ...meta, updated: doc.updated })) return "local";
      throw new Error("Couldn't save. Export the game to keep it.");
    },
    async remove(slot) {
      if (col) {
        try {
          await col.doc(slot).delete();
        } catch {}
      }
      local.del(`${slot}.data`);
      local.del(`${slot}.meta`);
    },
  };
}

// The speed and quality setting (D48) is a per-player convenience, kept in this browser.
export const prefs = {
  get: () => local.get("prefs") ?? { speed: "balanced" },
  set: (p) => local.set("prefs", p),
};
