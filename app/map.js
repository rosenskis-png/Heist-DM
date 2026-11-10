// The map (D9, D71, D181): an SVG drawn from the packet's geometry by `mapView`, so it matches the real layout and
// every token is where the ledger says its owner is. Only places the party knows are drawn; a way into one it hasn't
// found is a marked gap. Every level is drawn on the same frame, so what's above sits over what it's above. A room
// with no drawn map gets a sketch of its places and the ways between them (`sketchView`).
import { html, useState } from "./h.js";

const S = 30; // pixels per 5-ft square
const FLOOR = { bright: "var(--floor-bright)", dim: "var(--floor-dim)", dark: "var(--floor-dark)" };
const LEVEL = (l) => (l > 0 ? (l > 1 ? "High above" : "Above") : l < 0 ? "Below" : "Ground");
// Marks and lettering are drawn at a size that stays readable when a wide place is fitted to a narrow screen.
const scaleAt = (cx, cy, k) => `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`;
const largest = (rects) => rects.reduce((a, b) => (b[2] * b[3] > a[2] * a[3] ? b : a));

// Tokens gather at the middle of their place, the party first: the map knows which place someone is in, and
// claims no more than that.
function placeTokens(level, k = 1) {
  const out = [];
  for (const z of level.zones) {
    const here = level.tokens.filter((t) => t.zone === z.id);
    if (!here.length) continue;
    const [x, y, w, h] = largest(z.rects);
    const order = [...here.filter((t) => t.party), ...here.filter((t) => !t.party && !t.ghost), ...here.filter((t) => t.ghost)];
    // In a small place the tokens shrink until they fit inside it.
    let kz = k;
    let perRow, rows;
    for (;;) {
      perRow = Math.max(1, Math.floor((w * S - 4) / (24 * kz)));
      rows = Math.ceil(order.length / perRow);
      if (rows * 24 * kz <= h * S - 4 || kz <= 0.6) break;
      kz *= 0.88;
    }
    const top = (y + h / 2) * S - (rows - 1) * 12 * kz + (h * S > 70 * k ? 5 * k : 0);
    order.forEach((t, i) => {
      const r = Math.floor(i / perRow);
      const n = Math.min(perRow, order.length - r * perRow);
      out.push({ ...t, k: kz, cx: (x + w / 2) * S + ((i % perRow) - (n - 1) / 2) * 24 * kz, cy: top + r * 24 * kz });
    });
  }
  return out;
}

function Token({ t, colors, onPick }) {
  const k = t.k ?? 1;
  const r = t.rat ? 7 : 10;
  const stroke = t.party ? "var(--wall)" : "var(--rose)";
  const fill = t.party ? colors[t.id] ?? "var(--gold)" : "var(--surface)";
  const title = `${t.name}${t.rat ? " (a rat)" : ""}${t.ghost ? ", last seen here" : ""}${t.holds.length ? `, carrying ${t.holds.join(", ")}` : ""}${t.down ? ", down" : ""}`;
  return html`<g transform=${scaleAt(t.cx, t.cy, k)} opacity=${t.ghost ? 0.5 : t.down ? 0.45 : 1} onClick=${(e) => (e.stopPropagation(), onPick({ title, zone: t.zone }))} style=${{ cursor: "pointer" }}><title>${title}</title>
    ${t.group
      ? [[-6, 3], [6, 3], [0, -5]].map(([dx, dy], i) => html`<circle key=${i} cx=${t.cx + dx} cy=${t.cy + dy} r="6" fill=${fill} stroke=${stroke} strokeWidth="1.6" strokeDasharray=${t.ghost ? "2 2" : "none"} />`)
      : html`<circle cx=${t.cx} cy=${t.cy} r=${r} fill=${fill} stroke=${stroke} strokeWidth=${t.party ? 1.2 : 2} strokeDasharray=${t.ghost ? "2 2" : "none"} />`}
    <text className="token-label" x=${t.cx} y=${t.cy + (t.group ? 6.5 : 3.5)} textAnchor="middle" fill=${t.party ? "#2a1d2c" : "var(--rose)"} style=${{ fontSize: t.rat ? "8px" : "10px" }}>${t.mark}</text>
    ${t.holds.length ? html`<circle cx=${t.cx + r - 1} cy=${t.cy - r + 1} r="3.5" fill="var(--gold)" stroke="var(--wall)" strokeWidth=".8" />` : null}</g>`;
}

