// The map (D9, D71): an SVG drawn from the packet's geometry by `mapView`, so it matches the real layout. Only
// zones the party knows are drawn; the other levels sit beside the main one. The clock is always next to it.
import { html } from "./h.js";

const S = 30; // pixels per 5-ft square
const FLOOR = { bright: "var(--floor-bright)", dim: "var(--floor-dim)", dark: "var(--floor-dark)" };

function bounds(zones) {
  const r = zones.flatMap((z) => z.rects);
  const x0 = Math.min(...r.map(([x]) => x));
  const y0 = Math.min(...r.map(([, y]) => y));
  return { x0, y0, w: Math.max(...r.map(([x, , w]) => x + w)) - x0, h: Math.max(...r.map(([, y, , h]) => y + h)) - y0 };
}

const largest = (rects) => rects.reduce((a, b) => (b[2] * b[3] > a[2] * a[3] ? b : a));

// Tokens spread over their zone's squares, avoiding squares a placed thing sits on.
function placeTokens(level) {
  const taken = new Set(level.things.map((t) => t.at.join(",")));
  const spots = new Map(level.zones.map((z) => [z.id, z.rects.flatMap(([x, y, w, h]) => Array.from({ length: w * h }, (_, i) => [x + (i % w), y + Math.floor(i / w)])).filter((p) => !taken.has(p.join(",")))]));
  const used = new Map();
  return level.tokens.map((t) => {
    const list = spots.get(t.zone)?.length ? spots.get(t.zone) : level.zones.find((z) => z.id === t.zone).rects.map(([x, y]) => [x, y]);
    const i = used.get(t.zone) ?? 0;
    used.set(t.zone, i + 1);
    const [x, y] = list[i % list.length];
    const nudge = Math.floor(i / list.length) * 8;
    return { ...t, cx: (x + 0.5) * S + nudge, cy: (y + 0.5) * S + nudge };
  });
}

function Level({ level, colors, main }) {
  const b = bounds(level.zones);
  const pad = 8;
  const tokens = placeTokens(level);
  const vb = `${b.x0 * S - pad} ${b.y0 * S - pad} ${b.w * S + pad * 2} ${b.h * S + pad * 2}`;
  // The other levels keep the main map's scale instead of stretching to fill their column.
  const style = main ? {} : { width: `${(b.w * S + pad * 2) * 0.9}px`, maxWidth: "100%" };
  return html`<svg viewBox=${vb} role="img" aria-label=${`Map: ${level.zones.map((z) => z.name).join(", ")}`} style=${style}>
    ${level.zones.flatMap((z) => z.rects.map(([x, y, w, h], i) => html`<rect key=${z.id + i} x=${x * S} y=${y * S} width=${w * S} height=${h * S} fill=${FLOOR[z.light] ?? FLOOR.dim}><title>${z.name}</title></rect>`))}
    ${level.zones.map((z) => {
      const [x, y, w, h] = largest(z.rects);
      // A zone too small to hold its name is named in the caption and on hover instead.
      if (w * S < z.name.length * 4.6) return null;
      return html`<text key=${"l" + z.id} className="zone-label" x=${(x + w / 2) * S} y=${(y + h) * S - 4} textAnchor="middle">${z.name}</text>`;
    })}
    ${level.walls.map((w, i) => html`<line key=${"w" + i} x1=${w.seg[0] * S} y1=${w.seg[1] * S} x2=${w.seg[2] * S} y2=${w.seg[3] * S} stroke="var(--wall)" strokeWidth="2.5" strokeLinecap="square" />`)}
    ${level.connections.map((c) => {
      if (c.wall) {
        const [[x1, y1], [x2, y2]] = c.wall;
        if (c.gap) return html`<g key=${c.id}><line x1=${x1 * S} y1=${y1 * S} x2=${x2 * S} y2=${y2 * S} stroke="var(--muted)" strokeDasharray="1 4" /><text className="thing-label" x=${((x1 + x2) / 2) * S} y=${((y1 + y2) / 2) * S - 4} textAnchor="middle">${c.gap}</text></g>`;
        if (c.kind === "opening") return null;
        const stroke = c.kind === "bars" ? (c.locked ? "var(--danger)" : "var(--trust)") : "var(--gold)";
        return html`<line key=${c.id} x1=${x1 * S} y1=${y1 * S} x2=${x2 * S} y2=${y2 * S} stroke=${stroke} strokeWidth="4" strokeDasharray=${c.kind === "bars" ? "2 4" : "none"}><title>${c.name}${c.locked ? " (locked)" : ""}</title></line>`;
      }
      const [x, y] = c.square;
      const cx = (x + 0.5) * S;
      const cy = (y + 0.5) * S;
      if (c.kind === "stairs")
        return html`<g key=${c.id} stroke="var(--wall)" strokeWidth="1.5"><title>${c.name}</title>${[-6, 0, 6].map((d) => html`<line key=${d} x1=${cx - 8} y1=${cy + d} x2=${cx + 8} y2=${cy + d} />`)}</g>`;
      return html`<g key=${c.id}><title>${c.name}</title><rect x=${cx - 6} y=${cy - 6} width="12" height="12" fill="none" stroke="var(--muted)" strokeWidth="1.2" /><line x1=${cx - 6} y1=${cy} x2=${cx + 6} y2=${cy} stroke="var(--muted)" /><line x1=${cx} y1=${cy - 6} x2=${cx} y2=${cy + 6} stroke="var(--muted)" /></g>`;
    })}
    ${level.things.map((t, i) => {
      const cx = (t.at[0] + 0.5) * S;
      const cy = (t.at[1] + 0.5) * S;
      // Labels of things side by side alternate above and below.
      const crowded = level.things.slice(0, i).some((o) => o.at[1] === t.at[1] && Math.abs(o.at[0] - t.at[0]) <= 1);
      return html`<g key=${t.id}><title>${t.name}${t.holds.length ? `: ${t.holds.join(", ")}` : ""}</title>
        <path d=${`M${cx} ${cy - 5}L${cx + 5} ${cy}L${cx} ${cy + 5}L${cx - 5} ${cy}Z`} fill=${t.holds.length ? "var(--gold)" : "var(--muted)"} />
        <text className="thing-label" x=${cx} y=${crowded ? cy - 8 : cy + 13} textAnchor="middle">${t.name}</text></g>`;
    })}
    ${tokens.map((t) => {
      const r = t.rat ? 7 : 10;
      const fill = t.party ? colors[t.id] ?? "var(--gold)" : "var(--surface)";
      return html`<g key=${t.id} opacity=${t.down ? 0.45 : 1}><title>${t.name}${t.rat ? " (a rat)" : ""}${t.holds.length ? `, carrying ${t.holds.join(", ")}` : ""}${t.down ? ", down" : ""}</title>
        <circle cx=${t.cx} cy=${t.cy} r=${r} fill=${fill} stroke=${t.party ? "var(--wall)" : "var(--rose)"} strokeWidth=${t.party ? 1.2 : 2} />
        <text className="token-label" x=${t.cx} y=${t.cy + 3.5} textAnchor="middle" fill=${t.party ? "#2a1d2c" : "var(--rose)"} style=${{ fontSize: t.rat ? "8px" : "10px" }}>${t.name[0]}</text>
        ${t.holds.length ? html`<circle cx=${t.cx + r - 1} cy=${t.cy - r + 1} r="3.5" fill="var(--gold)" stroke="var(--wall)" strokeWidth=".8" />` : null}</g>`;
    })}
  </svg>`;
}

