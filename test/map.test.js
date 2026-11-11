// The map's shapes (D182): the outline of any footprint, and fixture rooms that try round rooms, natural rock,
// built rooms with locked doors and bars, water, planks and three levels.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { newSession } from "../src/game/session.js";
import { mapView, outline } from "../src/game/view.js";
import { layout } from "../src/engine/layout.js";

const file = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const start = (packet) => newSession({ packet, player: { name: "Kael", class: "rogue" }, companions: ["fern", "celeste"] }).state;
const area = (loop) => Math.abs(loop.reduce((n, [x, y], i) => n + x * loop[(i + 1) % loop.length][1] - loop[(i + 1) % loop.length][0] * y, 0)) / 2;

test("an outline goes once round any footprint, a square at a step, and encloses exactly its squares", () => {
  assert.equal(outline([[0, 0, 2, 3]]).length, 1);
  assert.equal(area(outline([[0, 0, 2, 3]])[0]), 6);
  // An L, a U and two pieces apart.
  assert.equal(area(outline([[0, 0, 6, 3], [0, 3, 3, 4]])[0]), 30);
  const u = outline([[2, 12, 1, 5], [2, 17, 17, 1], [18, 13, 1, 4]]);
  assert.equal(u.length, 1);
  assert.equal(area(u[0]), 26);
  assert.equal(outline([[0, 0, 1, 1], [5, 5, 2, 2]]).length, 2);
  // A ring has an outside and an inside.
  const ring = outline([[0, 0, 3, 1], [0, 1, 1, 1], [2, 1, 1, 1], [0, 2, 3, 1]]);
  assert.deepEqual(ring.map(area).sort(), [1, 9]);
  for (const loop of u) loop.forEach(([x, y], i) => assert.equal(Math.abs(x - loop[(i + 1) % loop.length][0]) + Math.abs(y - loop[(i + 1) % loop.length][1]), 1));
});

test("the fixture rooms load and draw: every shape and ground, locked ways, and each level", () => {
  const shapes = new Set();
  const grounds = new Set();
  for (const f of readdirSync(new URL("../fixtures/maps/", import.meta.url))) {
    const m = mapView(start(JSON.parse(file(`fixtures/maps/${f}`))));
    assert.ok(m, f);
    for (const l of m.levels) for (const z of l.zones) (shapes.add(z.shape), grounds.add(z.ground), assert.ok(z.loops.length >= 1 && Array.isArray(z.fixed), `${f}: ${z.id}`));
    assert.ok(m.levels.flatMap((l) => l.connections).every((c) => c.wall || c.square));
  }
  assert.deepEqual([...shapes].sort(), ["built", "cave", "round"]);
  assert.deepEqual([...grounds].sort(), ["floor", "planks", "rubble", "water"]);
  const belfry = mapView(start(JSON.parse(file("fixtures/maps/belfry.json"))));
  assert.deepEqual(belfry.levels.map((l) => l.level), [1, 0, -1]);
  const chapel = mapView(start(JSON.parse(file("fixtures/maps/chapel.json"))));
  assert.ok(chapel.levels.find((l) => l.level === 0).connections.filter((c) => c.locked).length === 2);
});

test("a generated room, laid out by code, draws too, with the shapes its zones were given", () => {
  const encoded = JSON.parse(file("fixtures/generator/encoded.json"));
  encoded.map.zones[0].shape = "cave";
  const { packet, mapped } = layout(encoded);
  assert.ok(mapped);
  const m = mapView(start(packet));
  assert.equal(m.levels.flatMap((l) => l.zones).find((z) => z.id === encoded.map.zones[0].id).shape, "cave");
});

test("the layout draws every room it's given: loops, rooms on other levels, and rooms nothing reaches (D183)", async () => {
  const { geometryProblems } = await import("../src/engine/map.js");
  // A steady source of made-up rooms: 2 to 9 zones of any size, a tree of ways plus extra ones that close loops,
  // some zones on other levels, sometimes one that nothing joins, and a few things in each.
  let seed = 7;
  const rnd = (n) => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0), (seed >>> 8) % n);
  let arms = 0;
  for (let run = 0; run < 500; run++) {
    const n = 2 + rnd(8);
    const zones = Array.from({ length: n }, (_, i) => ({ id: `z${i}`, name: `Z${i}`, purpose: "x", light: "dim", size: [1 + rnd(8), 1 + rnd(8)], ...(rnd(4) === 0 ? { level: rnd(3) - 1 } : {}) }));
    const connections = [];
    const link = (a, b) => a !== b && !connections.some((c) => c.between.includes(`z${a}`) && c.between.includes(`z${b}`)) && connections.push({ id: `c${connections.length}`, kind: "opening", between: [`z${a}`, `z${b}`], fits: "large", operated_from: "both" });
    const lonely = rnd(6) === 0 ? n - 1 : -1;
    for (let i = 1; i < n; i++) if (i !== lonely) link(i, rnd(i));
    for (let k = rnd(4); k > 0; k--) link(rnd(n), rnd(n));
    const things = Array.from({ length: rnd(7) }, (_, i) => ({ id: `t${i}`, name: `T${i}`, properties: "x", location: { zone: `z${rnd(n)}` } }));
    const { packet, mapped } = layout({ map: { zones, connections, things, facts: [] }, start: { positions: { player: "z0" } } });
    assert.ok(mapped, `room ${run} got no map`);
    assert.deepEqual(geometryProblems(packet), [], `room ${run}`);
    assert.ok(packet.map.things.every((t) => Array.isArray(t.location.at)), `room ${run}: a thing with no square`);
    arms += packet.map.zones.filter((z) => z.rects.length > 1).length;
  }
  assert.ok(arms > 0, "some of them needed an arm grown to close a loop");
});
