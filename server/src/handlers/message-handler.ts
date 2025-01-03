import WebSocket from "ws";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { send } from "../lib/utils";
import lobbyManager from "../lib/lobby-manager";
import type { PlayerData } from "../types/player";
import { addClient } from "../lib/lobby-manager/state";
import { WebSocketClient } from "../types/ws";
import { CreateLobby, JoinLobby } from "../types/lobby";
import getCountryCodeFromTimezone from "../lib/helpers/get-country-code-from-timezone";
import { log } from "../lib/logger";
import getRandomPlayerName from "../lib/helpers/get-random-player-name";

type PlayerMove = {
  direction: "up" | "down" | "left" | "right";
};

type Handshake = {
  jwt: string;
  timezone: string;
  playerName: string;
  playerEmoji: number;
};

export const handleMessage = (
  message: string,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  try {
    const parsedMessage = JSON.parse(message);

    // if (
    //   parsedMessage.event !== "ping" &&
    //   parsedMessage.event !== "player-move-start" &&
    //   parsedMessage.event !== "player-move-end"
    // ) {
    //   console.log("got message", parsedMessage);
    // }

    switch (parsedMessage.event) {
      case "get-lobbies":
        send(ws, "lobbies", lobbyManager.getAll());
        break;

      case "create-lobby":
        handleCreateLobby(parsedMessage.data, ws, wss);
        break;

      case "leave-lobby":
        handleLeaveLobby(ws, wss);
        break;

      case "join-lobby":
        handleJoinLobby(parsedMessage.data, ws, wss);
        break;

      case "player-move-start":
        handlePlayerMoveStart(parsedMessage.data, ws, wss);
        break;

      case "player-move-end":
        handlePlayerMoveEnd(parsedMessage.data, ws, wss);
        break;

      case "player-kick-start":
        handlePlayerKickStart(parsedMessage.data, ws, wss);
        break;

      case "player-kick-end":
        handlePlayerKickEnd(parsedMessage.data, ws, wss);
        break;

      case "chat-message":
        handleChatMessage(parsedMessage.data, ws, wss);
        break;

      case "handshake":
        handleHandshake(parsedMessage.data, ws, wss);
        break;

      case "ping":
        send(ws, "pong");
        break;

      default:
        send(ws, "error", "Unknown event");
        break;
    }
  } catch (error) {
    console.error("Failed to handle message", message);
    console.error(error);

    send(ws, "error", "Invalid message format");
  }
};

const handleHandshake = async (
  data: Handshake,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  if (typeof data !== "object" || Array.isArray(data) || !data?.timezone) {
    return;
  }

  if (typeof data.timezone !== "string" || typeof data?.jwt !== "string") {
    return;
  }

  // if no jwt, we will make a new one
  if (data.jwt === "") {
    // if (
    //   typeof data.playerName !== "string" ||
    //   typeof data.playerEmoji !== "number"
    // ) {
    //   return;
    // }

    const playerData = {
      authenticated: false,
      timezone: data.timezone,
      id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER), // todo: this is a pretty bad solution but its gonna stay until we have a better one
      name: getRandomPlayerName(),
      emoji: 0, // todo: get random emoji
      country_code: getCountryCodeFromTimezone(data.timezone),
      total_wins: 0,
      total_goals: 0,
      total_games: 0,
      xp: 0,
      email: "",
    } as PlayerData;

    const token = jwt.sign(
      playerData,
      process.env.JWT_SECRET ?? "FUSEBALL_VERY_SECRET"
    );

    ws.playerData = playerData;

    ws.send(JSON.stringify({ event: "handshake", data: { jwt: token } }));

    addClient(playerData);

    log(
      `New player "${playerData.name}" from "${data.timezone}" has connected (no jwt)`
    );

    return;
  }

  // decode jwt
  try {
    const playerData = jwt.verify(
      data.jwt,
      process.env.JWT_SECRET ?? "FUSEBALL_VERY_SECRET"
    ) as PlayerData;

    ws.playerData = playerData;

    ws.send(
      JSON.stringify({
        event: "handshake",
        data: { jwt: data.jwt },
      })
    );

    addClient(playerData);

    log(
      `New player "${playerData.name}" from "${data.timezone}" has connected (signed in)`
    );
  } catch (e: any) {
    ws.send(
      JSON.stringify({
        event: "handshake-failed",
        data: { error: "Failed to decode JWT" },
      })
    );
  }
};

const handleChatMessage = (
  data: { message: string },
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  if (typeof data !== "object" || Array.isArray(data) || !data?.message) {
    return;
  }
  if (typeof data.message !== "string") {
    return;
  }

  if (data.message.replace(/\s+/g, "") === "") {
    return;
  }

  lobbyManager.chatMessage(data.message.substring(0, 50), ws.playerData);
};

const handlePlayerMoveStart = (
  data: PlayerMove,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  if (typeof data !== "object" || Array.isArray(data) || !data?.direction) {
    return;
  }

  lobbyManager.playerMoveStart(data.direction, ws.playerData);
};

const handlePlayerMoveEnd = (
  data: PlayerMove,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  if (typeof data !== "object" || Array.isArray(data) || !data?.direction) {
    return;
  }

  lobbyManager.playerMoveEnd(data.direction, ws.playerData);
};
const handlePlayerKickStart = (
  data: PlayerMove,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  lobbyManager.playerKickStart("kick", ws.playerData);
};
const handlePlayerKickEnd = (
  data: PlayerMove,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  lobbyManager.playerKickEnd("kick", ws.playerData);
};
const handleCreateLobby = (
  data: CreateLobby,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  const { lobby, error } = lobbyManager.create(data, ws.playerData);

  if (error) {
    send(ws, "create-lobby-error", error);
    return;
  }

  if (lobby) {
    send(ws, "create-lobby-success", lobby);
  }
};

const handleJoinLobby = (
  data: JoinLobby,
  ws: WebSocketClient,
  wss: WebSocket.Server
) => {
  const { lobby, error } = lobbyManager.join(data, ws.playerData);

  if (error) {
    send(ws, "join-lobby-error", error);
    return;
  }

  if (lobby) {
    send(ws, "join-lobby-success", lobby);
  }
};

const handleLeaveLobby = (ws: WebSocketClient, wss: WebSocket.Server) => {
  lobbyManager.removeClientFromLobbies(ws.playerData);
};
