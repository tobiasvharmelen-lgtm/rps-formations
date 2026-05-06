import { PlayerId } from "shared";
import crypto from "node:crypto";

interface Session {
  token: string;
  playerId: PlayerId;
  roomId: string;
  expiresAt: number;
}

const TTL_MS = 60_000;
const sessions = new Map<string, Session>();

export function createSession(playerId: PlayerId, roomId: string): string {
  const token = crypto.randomBytes(16).toString("hex");
  sessions.set(token, { token, playerId, roomId, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function getSession(token: string): Session | undefined {
  const s = sessions.get(token);
  if (!s) return undefined;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return undefined;
  }
  return s;
}

export function renewSession(token: string): void {
  const s = sessions.get(token);
  if (s) s.expiresAt = Date.now() + TTL_MS;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}
