import { randomBytes } from "node:crypto";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  CRITERIA,
  type CriterionId,
  FOOTBALLERS,
  validateAnswer,
} from "./football";
import { logger } from "./logger";

type RoomMode = "classic" | "party";
type Difficulty = "casual" | "competitive" | "hardcore";
type Team = "home" | "away" | "neutral";
type GamePhase =
  | "waiting"
  | "shooting-select"
  | "shooting-answer"
  | "save-challenge"
  | "result"
  | "finished";

type Player = {
  id: string;
  sessionToken: string;
  displayName: string;
  avatar: string;
  team: Team;
  ready: boolean;
  connected: boolean;
  score: number;
  goals: number;
  saves: number;
  misses: number;
  answers: number;
  streak: number;
};

type GridCell = { rowId: CriterionId; columnId: CriterionId };

type Game = {
  round: number;
  maxRounds: number;
  phase: GamePhase;
  shooterId: string;
  keeperId: string;
  grid: { rows: CriterionId[]; columns: CriterionId[] };
  shooterSquare: number | null;
  keeperSquare: number | null;
  shooterAnswer: string | null;
  keeperAnswer: string | null;
  result: "goal" | "save" | "miss" | null;
  resultReason: string | null;
  deadline: number | null;
  penaltyHistory: Array<{
    round: number;
    result: "goal" | "save" | "miss";
    shooterName: string;
    keeperName: string;
    square: number;
    answer: string | null;
  }>;
};

type Room = {
  code: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  mode: RoomMode;
  matchLength: number;
  turnTimerSeconds: number;
  maxPlayers: number;
  difficulty: Difficulty;
  players: Map<string, Player>;
  sockets: Map<string, WebSocket>;
  game: Game | null;
  createdAt: number;
  advanceTimer?: ReturnType<typeof setTimeout>;
};

const rooms = new Map<string, Room>();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const defaultAvatars = ["ST", "MK", "AJ", "RB", "LN", "YO", "KP", "ZE"];

function id(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function roomCode() {
  let code = "";
  do {
    code = Array.from({ length: 4 }, () =>
      ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length)),
    ).join("");
  } while (rooms.has(code));
  return code;
}

function sanitizeName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ").slice(0, 18);
}

function assignTeams(room: Room) {
  const players = [...room.players.values()];
  const neutral = players.length % 2 === 1 && players.length > 2;
  players.forEach((player, index) => {
    player.team = neutral && index === players.length - 1
      ? "neutral"
      : index % 2 === 0
        ? "home"
        : "away";
  });
}

function gridCell(game: Game, index: number): GridCell {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return {
    rowId: game.grid.rows[row],
    columnId: game.grid.columns[column],
  };
}

function makeGrid(): Game["grid"] {
  return {
    rows: ["argentina", "world-cup", "liverpool"],
    columns: ["premier-league", "la-liga", "serie-a"],
  };
}

function roomSnapshot(room: Room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    mode: room.mode,
    matchLength: room.matchLength,
    turnTimerSeconds: room.turnTimerSeconds,
    maxPlayers: room.maxPlayers,
    difficulty: room.difficulty,
    players: [...room.players.values()].map((player) => ({
      id: player.id,
      displayName: player.displayName,
      avatar: player.avatar,
      team: player.team,
      ready: player.ready,
      connected: player.connected,
      score: player.score,
    })),
  };
}

function publicGame(room: Room, viewerId: string) {
  const game = room.game;
  if (!game) return null;
  const viewerIsShooter = viewerId === game.shooterId;
  const viewerIsKeeper = viewerId === game.keeperId;
  return {
    round: game.round,
    maxRounds: game.maxRounds,
    phase: game.phase,
    shooterId: game.shooterId,
    keeperId: game.keeperId,
    grid: {
      rows: game.grid.rows.map((id) => CRITERIA[id]),
      columns: game.grid.columns.map((id) => CRITERIA[id]),
    },
    shooterSquare:
      viewerIsShooter ||
      (viewerIsKeeper && game.phase === "save-challenge") ||
      game.phase === "result" ||
      game.phase === "finished"
      ? game.shooterSquare
      : null,
    keeperSquare: viewerIsKeeper || game.phase === "result" || game.phase === "finished"
      ? game.keeperSquare
      : null,
    shooterAnswer: game.phase === "result" || game.phase === "finished"
      ? game.shooterAnswer
      : null,
    keeperAnswer: game.phase === "result" || game.phase === "finished"
      ? game.keeperAnswer
      : null,
    result: game.result,
    resultReason: game.resultReason,
    deadline: game.deadline,
    penaltyHistory: game.penaltyHistory,
  };
}

