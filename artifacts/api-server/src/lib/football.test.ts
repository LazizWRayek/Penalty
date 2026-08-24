import { describe, expect, it } from "vitest";
import {
  FOOTBALLERS,
  FOOTBALL_DATA_UPDATED_AT,
  footballDataFreshness,
  resolveFootballer,
  searchFootballers,
  satisfies,
  validateAnswer,
} from "./football";
import { mergeLivePlayer, newLivePlayer } from "./football-provider";

describe("football answer validation", () => {
  it("resolves aliases and validates both grid criteria", () => {
    const result = validateAnswer("CR7", "premier-league", "la-liga");
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.player.name).toBe("Cristiano Ronaldo");
  });

  it("rejects players who only satisfy one criterion", () => {
    const result = validateAnswer("Mohamed Salah", "liverpool", "la-liga");
    expect(result).toMatchObject({ valid: false });
  });

  it("rejects a repeated answer during a save challenge", () => {
    const result = validateAnswer("Paulo Dybala", "argentina", "serie-a", [
      "Paulo Dybala",
    ]);
    expect(result).toMatchObject({ valid: false });
  });

  it("guarantees every default grid square has a real answer pool", () => {
    const rows = ["argentina", "world-cup", "liverpool"] as const;
    const columns = ["premier-league", "la-liga", "serie-a"] as const;
    for (const row of rows) {
      for (const column of columns) {
        expect(FOOTBALLERS.some((player) => satisfies(player, row, column))).toBe(
          true,
        );
      }
    }
  });

  it("does not resolve unsupported names", () => {
    expect(resolveFootballer("Not A Footballer")).toBeNull();
  });

  it("returns player suggestions with image data and freshness metadata", () => {
    const result = searchFootballers("cr", 5);
    expect(result.players[0]).toMatchObject({
      id: "cristianoronaldo",
      name: "Cristiano Ronaldo",
      aliases: expect.arrayContaining(["cr7"]),
    });
    expect(result.players[0]?.imageUrl).toContain("dicebear.com");
    expect(result.freshness).toBe("verified-snapshot");
  });

  it("labels an out-of-date roster snapshot as stale", () => {
    const staleDate = Date.parse(FOOTBALL_DATA_UPDATED_AT) + 31 * 24 * 60 * 60 * 1000;
    expect(footballDataFreshness(staleDate)).toBe("stale");
  });

  it("merges live profiles without losing audited historical criteria", () => {
    const fallback = FOOTBALLERS.find((player) => player.name === "Cristiano Ronaldo");
    if (!fallback) throw new Error("Missing test player");
    const merged = mergeLivePlayer(fallback, {
      player: {
        name: "Cristiano Ronaldo",
        nationality: "Portugal",
        photo: "https://example.test/ronaldo.jpg",
      },
      statistics: [{
        team: { name: "Al-Nassr" },
        league: { name: "Saudi Pro League" },
      }],
    });

    expect(merged.clubs).toEqual(expect.arrayContaining(["Manchester United", "Al-Nassr"]));
    expect(merged.leagues).toEqual(expect.arrayContaining(["Premier League", "Saudi Pro League"]));
    expect(merged.trophies).toEqual(fallback.trophies);
    expect(merged.imageUrl).toBe("https://example.test/ronaldo.jpg");
  });

  it("converts a discovered live player into a searchable roster entry", () => {
    const player = newLivePlayer({
      player: { name: "Live Player", nationality: "Argentine", photo: "https://example.test/live.jpg" },
      statistics: [{ team: { name: "Liverpool" }, league: { name: "Premier League" } }],
    });
    expect(player).toMatchObject({
      name: "Live Player",
      nationality: "Argentine",
      clubs: ["Liverpool"],
      leagues: ["Premier League"],
      imageUrl: "https://example.test/live.jpg",
    });
  });
});