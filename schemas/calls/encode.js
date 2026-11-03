// Encode call output: the packet, staged (docs/spec/calls/encode.md). Until Phase 7 builds the stages, a packet is
// checked against the full packet schema. The sketch's layout format (sizes, not coordinates) is a Phase 7 format.
export { packetSchema as encodeSchema } from "../packet.js";
