import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import app from "../app";
import {
  attachRealtime,
  createRoom,
  getRoom,
  joinRoom,
} from "./rooms";

type Session = ReturnType<typeof createRoom>;
type State = {
  type: "state";
  room: ReturnType<typeof getRoom>;
  game: {
    phase: string;
    result: string | null;
    resultReason: string | null;
    shooterSquare: number | null;
    keeperSquare: number | null;
  } | null;
};

class SocketHarness {
  readonly socket: WebSocket;
  private states: State[] = [];
  private waiters: Array<{
    predicate: (state: State) => boolean;
    resolve: (state: State) => void;
  }> = [];

  constructor(port: number, session: Session) {
    this.socket = new WebSocket(
      `ws://127.0.0.1:${port}/ws?code=${session.code}&playerId=${session.playerId}&sessionToken=${session.sessionToken}`,
    );
    this.socket.on("message", (data) => {
      const state = JSON.parse(data.toString()) as State;
      this.states.push(state);
      const pending = this.waiters.find(({ predicate }) => predicate(state));
      if (pending) {
        this.waiters = this.waiters.filter((waiter) => waiter !== pending);
        pending.resolve(state);
      }
    });
  }

  async ready() {
    await new Promise<void>((resolve, reject) => {
      this.socket.once("open", () => resolve());
      this.socket.once("error", reject);
    });
    await this.waitFor((state) => state.type === "state");
  }

  send(command: object) {
    this.socket.send(JSON.stringify(command));
  }

  waitFor(predicate: (state: State) => boolean) {
    const existing = this.states.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise<State>((resolve) => {
      this.waiters.push({ predicate, resolve });
    });
  }

  close() {
    this.socket.close();
  }
}

describe("authoritative room lifecycle", () => {
  let server: Server;
  let stopRealtime: (() => void) | undefined;
  let port: number;

  beforeEach(async () => {
    server = createServer(app);
    stopRealtime = attachRealtime(server);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No test port");
        port = address.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    stopRealtime?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("creates private rooms, joins players, and assigns opposing teams", () => {
    const host = createRoom({ displayName: "  Alex   Host  " });
    const guest = joinRoom(host.code.toLowerCase(), { displayName: "Guest" });
    expect(guest).not.toBeNull();

    const room = getRoom(host.code);
    expect(room?.status).toBe("lobby");
    expect(room?.players).toHaveLength(2);
    expect(room?.players.map((player) => player.displayName)).toEqual([
      "Alex Host",
      "Guest",
    ]);
    expect(room?.players.map((player) => player.team)).toEqual(["home", "away"]);
  });

  it("keeps hidden picks private until the result", async () => {
    const host = createRoom({ displayName: "Shooter" });
    const guest = joinRoom(host.code, { displayName: "Keeper" });
    if (!guest) throw new Error("Guest could not join test room");
    const shooter = new SocketHarness(port, host);
    const keeper = new SocketHarness(port, guest);

    await Promise.all([shooter.ready(), keeper.ready()]);
    shooter.send({ type: "start" });
    const shooting = await shooter.waitFor(
      (state) => state.game?.phase === "shooting-select",
    );
    expect(shooting.game?.shooterSquare).toBeNull();

    shooter.send({ type: "select_square", square: 0 });
    const keeperView = await keeper.waitFor(
      (state) => state.game?.phase === "shooting-answer",
    );
    expect(keeperView.game?.shooterSquare).toBeNull();
    expect(keeperView.game?.keeperSquare).toBeNull();

    shooter.close();
    keeper.close();
  });

  it("resolves a correctly predicted square as a save when the keeper answers", async () => {
    const host = createRoom({ displayName: "Shooter" });
    const guest = joinRoom(host.code, { displayName: "Keeper" });
    if (!guest) throw new Error("Guest could not join test room");
    const shooter = new SocketHarness(port, host);
    const keeper = new SocketHarness(port, guest);
    await Promise.all([shooter.ready(), keeper.ready()]);

    shooter.send({ type: "start" });
    await shooter.waitFor((state) => state.game?.phase === "shooting-select");
    shooter.send({ type: "select_square", square: 0 });
    keeper.send({ type: "keeper_select", square: 0 });
    await shooter.waitFor((state) => state.game?.phase === "shooting-answer");
    shooter.send({ type: "submit_answer", answer: "Emiliano Martinez" });
    await keeper.waitFor((state) => state.game?.phase === "save-challenge");
    keeper.send({ type: "submit_answer", answer: "Julian Alvarez" });
    const result = await keeper.waitFor((state) => state.game?.phase === "result");

    expect(result.game?.result).toBe("save");
    expect(result.room?.players.find((player) => player.displayName === "Keeper")?.score).toBe(1);
    expect(result.room?.players.find((player) => player.displayName === "Shooter")?.score).toBe(0);

    shooter.close();
    keeper.close();
  });

  it("resolves a valid shot in the wrong direction as a goal", async () => {
    const host = createRoom({ displayName: "Shooter" });
    const guest = joinRoom(host.code, { displayName: "Keeper" });
    if (!guest) throw new Error("Guest could not join test room");
    const shooter = new SocketHarness(port, host);
    const keeper = new SocketHarness(port, guest);
    await Promise.all([shooter.ready(), keeper.ready()]);

    shooter.send({ type: "start" });
    await shooter.waitFor((state) => state.game?.phase === "shooting-select");
    shooter.send({ type: "select_square", square: 0 });
    await shooter.waitFor((state) => state.game?.phase === "shooting-answer");
    keeper.send({ type: "keeper_select", square: 1 });
    shooter.send({ type: "submit_answer", answer: "Emiliano Martinez" });
    const result = await shooter.waitFor((state) => state.game?.phase === "result");

    expect(result.game?.result).toBe("goal");
    expect(result.room?.players.find((player) => player.displayName === "Shooter")?.score).toBe(1);

    shooter.close();
    keeper.close();
  });
});