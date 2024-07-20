import React, { useState, useEffect, useContext } from "react";
import emitter from "@/lib/emitter";
import config from "@/config";
import ReconnectingWebSocket, { ErrorEvent } from "reconnecting-websocket";

type WebSocketContextType = {
  ws: ReconnectingWebSocket | null;
  status: "connecting" | "connected" | "disconnected" | "error";
  ping: number | null;
};

const WebSocketContext = React.createContext<WebSocketContextType>({
  ws: null,
  status: "connecting",
  ping: null,
});

const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [ws, setWs] = useState<ReconnectingWebSocket | null>(null);
  const [status, setStatus] =
    useState<WebSocketContextType["status"]>("connecting");
  const [ping, setPing] = useState<number | null>(null);

  const onEmitterSend = (event: string | any) => {
    if (!ws) {
      return;
    }

    ws?.send(
      JSON.stringify({
        event: typeof event === "string" ? event : event.event,
        data:
          typeof event === "object"
            ? {
                ...event.data,
                event: undefined,
              }
            : undefined,
      })
    );
  };

  const measurePing = () => {
    if (!ws) {
      return;
    }

    const pingTimestamp = Date.now();
    ws.send(JSON.stringify({ event: "ping" }));

    const onPongReceived = () => {
      const roundTripTime = Date.now() - pingTimestamp;
      setPing(roundTripTime);
      emitter.off("ws:message:pong", onPongReceived);
    };

    emitter.on("ws:message:pong", onPongReceived);
  };

  useEffect(() => {
    emitter.on("ws:send", onEmitterSend);

    return () => {
      emitter.off("ws:send", onEmitterSend);
    };
  }, [ws, status]);

  useEffect(() => {
    const ws = new ReconnectingWebSocket(config.wsUrl);

    ws.onopen = () => {
      emitter.emit("ws:connected");
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      const parsedMessage = JSON.parse(event.data);

      emitter.emit("ws:message", parsedMessage);
      emitter.emit(`ws:message:${parsedMessage.event}`, parsedMessage);
    };

    ws.onclose = () => {
      setStatus("disconnected");
      emitter.emit("ws:disconnected");
    };

    ws.onerror = (event: ErrorEvent) => {
      setStatus("error");
      emitter.emit("ws:disconnected", event);
    };

    setWs(ws);

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (status === "connected") {
      const interval = setInterval(measurePing, 5000);
      return () => clearInterval(interval);
    }
  }, [ws, status]);

  useEffect(() => {
    console.log("ping", ping);
  }, [ping]);

  return (
    <WebSocketContext.Provider value={{ ws, status, ping }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);

export default WebSocketProvider;
