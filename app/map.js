// The map (D9, D181, D182): an SVG drawn from the packet's geometry by `mapView`, so it matches the real layout and
// every token is where the ledger says its owner is. One level at a time in a window that pans and zooms, with the
// other levels' outlines faint beneath. Places are drawn from their outlines as built rooms, natural rock or round
// rooms, coloured by what's underfoot and how well lit they are. Only what the party knows is drawn; a way into a
// place it hasn't found is a marked gap. A room with no drawn map gets a sketch of its places (`sketchView`).
import { html, useState, useEffect, useRef } from "./h.js";

const S = 30; // pixels per 5-ft square
const GROUND = { floor: "var(--map-stone)", cave: "var(--map-cave)", water: "var(--map-water)", planks: "var(--map-wood)", rubble: "var(--map-rubble)" };
const SHADE = { bright: 0, dim: 0.1, dark: 0.3 };
const LEVEL = (l) => (l > 1 ? "High above" : l === 1 ? "Above" : l === 0 ? "Ground" : l === -1 ? "Below" : "Deep below");
const scaleAt = (cx, cy, k) => `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`;
const largest = (rects) => rects.reduce((a, b) => (b[2] * b[3] > a[2] * a[3] ? b : a));
const groundOf = (z) => (z.ground === "floor" && z.shape === "cave" ? "cave" : z.ground);

// A steady scatter for natural rock: the same grid point always moves the same way, so two caves that share a wall
// still meet along it.
function jitter(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = (h ^ (h >>> 13)) >>> 0;
  const a = (h % 1000) / 1000 - 0.5;
  const b = ((h >>> 10) % 1000) / 1000 - 0.5;
  return [a * 0.44 * S, b * 0.44 * S];
}

// The line round a place, from its outline: built rooms keep their corners (slightly eased), round rooms sweep
// them away, and natural rock wanders, except where a way meets the wall.
export function pathOf(z) {
  const fixed = new Set(z.fixed ?? []);
  return z.loops
    .map((loop) => {
      if (z.shape === "cave") {
        const pts = loop.map(([x, y]) => (fixed.has(`${x},${y}`) ? [x * S, y * S] : [x * S + jitter(x, y)[0], y * S + jitter(x, y)[1]]));
        const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const start = mid(pts[pts.length - 1], pts[0]);
        return `M${start.join(" ")}` + pts.map((p, i) => `Q${p.join(" ")} ${mid(p, pts[(i + 1) % pts.length]).join(" ")}`).join("") + "Z";
      }
      // Corners only: points where the line turns.
      const n = loop.length;
      const corners = loop.filter((p, i) => {
        const [a, b] = [loop[(i + n - 1) % n], loop[(i + 1) % n]];
        return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
      });
      const xs = corners.map((p) => p[0]);
      const ys = corners.map((p) => p[1]);
      const r = z.shape === "round" ? (Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * S) / 2 : 5;
      const m = corners.length;
      const toward = (c, o) => {
        const d = Math.hypot(o[0] - c[0], o[1] - c[1]) * S;
        const k = Math.min(r, d / 2) / d;
        return [(c[0] + (o[0] - c[0]) * k) * S, (c[1] + (o[1] - c[1]) * k) * S];
      };
      return corners.map((c, i) => `${i ? "L" : "M"}${toward(c, corners[(i + m - 1) % m]).join(" ")}Q${c[0] * S} ${c[1] * S} ${toward(c, corners[(i + 1) % m]).join(" ")}`).join("") + "Z";
    })
    .join("");
}