function stateFor(room: Room, viewerId: string) {
  return {
    type: "state",
    room: roomSnapshot(room),
    game: publicGame(room, viewerId),
    serverTime: Date.now(),
    availablePlayers: FOOTBALLERS.length,
  };
}

function send(room: Room, playerId: string, payload: unknown) {
  const socket = room.sockets.get(playerId);
  if (socket?.readyState === 1) socket.send(JSON.stringify(payload));
}

function broadcast(room: Room) {
  for (const player of room.players.values()) {
    send(room, player.id, stateFor(room, player.id));
  }
}

function chooseParticipants(room: Room) {
  const players = [...room.players.values()].filter((player) => player.connected);
  if (players.length < 2) return null;
  const roundIndex = room.game?.round ?? 1;
  const shooter = players[(roundIndex - 1) % players.length];
  const keeper = players.find((player) => player.id !== shooter.id) ?? players[0];
  return { shooter, keeper };
}

function beginPenalty(room: Room) {
  const participants = chooseParticipants(room);
  if (!participants) {
    room.status = "lobby";
    room.game = null;
    broadcast(room);
    return;
  }
  const previous = room.game;
  room.game = {
    round: previous ? previous.round : 1,
    maxRounds: room.matchLength * 2,
    phase: "shooting-select",
    shooterId: participants.shooter.id,
    keeperId: participants.keeper.id,
    grid: makeGrid(),
    shooterSquare: null,
    keeperSquare: null,
    shooterAnswer: null,
    keeperAnswer: null,
    result: null,
    resultReason: null,
    deadline: Date.now() + room.turnTimerSeconds * 1_000,
    penaltyHistory: previous?.penaltyHistory ?? [],
  };
  broadcast(room);
}

function finishResult(room: Room, result: "goal" | "save" | "miss", reason: string) {
  const game = room.game;
  if (!game) return;
  game.result = result;
  game.resultReason = reason;
  game.phase = "result";
  game.deadline = null;
  const shooter = room.players.get(game.shooterId);
  const keeper = room.players.get(game.keeperId);
  if (shooter && keeper) {
    if (result === "goal") {
      shooter.score += 1;
      shooter.goals += 1;
      shooter.streak += 1;
    } else if (result === "save") {
      keeper.score += 1;
      keeper.saves += 1;
      shooter.streak = 0;
    } else {
      shooter.misses += 1;
      shooter.streak = 0;
    }
    game.penaltyHistory.push({
      round: game.round,
      result,
      shooterName: shooter.displayName,
      keeperName: keeper.displayName,
      square: game.shooterSquare ?? 0,
      answer: game.shooterAnswer,
    });
  }
  broadcast(room);
  room.advanceTimer = setTimeout(() => {
    if (room.status !== "playing" || room.game?.phase !== "result") return;
    if (room.game.round >= room.game.maxRounds) {
      const score = [...room.players.values()].reduce(
        (totals, player) => {
          totals[player.team === "away" ? "away" : "home"] += player.score;
          return totals;
        },
        { home: 0, away: 0 },
      );
      if (score.home === score.away) {
        room.game.round += 1;
        room.game.maxRounds += 2;
        beginPenalty(room);
        return;
      }
      room.status = "finished";
      room.game.phase = "finished";
      broadcast(room);
      return;
    }
    room.game.round += 1;
    beginPenalty(room);
  }, 4_500);
}

