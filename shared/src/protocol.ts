import { PlayerId, GameState, PlayerInput, LobbyChoice } from "./types.js";

export const enum MsgType {
  // Server → Client
  S_HELLO = 1,
  S_MATCH_FOUND = 2,
  S_GAME_STATE = 3,
  S_INPUT_ACK = 4,
  S_GAME_OVER = 5,
  S_ERROR = 6,
  S_PONG = 7,
  S_LOBBY_STATE = 8,

  // Client → Server
  C_JOIN_QUEUE = 20,
  C_LEAVE_QUEUE = 21,
  C_INPUT = 22,
  C_RECONNECT = 23,
  C_PING = 24,
  C_LOBBY_UPDATE = 25,
  C_LOBBY_READY = 26,
}

export interface S_Hello {
  type: MsgType.S_HELLO;
  playerId: PlayerId;
  sessionToken: string;
  serverTickRate: number;
}

export interface S_MatchFound {
  type: MsgType.S_MATCH_FOUND;
  roomId: string;
}

export interface S_GameState {
  type: MsgType.S_GAME_STATE;
  tick: number;
  state: GameState;
  lastAckedInput: number;
}

export interface S_InputAck {
  type: MsgType.S_INPUT_ACK;
  seq: number;
}

export interface S_GameOver {
  type: MsgType.S_GAME_OVER;
  winnerId: PlayerId | 0;
}

export interface S_Error {
  type: MsgType.S_ERROR;
  message: string;
}

export interface S_Pong {
  type: MsgType.S_PONG;
  clientTime: number;
  /** Server wall-clock time (Date.now()) at moment of send, for clock sync. */
  serverTime: number;
}

export interface S_LobbyState {
  type: MsgType.S_LOBBY_STATE;
  p1: LobbyChoice;
  p2: LobbyChoice;
}

export interface C_JoinQueue {
  type: MsgType.C_JOIN_QUEUE;
  displayName?: string;
}

export interface C_LeaveQueue {
  type: MsgType.C_LEAVE_QUEUE;
}

export interface C_Input {
  type: MsgType.C_INPUT;
  input: PlayerInput;
}

export interface C_Reconnect {
  type: MsgType.C_RECONNECT;
  sessionToken: string;
  lastKnownTick: number;
}

export interface C_Ping {
  type: MsgType.C_PING;
  clientTime: number;
}

export interface C_LobbyUpdate {
  type: MsgType.C_LOBBY_UPDATE;
  choice: Partial<LobbyChoice>;
}

export interface C_LobbyReady {
  type: MsgType.C_LOBBY_READY;
}

export type ServerMessage =
  | S_Hello
  | S_MatchFound
  | S_GameState
  | S_InputAck
  | S_GameOver
  | S_Error
  | S_Pong
  | S_LobbyState;

export type ClientMessage =
  | C_JoinQueue
  | C_LeaveQueue
  | C_Input
  | C_Reconnect
  | C_Ping
  | C_LobbyUpdate
  | C_LobbyReady;