// Tokens gather at the middle of their place, the party first: the map knows which place someone is in, and
// claims no more than that. In a small place they shrink until they fit.
function placeTokens(level, k = 1) {
  const out = [];
  for (const z of level.zones) {
    const here = level.tokens.filter((t) => t.zone === z.id);
    if (!here.length) continue;
    const [x, y, w, h] = largest(z.rects);
    const order = [...here.filter((t) => t.party), ...here.filter((t) => !t.party && !t.ghost), ...here.filter((t) => t.ghost)];
    let kz = k;
    let perRow, rows;
    for (;;) {
      perRow = Math.max(1, Math.floor((w * S - 8) / (24 * kz)));
      rows = Math.ceil(order.length / perRow);
      if (rows * 24 * kz <= h * S - 6 || kz <= 0.6) break;
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
  const r = t.rat ? 7 : 10;
  const stroke = t.party ? "var(--map-ink)" : "var(--rose)";
  const fill = t.party ? colors[t.id] ?? "var(--gold)" : "var(--surface)";
  const title = `${t.name}${t.rat ? " (a rat)" : ""}${t.ghost ? ", last seen here" : ""}${t.holds.length ? `, carrying ${t.holds.join(", ")}` : ""}${t.down ? ", down" : ""}`;
  return html`<g transform=${scaleAt(t.cx, t.cy, t.k ?? 1)} opacity=${t.ghost ? 0.5 : t.down ? 0.45 : 1} onClick=${(e) => (e.stopPropagation(), onPick({ title, zone: t.zone }))} style=${{ cursor: "pointer" }}><title>${title}</title>
    ${t.ghost ? null : html`<ellipse cx=${t.cx} cy=${t.cy + r} rx=${r * 0.9} ry="3" fill="var(--map-ink)" opacity=".22" />`}
    ${t.group
      ? [[-6, 3], [6, 3], [0, -5]].map(([dx, dy], i) => html`<circle key=${i} cx=${t.cx + dx} cy=${t.cy + dy} r="6.5" fill=${fill} stroke=${stroke} strokeWidth="1.8" strokeDasharray=${t.ghost ? "2 2" : "none"} />`)
      : html`<circle cx=${t.cx} cy=${t.cy} r=${r} fill=${fill} stroke=${stroke} strokeWidth=${t.party ? 1.4 : 2.2} strokeDasharray=${t.ghost ? "2 2" : "none"} />`}
    <text className="token-label" x=${t.cx} y=${t.cy + (t.group ? -2 : 3.5)} textAnchor="middle" fill=${t.party ? "#2a1d2c" : "var(--rose)"} style=${{ fontSize: t.rat || t.group ? "8px" : "10px" }}>${t.mark}</text>
    ${t.holds.length ? html`<circle cx=${t.cx + r - 1} cy=${t.cy - r + 1} r="3.5" fill="var(--gold)" stroke="var(--map-ink)" strokeWidth=".8" />` : null}</g>`;
}

// A window onto the drawing that pans with a drag, zooms with a pinch, the wheel or its buttons, and goes back to
// the whole of it. `frame` is the whole drawing; `home` is where "find me" goes.
function Viewport({ frame, home, label, lead, children }) {
  const key = `${frame.x},${frame.y},${frame.w},${frame.h}`;
  const [vb, setVb] = useState(frame);
  const svg = useRef(null);
  const touch = useRef({ pts: new Map(), moved: false, pinch: 0 });
  useEffect(() => setVb(frame), [key]);
  const clampW = (w) => Math.max(frame.w / 8, Math.min(frame.w * 1.4, w));
  // A point on the screen, in the drawing's own units (the drawing is fitted inside the window, centred).
  const at = (cx, cy, v) => {
    const r = svg.current.getBoundingClientRect();
    const s = Math.max(v.w / r.width, v.h / r.height);
    return { x: v.x + v.w / 2 + (cx - r.left - r.width / 2) * s, y: v.y + v.h / 2 + (cy - r.top - r.height / 2) * s, s };
  };
  const zoom = (f, cx, cy) =>
    setVb((v) => {
      const w = clampW(v.w * f);
      const k = w / v.w;
      const p = cx === undefined ? { x: v.x + v.w / 2, y: v.y + v.h / 2 } : at(cx, cy, v);
      return { x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w, h: v.h * k };
    });
  useEffect(() => {
    const el = svg.current;
    const wheel = (e) => (e.preventDefault(), zoom(e.deltaY > 0 ? 1.15 : 0.87, e.clientX, e.clientY));
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const down = (e) => {
    touch.current.pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (touch.current.pts.size === 1) touch.current.moved = false;
    touch.current.pinch = 0;
  };
  const move = (e) => {
    const t = touch.current;
    if (!t.pts.has(e.pointerId)) return;
    const [px, py] = t.pts.get(e.pointerId);
    t.pts.set(e.pointerId, [e.clientX, e.clientY]);
    const pts = [...t.pts.values()];
    if (pts.length === 1) {
      const [dx, dy] = [e.clientX - px, e.clientY - py];
      if (Math.abs(dx) + Math.abs(dy) > 3) t.moved = true;
      if (t.moved) setVb((v) => ((s) => ({ ...v, x: v.x - dx * s, y: v.y - dy * s }))(at(0, 0, v).s));
    } else if (pts.length === 2) {
      t.moved = true;
      const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
      if (t.pinch) zoom(t.pinch / d, (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
      t.pinch = d;
    }
  };
  const up = (e) => (touch.current.pts.delete(e.pointerId), (touch.current.pinch = 0));
  // A drag isn't a tap: whatever was under the finger when it lifted isn't picked.
  const swallow = (e) => touch.current.moved && (e.stopPropagation(), (touch.current.moved = false));
  const findMe = () => home && setVb((v) => ({ ...v, x: home.x - v.w / 2, y: home.y - v.h / 2 }));
  // The window takes the drawing's own proportions, within reason, so a long place isn't lost in a square.
  const ratio = Math.max(0.75, Math.min(1.9, frame.w / frame.h));
  return html`<div className="mapbar">
      <div className="lvls">${lead}</div>
      <div className="mapctl" role="group" aria-label="Map view">
        <button onClick=${() => zoom(0.75)} aria-label="Zoom in">+</button>
        <button onClick=${() => zoom(1.33)} aria-label="Zoom out">−</button>
        <button onClick=${() => setVb(frame)} title="Show all of it">All</button>
        ${home ? html`<button onClick=${findMe} title="Centre on your party">Me</button>` : null}
      </div>
    </div>
    <div className="mapwin">
      <svg ref=${svg} viewBox=${`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style=${{ aspectRatio: `${ratio} / 1` }} role="img" aria-label=${label} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up} onPointerLeave=${up} onClickCapture=${swallow}>${children}</svg>
    </div>`;
}

const DEFS = html`<defs>
  <pattern id="m-water" width="18" height="9" patternUnits="userSpaceOnUse"><path d="M0 4.5q4.5-5 9 0t9 0" fill="none" stroke="#fff" strokeWidth="1.1" opacity=".38" /></pattern>
  <pattern id="m-planks" width="9" height="30" patternUnits="userSpaceOnUse"><path d="M.5 0v30" stroke="var(--map-ink)" strokeWidth=".8" opacity=".28" /><path d="M.5 11h8.5" stroke="var(--map-ink)" strokeWidth=".6" opacity=".2" /></pattern>
  <pattern id="m-rubble" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M2 3l2-1 1 2-2 1zM9 8l2 0 0 2-2 0z" fill="var(--map-ink)" opacity=".2" /></pattern>
  <pattern id="m-cave" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r=".9" fill="var(--map-ink)" opacity=".16" /><circle cx="12" cy="13" r=".7" fill="var(--map-ink)" opacity=".16" /></pattern>
  <pattern id="m-floor" width=${S} height=${S} patternUnits="userSpaceOnUse"><path d=${`M${S} 0H0V${S}`} fill="none" stroke="var(--map-ink)" strokeWidth=".5" opacity=".13" /></pattern>
  <pattern id="m-fog" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v7" stroke="var(--map-paper)" strokeWidth="3" opacity=".55" /></pattern>
  <filter id="m-lift" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity=".28" /></filter>
</defs>`;

// One place: its floor in the colour of what's underfoot, its texture, how dark it is, and its wall.
function Place({ z, picked, onPick }) {
  const d = pathOf(z);
  const g = groundOf(z);
  return html`<g onClick=${() => onPick({ zone: z.id })} style=${{ cursor: "pointer" }}><title>${z.name}</title>
    <path d=${d} fill=${GROUND[g]} filter="url(#m-lift)" />
    <path d=${d} fill=${`url(#m-${g})`} />
    ${SHADE[z.light] ? html`<path d=${d} fill="var(--map-shade)" opacity=${SHADE[z.light]} />` : null}
    ${z.seen ? null : html`<path d=${d} fill="url(#m-fog)" />`}
    ${picked ? html`<path d=${d} fill="var(--gold)" opacity=".2" />` : null}
    <path d=${d} fill="none" stroke="var(--map-ink)" strokeWidth="3.4" strokeLinejoin="round" />
    <path d=${d} fill="none" stroke=${picked ? "var(--gold)" : "var(--map-paper)"} strokeWidth="1" strokeLinejoin="round" opacity=${picked ? 1 : 0.35} />
  </g>`;
}

function Level({ view, level, under, colors, picked, onPick, k }) {
  const tokens = placeTokens(level, Math.min(k, 1.6));
  const roomy = (id) => level.zones.find((z) => z.id === id)?.rects.reduce((n, [, , w, h]) => n + w * h, 0) >= 40;
  const floorOf = (c) => GROUND[groundOf(level.zones.find((z) => c.between.includes(z.id)) ?? { ground: "floor" })];
  return html`<g>
    ${under ? html`<g opacity=".28" pointerEvents="none">${under.zones.map((z) => html`<path key=${z.id} d=${pathOf(z)} fill="none" stroke="var(--map-ink)" strokeWidth="2" strokeDasharray="5 5" />`)}</g>` : null}
    ${level.zones.map((z) => html`<${Place} key=${z.id} z=${z} picked=${picked === z.id} onPick=${onPick} />`)}
    ${level.connections.map((c) => {
      if (c.wall) {
        const [[x1, y1], [x2, y2]] = c.wall;
        const [mx, my] = [((x1 + x2) / 2) * S, ((y1 + y2) / 2) * S];
        const across = x1 === x2;
        // The way cuts the wall: the floor runs through it.
        const cut = html`<line x1=${x1 * S + (across ? 0 : 4)} y1=${y1 * S + (across ? 4 : 0)} x2=${x2 * S - (across ? 0 : 4)} y2=${y2 * S - (across ? 4 : 0)} stroke=${floorOf(c)} strokeWidth="7" />`;
        // A way into a place not yet found: a broken line and a mark.
        if (c.gap) return html`<g key=${c.id} onClick=${(e) => (e.stopPropagation(), onPick({ title: `${c.name}: where it leads is still to find` }))} style=${{ cursor: "pointer" }}><title>${c.name}: unexplored</title>${cut}<line x1=${x1 * S} y1=${y1 * S} x2=${x2 * S} y2=${y2 * S} stroke="var(--gold)" strokeWidth="3" strokeDasharray="2 5" /><g transform=${scaleAt(mx, my, k)}><circle cx=${mx} cy=${my} r="7.5" fill="var(--surface)" stroke="var(--gold)" strokeWidth="1.4" /><text className="token-label" x=${mx} y=${my + 3.5} textAnchor="middle" fill="var(--gold)">?</text></g></g>`;
        if (c.kind === "opening") return html`<g key=${c.id} pointerEvents="none">${cut}</g>`;
        const stroke = c.locked ? "var(--danger)" : c.kind === "bars" ? "var(--trust)" : "var(--gold)";
        return html`<g key=${c.id} onClick=${(e) => (e.stopPropagation(), onPick({ title: `${c.name}${c.locked ? " (locked)" : ""}` }))} style=${{ cursor: "pointer" }}><title>${c.name}${c.locked ? " (locked)" : ""}</title>${cut}
          <line x1=${x1 * S + (across ? 0 : 5)} y1=${y1 * S + (across ? 5 : 0)} x2=${x2 * S - (across ? 0 : 5)} y2=${y2 * S - (across ? 5 : 0)} stroke=${stroke} strokeWidth=${c.kind === "bars" || c.kind === "grate" ? 4 : 5} strokeLinecap="round" strokeDasharray=${c.kind === "bars" || c.kind === "grate" ? "1.5 5" : "none"} /></g>`;
      }
      // A way up or down: a ladder mark, an arrow for which way, and where it goes once that's known.
      const [x, y] = c.square;
      const [cx, cy] = [(x + 0.5) * S, (y + 0.5) * S];
      const up = c.dir > 0;
      const where = c.leads ? `${up ? "up" : "down"} to ${c.leads}` : "where it leads is still to find";
      return html`<g key=${c.id} transform=${scaleAt(cx, cy, Math.min(k, 1.5))} onClick=${(e) => (e.stopPropagation(), onPick({ title: `${c.name}: ${where}` }))} style=${{ cursor: "pointer" }}><title>${c.name}: ${where}</title>
        <rect x=${cx - 9} y=${cy - 11} width="18" height="22" rx="4" fill="var(--surface)" stroke=${c.leads ? "var(--map-ink)" : "var(--gold)"} strokeWidth="1.3" strokeDasharray=${c.leads ? "none" : "2 3"} />
        ${c.kind === "stairs" ? [-5, 0, 5].map((d) => html`<line key=${d} x1=${cx - 5} y1=${cy + d + 2} x2=${cx + 5} y2=${cy + d + 2} stroke="var(--map-ink)" strokeWidth="1.3" />`) : html`<circle cx=${cx} cy=${cy + 2} r="4" fill="none" stroke="var(--map-ink)" strokeWidth="1.3" />`}
        <path d=${up ? `M${cx - 4} ${cy - 5}L${cx} ${cy - 10}L${cx + 4} ${cy - 5}Z` : `M${cx - 4} ${cy + 9}L${cx} ${cy + 14}L${cx + 4} ${cy + 9}Z`} fill=${c.leads ? "var(--map-ink)" : "var(--gold)"} /></g>`;
    })}
    ${level.zones.map((z) => {
      const [x, y, w] = largest(z.rects);
      // A place too small to hold its name is named when it's tapped.
      if (w * S < z.name.length * 5.4 * k) return null;
      return html`<text key=${"l" + z.id} className="zone-label halo" x=${(x + w / 2) * S} y=${y * S + 12 * k} textAnchor="middle" pointerEvents="none" style=${{ fontSize: `${9.5 * k}px` }}>${z.name}${z.exit ? html`<tspan x=${(x + w / 2) * S} dy=${10.5 * k} style=${{ fontSize: `${7.5 * k}px` }} fill="var(--gold)">a way on</tspan>` : null}</text>`;
    })}
    ${level.things.map((t, i) => {
      const [cx, cy] = [(t.at[0] + 0.5) * S, (t.at[1] + 0.5) * S];
      const crowded = level.things.slice(0, i).some((o) => o.at[1] === t.at[1] && Math.abs(o.at[0] - t.at[0]) <= 2);
      return html`<g key=${t.id} transform=${scaleAt(cx, cy, k)} opacity=${t.seen ? 1 : 0.5} onClick=${(e) => (e.stopPropagation(), onPick({ title: `${t.name}${t.holds.length ? `: ${t.holds.join(", ")}` : ""}`, zone: t.zone }))} style=${{ cursor: "pointer" }}><title>${t.name}</title>
        <path d=${`M${cx} ${cy - 5.5}L${cx + 5.5} ${cy}L${cx} ${cy + 5.5}L${cx - 5.5} ${cy}Z`} fill=${t.holds.length ? "var(--gold)" : "var(--surface)"} stroke="var(--map-ink)" strokeWidth="1.2" />
        ${roomy(t.zone) ? html`<text className="thing-label halo" x=${cx} y=${crowded ? cy - 9 : cy + 15} textAnchor="middle">${t.name}</text>` : null}</g>`;
    })}
    ${tokens.map((t) => html`<${Token} key=${t.id} t=${t} colors=${colors} onPick=${onPick} />`)}
  </g>`;
}

// A room with no drawn map: boxes for its places, in columns by how far each is from the party, and lines for the
// ways between. No sizes, no directions.
function Sketch({ sketch, colors, picked, onPick }) {
  const [W, H, GX, GY] = [132, 62, 44, 16];
  const at = (n) => [n.col * (W + GX), n.row * (H + GY)];
  const by = Object.fromEntries(sketch.nodes.map((n) => [n.id, n]));
  return html`<g>
    ${sketch.links.map((l) => {
      const [[ax, ay], [bx, by2]] = [at(by[l.a]), at(by[l.b])];
      return html`<line key=${l.id} x1=${ax + W / 2} y1=${ay + H / 2} x2=${bx + W / 2} y2=${by2 + H / 2} stroke=${l.locked ? "var(--danger)" : "var(--map-ink)"} strokeWidth="2.5" strokeLinecap="round" strokeDasharray=${l.locked ? "3 5" : "none"} opacity=".7"><title>${l.name}</title></line>`;
    })}
    ${sketch.nodes.map((n) => {
      const [x, y] = at(n);
      return html`<g key=${n.id} onClick=${() => onPick({ zone: n.id })} style=${{ cursor: "pointer" }}>
        <rect x=${x} y=${y} width=${W} height=${H} rx="14" fill="var(--map-stone)" filter="url(#m-lift)" />
        ${SHADE[n.light] ? html`<rect x=${x} y=${y} width=${W} height=${H} rx="14" fill="var(--map-shade)" opacity=${SHADE[n.light]} />` : null}
        <rect x=${x} y=${y} width=${W} height=${H} rx="14" fill="none" stroke=${picked === n.id ? "var(--gold)" : "var(--map-ink)"} strokeWidth=${picked === n.id ? 3.5 : 2.4} />
        <text className="zone-label halo" x=${x + W / 2} y=${y + 17} textAnchor="middle" style=${{ fontSize: "11.5px" }}>${n.name.length > 22 ? `${n.name.slice(0, 21)}…` : n.name}</text>
        ${n.tokens.map((t, i) => html`<${Token} key=${t.id} t=${{ ...t, k: 0.9, cx: x + 18 + (i % 5) * 24, cy: y + 40 }} colors=${colors} onPick=${onPick} />`)}</g>`;
    })}
  </g>`;
}

// The Map tab: the map in its window, the levels to choose from, what's known of whatever was tapped, and who is
// where in words.
export function MapTab({ view, sketch, sheet, colors, party }) {
  const [pick, setPick] = useState(null);
  const mine = view?.levels.find((l) => l.tokens.some((t) => t.id === "player")) ?? view?.levels.find((l) => l.level === 0) ?? view?.levels[0];
  const [shown, setShown] = useState(null);
  const level = view ? view.levels.find((l) => l.level === shown) ?? mine : null;
  const place = pick?.zone ? sheet.places.find((p) => p.id === pick.zone) : null;
  const leads = place ? sheet.ways.filter((w) => w.between.includes(place.name)).map((w) => `${w.between.find((b) => b !== place.name) ?? place.name} (${w.how.split(",")[0]})`) : [];
  const tokens = view ? view.levels.flatMap((l) => l.tokens) : sketch.nodes.flatMap((n) => n.tokens);
  const everyone = tokens.filter((t) => !t.party);
  const placeName = (id) => sheet.places.find((p) => p.id === id)?.name ?? "somewhere";
  const levelOfZone = (id) => view?.levels.find((l) => l.zones.some((z) => z.id === id))?.level;
  const pad = 26;
  const frame = view
    ? { x: view.x0 * S - pad, y: view.y0 * S - pad, w: view.width * S + pad * 2, h: view.height * S + pad * 2 }
    : ((cols, rows) => ({ x: -pad, y: -pad, w: cols * 176 - 44 + pad * 2, h: rows * 78 - 16 + pad * 2 }))(Math.max(...sketch.nodes.map((n) => n.col)) + 1, Math.max(...sketch.nodes.map((n) => n.row)) + 1);
  const k = Math.min(2.2, Math.max(1, frame.w / 400));
  const me = level && placeTokens(level).filter((t) => t.party);
  const home = me?.length ? { x: me.reduce((n, t) => n + t.cx, 0) / me.length, y: me.reduce((n, t) => n + t.cy, 0) / me.length } : null;
  // The level just under the one shown is drawn faintly beneath it, so above and below can be read together.
  const under = view && level ? view.levels.filter((l) => l.level < level.level).sort((a, b) => b.level - a.level)[0] ?? view.levels.filter((l) => l.level > level.level).sort((a, b) => a.level - b.level)[0] : null;
  const go = (t) => (setPick({ zone: t.zone }), view && setShown(levelOfZone(t.zone)));
  return html`<section className="maptabbox" aria-label="Map">
    <${Viewport} frame=${frame} home=${home}
      lead=${view && view.levels.length > 1 ? view.levels.map((l) => html`<button key=${l.level} aria-pressed=${l === level} onClick=${() => setShown(l.level)}>${LEVEL(l.level)}${l.tokens.some((t) => t.party) ? html`<span className="here-dot" aria-label="your party is here"></span>` : null}</button>`) : null}
      label=${view ? `Map, ${LEVEL(level.level).toLowerCase()}: ${level.zones.map((z) => z.name).join(", ")}` : "A sketch of the places here and the ways between them"}>
      ${DEFS}
      <rect x=${frame.x - frame.w * 2} y=${frame.y - frame.h * 2} width=${frame.w * 5} height=${frame.h * 5} fill="var(--map-paper)" onClick=${() => setPick(null)} />
      ${view ? html`<${Level} view=${view} level=${level} under=${under} colors=${colors} picked=${pick?.zone} onPick=${setPick} k=${k} />` : html`<${Sketch} sketch=${sketch} colors=${colors} picked=${pick?.zone} onPick=${setPick} />`}
      ${view ? html`<g pointerEvents="none"><line x1=${frame.x + 8} y1=${frame.y + frame.h - 10} x2=${frame.x + 8 + 2 * S} y2=${frame.y + frame.h - 10} stroke="var(--map-ink)" strokeWidth=${1.6 * k} strokeLinecap="round" /><text className="thing-label" x=${frame.x + 14 + 2 * S} y=${frame.y + frame.h - 7} style=${{ fontSize: `${8.5 * k}px` }}>10 ft</text></g>` : null}
    <//>
    ${view ? null : html`<span className="cap">A sketch: the places here and how they join, not to scale</span>`}
    <div className="mapnote" aria-live="polite">
      ${pick?.title ? html`<div><b>${pick.title}</b></div>` : null}
      ${place ? html`<div><b>${place.name}</b>${place.light ? html`<span className="muted"> (${place.light})</span>` : null}: ${place.what}${place.here.length ? html`<span className="here"> Here: ${place.here.join(", ")}.</span>` : null}${leads.length ? html`<span className="muted"> Leads to ${leads.join("; ")}.</span>` : null}</div>` : null}
      ${!pick ? html`<span className="muted">Drag to move the map, pinch or use the buttons to zoom, and tap anything to see what you know of it.</span>` : null}
    </div>
    <div className="whos" aria-label="Who is where">
      ${tokens.map((t) => html`<button key=${t.id} className="who-row" onClick=${() => go(t)}>
        <span className="dot" style=${t.party ? { background: colors[t.id] ?? "var(--gold)" } : { border: `2px ${t.ghost ? "dashed" : "solid"} var(--rose)`, color: "var(--rose)" }}>${t.mark}</span>
        <span><b>${t.party && t.id === "player" ? "You" : t.name}</b><span className="muted">${t.ghost ? `, last seen in ${placeName(t.zone)}` : `, in ${placeName(t.zone)}`}${t.down ? ", down" : ""}${t.holds.length ? `, carrying ${t.holds.join(", ")}` : ""}</span></span>
      </button>`)}
    </div>
    <div className="legend">
      ${everyone.some((t) => t.ghost) ? html`<span><span className="dot" style=${{ border: "2px dashed var(--rose)", opacity: 0.6 }}></span>where someone was last seen</span>` : null}
      ${view ? html`<span>◆ a thing</span><span style=${{ color: "var(--gold)" }}>? not yet explored</span><span>Hatched: out of sight now</span><span>Dashed outline: the level beneath</span>` : null}
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