function expireIfPastDeadline(room: Room, now = Date.now()) {
  const game = room.game;
  if (
    room.status !== "playing" ||
    !game?.deadline ||
    now < game.deadline ||
    (game.phase !== "shooting-select" &&
      game.phase !== "shooting-answer" &&
      game.phase !== "save-challenge")
  ) {
    return false;
  }
  if (game.phase === "save-challenge") {
    finishResult(room, "goal", "The save challenge timed out.");
  } else {
    finishResult(room, "miss", "Time expired. No shot taken.");
  }
  return true;
}

function startRoom(room: Room) {
  if (room.status !== "lobby" || room.players.size < 2) return;
  room.status = "playing";
  beginPenalty(room);
}

function handleCommand(room: Room, playerId: string, raw: unknown) {
  if (!raw || typeof raw !== "object") return;
  const message = raw as { type?: string; [key: string]: unknown };
  const game = room.game;
  const player = room.players.get(playerId);
  if (!player) return;

  if (
    game &&
    (message.type === "select_square" ||
      message.type === "keeper_select" ||
      message.type === "submit_answer") &&
    expireIfPastDeadline(room)
  ) {
    return;
  }

  if (message.type === "ready" && room.status === "lobby") {
    player.ready = !player.ready;
    assignTeams(room);
    broadcast(room);
    return;
  }
  if (message.type === "start" && playerId === room.hostId) {
    startRoom(room);
    return;
  }
  if (message.type === "select_square" && game && game.phase === "shooting-select") {
    const square = Number(message.square);
    if (Number.isInteger(square) && square >= 0 && square < 9) {
      if (playerId === game.shooterId) {
        game.shooterSquare = square;
        game.phase = "shooting-answer";
        game.deadline = Date.now() + room.turnTimerSeconds * 1_000;
      } else if (playerId === game.keeperId) {
        game.keeperSquare = square;
      }
      broadcast(room);
    }
    return;
  }
  if (message.type === "keeper_select" && game && game.phase !== "result" && game.phase !== "finished") {
    const square = Number(message.square);
    if (playerId === game.keeperId && Number.isInteger(square) && square >= 0 && square < 9) {
      game.keeperSquare = square;
      broadcast(room);
    }
    return;
  }
  if (message.type === "submit_answer" && game) {
    const answer = typeof message.answer === "string" ? message.answer.trim() : "";
    if (!answer || (game.phase !== "shooting-answer" && game.phase !== "save-challenge")) return;
    const cell = gridCell(game, game.shooterSquare ?? 0);
    if (game.phase === "shooting-answer" && playerId === game.shooterId) {
      game.shooterAnswer = answer;
      const validation = validateAnswer(answer, cell.rowId, cell.columnId);
      if (!validation.valid) {
        finishResult(room, "miss", validation.reason);
        return;
      }
      if (game.keeperSquare !== null && game.keeperSquare === game.shooterSquare) {
        game.phase = "save-challenge";
        game.deadline = Date.now() + room.turnTimerSeconds * 1_000;
        game.resultReason = "Correct dive. Keeper, name a different player.";
        broadcast(room);
        return;
      }
      finishResult(room, "goal", "Wrong direction. The shot finds the net.");
      return;
    }
    if (game.phase === "save-challenge" && playerId === game.keeperId) {
      game.keeperAnswer = answer;
      const validation = validateAnswer(answer, cell.rowId, cell.columnId, [
        game.shooterAnswer ?? "",
      ]);
      if (validation.valid) {
        finishResult(room, "save", `${validation.player.name} keeps it out.`);
      } else {
        finishResult(room, "goal", validation.reason);
      }
    }
    return;
  }
  if (message.type === "rematch" && playerId === room.hostId && room.status === "finished") {
    for (const currentPlayer of room.players.values()) {
      currentPlayer.score = 0;
      currentPlayer.goals = 0;
      currentPlayer.saves = 0;
      currentPlayer.misses = 0;
      currentPlayer.streak = 0;
      currentPlayer.ready = false;
    }
    room.status = "lobby";
    room.game = null;
    broadcast(room);
  }
}

