// Encode call output: a sketch turned into packet data, without geometry (D117, D153). Contract:
// docs/spec/calls/encode.md. It's the packet's shape (schemas/packet.js) with each zone's footprint replaced by a rough
// `size` in squares, and no walls, squares or coordinates: code lays it out (src/engine/layout.js).
import { packetSchema } from "../packet.js";

function encodeShape() {
  const s = structuredClone(packetSchema);
  const map = s.properties.map.properties;
  const zone = map.zones.items;
  zone.required = zone.required.filter((k) => k !== "rects");
  delete zone.properties.rects;
  zone.properties.size = { type: "array", items: { type: "integer", minimum: 1, maximum: 20 }, minItems: 2, maxItems: 2 };
  zone.required.push("size");
  const conn = map.connections.items;
  delete conn.properties.wall;
  delete conn.properties.square;
  delete map.things.items.properties.location.properties.at;
  return { ...s, $id: "encode" };
}

export const encodeSchema = encodeShape();
