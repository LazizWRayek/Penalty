import { Router, type IRouter } from "express";
import {
  CreateRoomBody,
  GetRoomParams,
  JoinRoomBody,
  QuickPlayBody,
  SearchPlayersQueryParams,
} from "@workspace/api-zod";
import { searchFootballers, searchLiveFootballData } from "../lib/football";
import { createRoom, getRoom, joinRoom } from "../lib/rooms";

const router: IRouter = Router();

router.get("/players", async (req, res) => {
  const parsed = SearchPlayersQueryParams.safeParse({
    search: req.query.search,
    limit: req.query.limit === undefined ? undefined : Number(req.query.limit),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Player search options are invalid." });
    return;
  }
  const search = parsed.data.search ?? "";
  const limit = parsed.data.limit ?? 8;
  const livePlayers = await searchLiveFootballData(search, limit);
  if (livePlayers) {
    const fallback = searchFootballers(search, limit);
    res.json({
      ...fallback,
      players: livePlayers.map((player) => ({
        id: player.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        name: player.name,
        imageUrl: player.imageUrl ?? "",
        aliases: player.aliases,
      })),
    });
    return;
  }
  res.json(searchFootballers(search, limit));
});

router.post("/rooms", (req, res) => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a display name and valid room settings." });
    return;
  }
  res.status(201).json(createRoom(parsed.data));
});

router.get("/rooms/:code", (req, res) => {
  const parsed = GetRoomParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Room codes are four letters or numbers." });
    return;
  }
  const room = getRoom(parsed.data.code);
  if (!room) {
    res.status(404).json({ error: "That room does not exist or has expired." });
    return;
  }
  res.json(room);
});

router.post("/rooms/:code/join", (req, res) => {
  const params = GetRoomParams.safeParse(req.params);
  const body = JoinRoomBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Enter a display name and a valid room code." });
    return;
  }
  const session = joinRoom(params.data.code, body.data);
  if (!session) {
    res.status(400).json({ error: "Room is full, already playing, or does not exist." });
    return;
  }
  res.json(session);
});

router.post("/rooms/quick-play", (req, res) => {
  const parsed = QuickPlayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a display name to start quick play." });
    return;
  }
  res.status(201).json(createRoom({ ...parsed.data, mode: "classic" }));
});

export default router;