export function createRoom(options: {
  displayName: string;
  avatar?: string;
  mode?: RoomMode;
  matchLength?: number;
  turnTimerSeconds?: number;
  maxPlayers?: number;
  difficulty?: Difficulty;
}) {
  const code = roomCode();
  const playerId = id("player");
  const player: Player = {
    id: playerId,
    sessionToken: id("session"),
    displayName: sanitizeName(options.displayName),
    avatar: options.avatar || defaultAvatars[0],
    team: "home",
    ready: true,
    connected: false,
    score: 0,
    goals: 0,
    saves: 0,
    misses: 0,
    answers: 0,
    streak: 0,
  };
  const room: Room = {
    code,
    hostId: playerId,
    status: "lobby",
    mode: options.mode ?? "classic",
    matchLength: options.matchLength ?? 5,
    turnTimerSeconds: options.turnTimerSeconds ?? 12,
    maxPlayers: options.maxPlayers ?? 4,
    difficulty: options.difficulty ?? "casual",
    players: new Map([[playerId, player]]),
    sockets: new Map(),
    game: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return sessionFor(room, player);
}

export function joinRoom(code: string, options: { displayName: string; avatar?: string }) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (room.status !== "lobby" || room.players.size >= room.maxPlayers) return null;
  const player: Player = {
    id: id("player"),
    sessionToken: id("session"),
    displayName: sanitizeName(options.displayName),
    avatar: options.avatar || defaultAvatars[room.players.size % defaultAvatars.length],
    team: "away",
    ready: false,
    connected: false,
    score: 0,
    goals: 0,
    saves: 0,
    misses: 0,
    answers: 0,
    streak: 0,
  };
  room.players.set(player.id, player);
  assignTeams(room);
  broadcast(room);
  return sessionFor(room, player);
}

function sessionFor(room: Room, player: Player) {
  return {
    code: room.code,
    playerId: player.id,
    sessionToken: player.sessionToken,
    room: roomSnapshot(room),
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code.toUpperCase());
  return room ? roomSnapshot(room) : null;
}

export function processRoomTimers(now = Date.now()) {
  for (const room of rooms.values()) {
    expireIfPastDeadline(room, now);
    if (now - room.createdAt > 1000 * 60 * 60 * 8 && room.status === "lobby") {
      rooms.delete(room.code);
    }
  }
}

export function attachRealtime(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const handleUpgrade = (request: IncomingMessage, socket: import("node:net").Socket, head: Buffer) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    const code = (url.searchParams.get("code") ?? "").toUpperCase();
    const playerId = url.searchParams.get("playerId") ?? "";
    const sessionToken = url.searchParams.get("sessionToken") ?? "";
    const room = rooms.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player || player.sessionToken !== sessionToken) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, room, playerId);
    });
  };
  server.on("upgrade", handleUpgrade);

  wss.on("connection", (ws: WebSocket, _request: IncomingMessage, room: Room, playerId: string) => {
    const player = room.players.get(playerId);
    if (!player) return;
    const existing = room.sockets.get(playerId);
    if (existing && existing !== ws) existing.close();
    room.sockets.set(playerId, ws);
    player.connected = true;
    send(room, playerId, stateFor(room, playerId));
    broadcast(room);
    ws.on("message", (data) => {
      try {
        handleCommand(room, playerId, JSON.parse(data.toString()));
      } catch (error) {
        logger.warn({ error, room: room.code }, "Invalid realtime message");
      }
    });
    ws.on("close", () => {
      if (room.sockets.get(playerId) === ws) {
        room.sockets.delete(playerId);
        player.connected = false;
        broadcast(room);
      }
    });
  });

  const expiryTimer = setInterval(() => processRoomTimers(), 500);

  return () => {
    clearInterval(expiryTimer);
    server.off("upgrade", handleUpgrade);
    for (const room of rooms.values()) {
      if (room.advanceTimer) clearTimeout(room.advanceTimer);
    }
    wss.close();
  };
}