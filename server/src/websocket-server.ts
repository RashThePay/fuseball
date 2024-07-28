import WebSocket from "ws";
import { randomUUID } from "crypto";
import { handleConnection } from "./handlers/connection-handler";
import gameLoop from "./lib/game-loop";
import { setWss } from "./lib/lobby-manager/state";

type WebSocketClient = WebSocket & { id: string };

export const createServer = (port: number): WebSocket.Server => {
  const wss = new WebSocket.Server({ port });

  wss.on("connection", (ws: WebSocketClient) => {
    ws.id = randomUUID();
    handleConnection(ws, wss);
  });

  gameLoop(wss);
  setWss(wss);

  return wss;
};