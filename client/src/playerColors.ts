import { LOBBY_COLORS } from "shared";

/** Mutable player color state — updated by lobby before game starts. */
export const playerColors = {
  p1: LOBBY_COLORS[0].hex,
  p2: LOBBY_COLORS[1].hex,
};