function Level({ view, level, colors, picked, onPick }) {
  const pad = 12;
  const k = Math.min(2.2, Math.max(1, (view.width * S) / 360));
  const tokens = placeTokens(level, Math.min(k, 1.6));
  const roomy = (id) => level.zones.find((z) => z.id === id)?.rects.reduce((n, [, , w, h]) => n + w * h, 0) >= 40;
  // The same frame across for every level, so what's above lines up with what it's above; each level's own height.
  const ys = level.zones.flatMap((z) => z.rects.map(([, y, , h]) => [y, y + h])).flat();
  const [top, bottom] = [Math.min(...ys), Math.max(...ys)];
  const vb = `${view.x0 * S - pad} ${top * S - pad - 6 * k} ${view.width * S + pad * 2} ${(bottom - top) * S + pad * 2 + 22 * k}`;
  const id = `g${level.level}`.replace("-", "m");
  return html`<svg viewBox=${vb} role="img" aria-label=${`Map, ${LEVEL(level.level).toLowerCase()}: ${level.zones.map((z) => z.name).join(", ")}`}>
    <defs>
      <pattern id=${`${id}water`} width="14" height="8" patternUnits="userSpaceOnUse"><path d="M0 4q3.5-4 7 0t7 0" fill="none" stroke="var(--trust)" strokeWidth="1" opacity=".55" /></pattern>
      <pattern id=${`${id}planks`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0v8" stroke="var(--gold)" strokeWidth="1" opacity=".5" /></pattern>
      <pattern id=${`${id}rubble`} width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="var(--muted)" opacity=".5" /><circle cx="6.5" cy="6" r=".8" fill="var(--muted)" opacity=".5" /></pattern>
      <pattern id=${`${id}grid`} width=${S} height=${S} patternUnits="userSpaceOnUse"><path d=${`M${S} 0H0V${S}`} fill="none" stroke="var(--wall)" strokeWidth=".4" opacity=".18" /></pattern>
    </defs>
    ${level.zones.map((z) => html`<g key=${z.id} opacity=${z.seen ? 1 : 0.5} onClick=${() => onPick({ zone: z.id })} style=${{ cursor: "pointer" }}><title>${z.name}</title>
      ${z.rects.map(([x, y, w, h], i) => html`<g key=${i}>
        <rect x=${x * S} y=${y * S} width=${w * S} height=${h * S} fill=${FLOOR[z.light] ?? FLOOR.dim} />
        ${z.ground !== "floor" ? html`<rect x=${x * S} y=${y * S} width=${w * S} height=${h * S} fill=${`url(#${id}${z.ground})`} />` : null}
        <rect x=${x * S} y=${y * S} width=${w * S} height=${h * S} fill=${`url(#${id}grid)`} />
        ${picked === z.id ? html`<rect x=${x * S} y=${y * S} width=${w * S} height=${h * S} fill="var(--gold)" opacity=".18" />` : null}
      </g>`)}</g>`)}
    ${level.walls.map((w, i) => html`<line key=${"w" + i} x1=${w.seg[0] * S} y1=${w.seg[1] * S} x2=${w.seg[2] * S} y2=${w.seg[3] * S} stroke="var(--wall)" strokeWidth="3" strokeLinecap="round" />`)}
    ${level.connections.map((c) => {
      if (c.wall) {
        const [[x1, y1], [x2, y2]] = c.wall;
        const [mx, my] = [((x1 + x2) / 2) * S, ((y1 + y2) / 2) * S];
        // A way into a place not yet found: a broken line and a mark.
        if (c.gap) return html`<g key=${c.id} onClick=${() => onPick({ title: `${c.name}: where it leads is still to find` })} style=${{ cursor: "pointer" }}><title>${c.name}: unexplored</title><line x1=${x1 * S} y1=${y1 * S} x2=${x2 * S} y2=${y2 * S} stroke="var(--gold)" strokeWidth="3" strokeDasharray="2 5" /><g transform=${scaleAt(mx, my, k)}><circle cx=${mx} cy=${my} r="7" fill="var(--surface)" stroke="var(--gold)" /><text className="token-label" x=${mx} y=${my + 3.5} textAnchor="middle" fill="var(--gold)">?</text></g></g>`;
        if (c.kind === "opening") return null;
        const stroke = c.kind === "bars" ? (c.locked ? "var(--danger)" : "var(--trust)") : c.locked ? "var(--danger)" : "var(--gold)";
        return html`<line key=${c.id} x1=${x1 * S} y1=${y1 * S} x2=${x2 * S} y2=${y2 * S} stroke=${stroke} strokeWidth="5" strokeLinecap="round" strokeDasharray=${c.kind === "bars" ? "2 5" : "none"}><title>${c.name}${c.locked ? " (locked)" : ""}</title></line>`;
      }
      // A way up or down: a ladder mark, an arrow for which way, and where it goes once that's known.
      const [x, y] = c.square;
      const [cx, cy] = [(x + 0.5) * S, (y + 0.5) * S];
      const up = c.dir > 0;
      const where = c.leads ? `${up ? "up" : "down"} to ${c.leads}` : "where it leads is still to find";
      return html`<g key=${c.id} transform=${scaleAt(cx, cy, Math.min(k, 1.5))} onClick=${(e) => (e.stopPropagation(), onPick({ title: `${c.name}: ${where}` }))} style=${{ cursor: "pointer" }}><title>${c.name}: ${where}</title>
        <rect x=${cx - 9} y=${cy - 11} width="18" height="22" rx="3" fill="var(--surface)" stroke=${c.leads ? "var(--wall)" : "var(--gold)"} strokeWidth="1.2" strokeDasharray=${c.leads ? "none" : "2 3"} />
        ${c.kind === "stairs" ? [-5, 0, 5].map((d) => html`<line key=${d} x1=${cx - 5} y1=${cy + d + 2} x2=${cx + 5} y2=${cy + d + 2} stroke="var(--wall)" strokeWidth="1.2" />`) : html`<circle cx=${cx} cy=${cy + 2} r="4" fill="none" stroke="var(--wall)" strokeWidth="1.2" />`}
        <path d=${up ? `M${cx - 4} ${cy - 5}L${cx} ${cy - 10}L${cx + 4} ${cy - 5}Z` : `M${cx - 4} ${cy + 9}L${cx} ${cy + 14}L${cx + 4} ${cy + 9}Z`} fill=${c.leads ? "var(--wall)" : "var(--gold)"} /></g>`;
    })}
    ${level.zones.map((z) => {
      const [x, y, w] = largest(z.rects);
      // A place too small to hold its name is named when it's tapped.
      if (w * S < z.name.length * 5 * k) return null;
      return html`<text key=${"l" + z.id} className="zone-label halo" x=${(x + w / 2) * S} y=${y * S + 10 * k} textAnchor="middle" pointerEvents="none" style=${{ fontSize: `${9.5 * k}px` }}>${z.name}</text>`;
    })}
    ${level.things.map((t, i) => {
      const [cx, cy] = [(t.at[0] + 0.5) * S, (t.at[1] + 0.5) * S];
      const crowded = level.things.slice(0, i).some((o) => Math.abs(o.at[1] - t.at[1]) <= 0 && Math.abs(o.at[0] - t.at[0]) <= 2);
      return html`<g key=${t.id} transform=${scaleAt(cx, cy, k)} opacity=${t.seen ? 1 : 0.5} onClick=${(e) => (e.stopPropagation(), onPick({ title: `${t.name}${t.holds.length ? `: ${t.holds.join(", ")}` : ""}`, zone: t.zone }))} style=${{ cursor: "pointer" }}><title>${t.name}</title>
        <path d=${`M${cx} ${cy - 5}L${cx + 5} ${cy}L${cx} ${cy + 5}L${cx - 5} ${cy}Z`} fill=${t.holds.length ? "var(--gold)" : "var(--muted)"} stroke="var(--surface)" strokeWidth=".8" />
        ${roomy(t.zone) ? html`<text className="thing-label halo" x=${cx} y=${crowded ? cy - 8 : cy + 14} textAnchor="middle">${t.name}</text>` : null}</g>`;
    })}
    ${tokens.map((t) => html`<${Token} key=${t.id} t=${t} colors=${colors} onPick=${onPick} />`)}
    <g pointerEvents="none"><line x1=${view.x0 * S} y1=${bottom * S + 8 * k} x2=${(view.x0 + 2) * S} y2=${bottom * S + 8 * k} stroke="var(--muted)" strokeWidth=${1.5 * k} /><text className="thing-label" x=${(view.x0 + 2) * S + 4 * k} y=${bottom * S + 11 * k} style=${{ fontSize: `${8 * k}px` }}>10 ft</text></g>
  </svg>`;
}

// A room with no drawn map: boxes for its places, in columns by how far each is from the party, and lines for the
// ways between. No sizes, no directions.
function Sketch({ sketch, colors, picked, onPick }) {
  const [W, H, GX, GY] = [132, 62, 44, 14];
  const at = (n) => [n.col * (W + GX), n.row * (H + GY)];
  const cols = Math.max(...sketch.nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...sketch.nodes.map((n) => n.row)) + 1;
  const by = Object.fromEntries(sketch.nodes.map((n) => [n.id, n]));
  return html`<svg viewBox=${`-6 -6 ${cols * (W + GX) - GX + 12} ${rows * (H + GY) - GY + 12}`} role="img" aria-label="A sketch of the places here and the ways between them">
    ${sketch.links.map((l) => {
      const [[ax, ay], [bx, by2]] = [at(by[l.a]), at(by[l.b])];
      return html`<line key=${l.id} x1=${ax + W / 2} y1=${ay + H / 2} x2=${bx + W / 2} y2=${by2 + H / 2} stroke=${l.locked ? "var(--danger)" : "var(--wall)"} strokeWidth="2" strokeDasharray=${l.locked ? "3 4" : "none"}><title>${l.name}</title></line>`;
    })}
    ${sketch.nodes.map((n) => {
      const [x, y] = at(n);
      return html`<g key=${n.id} onClick=${() => onPick({ zone: n.id })} style=${{ cursor: "pointer" }}>
        <rect x=${x} y=${y} width=${W} height=${H} rx="10" fill=${FLOOR[n.light]} stroke=${picked === n.id ? "var(--gold)" : "var(--wall)"} strokeWidth=${picked === n.id ? 3 : 1.6} />
        <text className="zone-label halo" x=${x + W / 2} y=${y + 16} textAnchor="middle" style=${{ fontSize: "11px" }}>${n.name.length > 22 ? `${n.name.slice(0, 21)}…` : n.name}</text>
        ${n.tokens.map((t, i) => html`<${Token} key=${t.id} t=${{ ...t, k: 0.9, cx: x + 18 + (i % 5) * 24, cy: y + 38 }} colors=${colors} onPick=${onPick} />`)}</g>`;
    })}
  </svg>`;
}

// The Map tab: the map, who's on it, and what's known of whatever was tapped.
export function MapTab({ view, sketch, sheet, colors, party }) {
  const [pick, setPick] = useState(null);
  const place = pick?.zone ? sheet.places.find((p) => p.id === pick.zone) : null;
  const leads = place ? sheet.ways.filter((w) => w.between.includes(place.name)).map((w) => `${w.between.find((b) => b !== place.name) ?? place.name} (${w.how.split(",")[0]})`) : [];
  const tokens = view ? view.levels.flatMap((l) => l.tokens) : sketch.nodes.flatMap((n) => n.tokens);
  const everyone = tokens.filter((t) => !t.party);
  const placeName = (id) => sheet.places.find((p) => p.id === id)?.name ?? "somewhere";
  return html`<section className="maptabbox" aria-label="Map">
    ${view
      ? view.levels.map((l) => html`<div className="lvl" key=${l.level}>${view.levels.length > 1 ? html`<span className="cap">${LEVEL(l.level)}</span>` : null}<${Level} view=${view} level=${l} colors=${colors} picked=${pick?.zone} onPick=${setPick} /></div>`)
      : html`<div className="lvl"><span className="cap">A sketch: the places here and how they join, not to scale</span><${Sketch} sketch=${sketch} colors=${colors} picked=${pick?.zone} onPick=${setPick} /></div>`}
    <div className="mapnote" aria-live="polite">
      ${pick?.title ? html`<div><b>${pick.title}</b></div>` : null}
      ${place ? html`<div><b>${place.name}</b>${place.light ? html`<span className="muted"> (${place.light})</span>` : null}: ${place.what}${place.here.length ? html`<span className="here"> Here: ${place.here.join(", ")}.</span>` : null}${leads.length ? html`<span className="muted"> Leads to ${leads.join("; ")}.</span>` : null}</div>` : null}
      ${!pick ? html`<span className="muted">Tap a place, a person or a thing to see what you know of it.</span>` : null}
    </div>
    <div className="whos" aria-label="Who is where">
      ${tokens.map((t) => html`<button key=${t.id} className="who-row" onClick=${() => setPick({ zone: t.zone })}>
        <span className="dot" style=${t.party ? { background: colors[t.id] ?? "var(--gold)" } : { border: `2px ${t.ghost ? "dashed" : "solid"} var(--rose)`, color: "var(--rose)" }}>${t.mark}</span>
        <span><b>${t.party && t.id === "player" ? "You" : t.name}</b><span className="muted">${t.ghost ? `, last seen in ${placeName(t.zone)}` : `, in ${placeName(t.zone)}`}${t.down ? ", down" : ""}${t.holds.length ? `, carrying ${t.holds.join(", ")}` : ""}</span></span>
      </button>`)}
    </div>
    <div className="legend">
      ${party.map((p) => html`<span key=${p.id}><span className="dot" style=${{ background: colors[p.id] ?? "var(--gold)" }}></span>${p.id === "player" ? "You" : p.name}</span>`)}
      ${everyone.length ? html`<span><span className="dot" style=${{ border: "2px solid var(--rose)" }}></span>someone in sight</span>` : null}
      ${everyone.some((t) => t.ghost) ? html`<span><span className="dot" style=${{ border: "2px dashed var(--rose)", opacity: 0.6 }}></span>where they were last seen</span>` : null}
      ${view ? html`<span>◆ a thing</span><span style=${{ color: "var(--gold)" }}>? not yet explored</span><span>Faded: out of sight now</span>` : null}
    </div>
  </section>`;
}

export function Clock({ clock, compact = false }) {
  if (compact)
    return html`<div className="clock"><span>Tick <b>${clock.tick}</b></span>${clock.beats.map((b) => html`<span key=${b.who}>${b.who}: <b>${b.beat}</b></span>`)}${clock.coming.map((e) => html`<span key=${e.what} className=${e.in <= 3 ? "soon" : ""}>${e.what} in ${e.in}</span>`)}${clock.threats.length ? html`<span className="soon" title=${clock.threats.map((x) => `${x.who}: ${x.does}`).join("\n")}>${clock.threats.length} coming at you</span>` : null}</div>`;
  return html`<div className="beatbox">
    <div><b>Tick ${clock.tick}</b>${clock.pending ? html`<span className="muted"> (${clock.pending} more passing)</span>` : null}</div>
    ${clock.beats.map((b) => html`<div key=${b.who}><b>${b.who}: ${b.beat}.</b> ${b.does}. <span className="cue">${b.cue}</span></div>`)}
    ${clock.coming.map((e) => html`<div key=${e.what} className=${e.in <= 3 ? "system" : ""}>${e.what} at tick ${e.at} (in ${e.in}).</div>`)}
    ${clock.threats.map((x) => html`<div key=${x.who} className="system"><b>${x.who}:</b> ${x.does}</div>`)}
  </div>`;
}
