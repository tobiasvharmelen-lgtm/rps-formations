import { Connection } from "../net/Connection.js";

type MatchCallback = (p1: Connection, p2: Connection) => void;

const queue: Connection[] = [];
let onMatch: MatchCallback | null = null;

export function setMatchCallback(cb: MatchCallback): void {
  onMatch = cb;
}

export function joinQueue(conn: Connection): void {
  if (queue.includes(conn)) return;
  queue.push(conn);
  tryMatch();
}

export function leaveQueue(conn: Connection): void {
  const idx = queue.indexOf(conn);
  if (idx !== -1) queue.splice(idx, 1);
}

function tryMatch(): void {
  if (queue.length >= 2 && onMatch) {
    const p1 = queue.shift()!;
    const p2 = queue.shift()!;
    onMatch(p1, p2);
  }
}
