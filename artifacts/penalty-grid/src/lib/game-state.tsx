import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RoomSnapshot } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export type Criterion = { id: string; label: string; shortLabel: string };
export type PenaltyResult = "goal" | "save" | "miss" | null;

export interface MatchSnapshot {
  round: number;
  maxRounds: number;
  phase: "shooting-select" | "shooting-answer" | "save-challenge" | "result" | "finished";
  shooterId: string;
  keeperId: string;
  grid: { rows: Criterion[]; columns: Criterion[] };
  shooterSquare: number | null;
  keeperSquare: number | null;
  shooterAnswer: string | null;
  keeperAnswer: string | null;
  result: PenaltyResult;
  resultReason: string | null;
  deadline: number | null;
  penaltyHistory: Array<{
    round: number;
    result: Exclude<PenaltyResult, null>;
    shooterName: string;
    keeperName: string;
    square: number;
    answer: string | null;
  }>;
}

export interface GameSession {
  code: string;
  playerId: string;
  sessionToken: string;
}

interface GameContextType {
  session: GameSession | null;
  room: RoomSnapshot | null;
  match: MatchSnapshot | null;
  connected: boolean;
  error: string | null;
  setSession: (session: GameSession) => void;
  clearSession: () => void;
  sendCommand: (type: string, payload?: Record<string, unknown>) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<GameSession | null>(() => {
    try {
      const stored = sessionStorage.getItem("penalty-grid-session");
      return stored ? (JSON.parse(stored) as GameSession) : null;
    } catch {
      return null;
    }
  });
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const [, setLocation] = useLocation();

  const setSession = useCallback((newSession: GameSession) => {
    sessionStorage.setItem("penalty-grid-session", JSON.stringify(newSession));
    setSessionState(newSession);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem("penalty-grid-session");
    setSessionState(null);
    setRoom(null);
    setMatch(null);
    if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setLocation("/");
  }, [setLocation]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const params = new URLSearchParams({
        code: session.code,
        playerId: session.playerId,
        sessionToken: session.sessionToken,
      });
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws?${params}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            room?: RoomSnapshot;
            game?: MatchSnapshot | null;
          };
          if (data.type === "state" && data.room) {
            setRoom(data.room);
            setMatch(data.game ?? null);
          }
        } catch {
          setError("The stadium feed sent an unreadable update. Reconnecting…");
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          reconnectRef.current = window.setTimeout(connect, 1200);
        }
      };
      ws.onerror = () => {
        setConnected(false);
        setError("Connection interrupted. Trying to get you back in the match…");
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [session]);

  const sendCommand = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, ...payload }));
      } else {
        setError("You are reconnecting. Your move will be available in a moment.");
      }
    },
    [],
  );

  return (
    <GameContext.Provider
      value={{
        session,
        room,
        match,
        connected,
        error,
        setSession,
        clearSession,
        sendCommand,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}