const LEVEL = (l) => (l > 0 ? "Above" : l < 0 ? "Below" : "");

export function MapPanel({ view, clock, colors }) {
  const main = view?.levels.find((l) => l.level === 0) ?? view?.levels[0];
  const others = view?.levels.filter((l) => l !== main) ?? [];
  return html`<section className="mapbox" aria-label="Map and clock">
    <${Clock} clock=${clock} />
    ${view
      ? html`<div style=${{ display: "grid", gap: "8px" }}><${Level} level=${main} colors=${colors} main=${true} />
        ${others.length ? html`<div className="levels">${others.map((l) => html`<div className="lvl" key=${l.level}><span className="cap">${LEVEL(l.level)}: ${l.zones.map((z) => z.name).join(", ")}</span><${Level} level=${l} colors=${colors} /></div>`)}</div>` : null}
        <div className="legend"><span>Each square is 5 ft</span><span style=${{ color: "var(--danger)" }}>┅ locked bars</span><span style=${{ color: "var(--trust)" }}>┅ open bars</span><span>⊞ grate or drain</span><span>Gold dot: carrying something</span></div></div>`
      : html`<p className="muted small">No map for this place.</p>`}
  </section>`;
}

export function Clock({ clock, compact = false }) {
  if (compact)
    return html`<div className="clock"><span>Tick <b>${clock.tick}</b></span>${clock.beats.map((b) => html`<span key=${b.who}>${b.who}: <b>${b.beat}</b></span>`)}${clock.coming.map((e) => html`<span key=${e.what} className=${e.in <= 3 ? "soon" : ""}>${e.what} in ${e.in}</span>`)}${clock.fight ? html`<span className="soon">Fighting</span>` : null}</div>`;
  return html`<div className="beatbox">
    <div><b>Tick ${clock.tick}</b>${clock.pending ? html`<span className="muted"> (${clock.pending} more passing)</span>` : null}</div>
    ${clock.beats.map((b) => html`<div key=${b.who}><b>${b.who}: ${b.beat}.</b> ${b.does}. <span className="cue">${b.cue}</span></div>`)}
    ${clock.coming.map((e) => html`<div key=${e.what} className=${e.in <= 3 ? "system" : ""}>${e.what} at tick ${e.at} (in ${e.in}).</div>`)}
    ${clock.fight ? html`<div className="system">Fighting ${clock.fight.map((f) => `${f.name} (${f.hp} HP)`).join(", ")}.</div>` : null}
  </div>`;
}
