// src/utils/posColor.ts
import type { Position } from "../models/Player";

export function posColor(pos: Position) {
  switch (pos) {
    case "QB":
      return "#fecaca";
    case "RB":
      return "#bbf7d0";
    case "WR":
      return "#bfdbfe";
    case "TE":
      return "#fed7aa";
    default:
      return "#ffffff";
  }
}