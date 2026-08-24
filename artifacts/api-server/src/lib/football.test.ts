import { describe, expect, it } from "vitest";
import {
  FOOTBALLERS,
  resolveFootballer,
  satisfies,
  validateAnswer,
} from "./football";

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
});