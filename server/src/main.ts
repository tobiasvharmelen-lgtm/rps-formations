import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { PlayerId } from "shared";
import { MsgType, ClientMessage } from "shared";
import { TICK_RATE } from "shared";
import { Connection } from "./net/Connection.js";
import { joinQueue, leaveQueue, setMatchCallback } from "./matchmaking/Queue.js";
import { GameRoom } from "./game/GameRoom.js";
import { createSession, getSession, renewSession } from "./net/SessionStore.js";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// In-memory room registry
const rooms = new Map<string, GameRoom>();

app.get("/health", (_req, res) => res.json({ ok: true, tick_rate: TICK_RATE }));

// In production the compiled server is at server/dist/main.js.
// Two directories up lands at the workspace root, then into client/dist.
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for any unmatched GET
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

setMatchCallback((p1, p2) => {
  const roomId = crypto.randomBytes(8).toString("hex");

  const token1 = createSession(PlayerId.One, roomId);
  const token2 = createSession(PlayerId.Two, roomId);

  p1.sessionToken = token1;
  p2.sessionToken = token2;

  p1.send({ type: MsgType.S_HELLO, playerId: PlayerId.One, sessionToken: token1, serverTickRate: TICK_RATE });
  p2.send({ type: MsgType.S_HELLO, playerId: PlayerId.Two, sessionToken: token2, serverTickRate: TICK_RATE });

  const room = new GameRoom(roomId, p1, p2);
  room.onEnd = () => {
    // Keep room in registry for the reconnect window, then clean up
    setTimeout(() => rooms.delete(roomId), 60_000);
  };
  rooms.set(roomId, room);
  room.start();
});

wss.on("connection", (ws: WebSocket) => {
  const conn = new Connection(ws);

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case MsgType.C_JOIN_QUEUE:
        joinQueue(conn);
        break;

      case MsgType.C_LEAVE_QUEUE:
        leaveQueue(conn);
        break;

      case MsgType.C_INPUT: {
        if (!conn.roomId || !conn.playerId) break;
        const room = rooms.get(conn.roomId);
        room?.handleInput(conn.playerId, msg.input);
        break;
      }

      case MsgType.C_RECONNECT: {
        const session = getSession(msg.sessionToken);
        if (!session) {
          conn.send({ type: MsgType.S_ERROR, message: "Session expired" });
          break;
        }
        const room = rooms.get(session.roomId);
        if (!room) {
          conn.send({ type: MsgType.S_ERROR, message: "Room not found" });
          break;
        }
        conn.sessionToken = session.token;
        renewSession(session.token);
        room.reconnectPlayer(conn, session.playerId);
        break;
      }

      case MsgType.C_LOBBY_UPDATE: {
        if (!conn.roomId || !conn.playerId) break;
        rooms.get(conn.roomId)?.handleLobbyUpdate(conn.playerId, msg.choice);
        break;
      }

      case MsgType.C_LOBBY_READY: {
        if (!conn.roomId || !conn.playerId) break;
        rooms.get(conn.roomId)?.handleLobbyReady(conn.playerId);
        break;
      }

      case MsgType.C_PING:
        conn.send({ type: MsgType.S_PONG, clientTime: msg.clientTime, serverTime: Date.now() });
        break;
    }
  });

  ws.on("close", () => {
    leaveQueue(conn);
    if (conn.roomId && conn.playerId) {
      rooms.get(conn.roomId)?.handleDisconnect(conn.playerId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`RPS server listening on port ${PORT}`);
});
