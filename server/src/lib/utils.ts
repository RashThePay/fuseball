import WebSocket from "ws";

type WebSocketClient = WebSocket & { id: string };

export const send = (ws: WebSocketClient, event: string, data?: any) => {
  setTimeout(() => {
    ws.send(JSON.stringify({ event, data }));
  }, SIMULATED_LATENCY);
};

export const broadcast = (
  wss: WebSocket.Server,
  event: string,
  data: any,
  playerIds?: string[]
) => {
  wss.clients.forEach(function each(client) {
    if (playerIds && !playerIds.includes((client as WebSocketClient).id)) {
      return;
    }

    client.send(JSON.stringify({ event, data }));
  });
};
