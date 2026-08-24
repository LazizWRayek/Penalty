export type CriterionId =
  | "argentina"
  | "world-cup"
  | "liverpool"
  | "premier-league"
  | "la-liga"
  | "serie-a";

export type Footballer = {
  name: string;
  aliases: string[];
  nationality: string;
  clubs: string[];
  leagues: string[];
  trophies: string[];
};

export type FootballDataFreshness = "verified-snapshot" | "stale" | "unavailable";

export const FOOTBALL_DATA_UPDATED_AT = "2026-08-24T00:00:00.000Z";
const FOOTBALL_DATA_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export type Criterion = {
  id: CriterionId;
  label: string;
  shortLabel: string;
};

export const FOOTBALLERS: Footballer[] = [
  {
    name: "Mohamed Salah",
    aliases: ["mo salah", "salah"],
    nationality: "Egyptian",
    clubs: ["Liverpool", "Chelsea", "Roma"],
    leagues: ["Premier League", "Serie A"],
    trophies: ["domestic-league"],
  },
  {
    name: "Sadio Mane",
    aliases: ["sadio mane", "mane"],
    nationality: "Senegalese",
    clubs: ["Liverpool", "Southampton"],
    leagues: ["Premier League"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Virgil van Dijk",
    aliases: ["virgil van dijk", "van dijk"],
    nationality: "Dutch",
    clubs: ["Liverpool", "Southampton"],
    leagues: ["Premier League"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Alisson Becker",
    aliases: ["alisson", "alisson becker"],
    nationality: "Brazilian",
    clubs: ["Liverpool", "Roma"],
    leagues: ["Premier League", "Serie A"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Luis Suarez",
    aliases: ["luis suarez", "suarez"],
    nationality: "Uruguayan",
    clubs: ["Liverpool", "Barcelona", "Atletico Madrid"],
    leagues: ["Premier League", "La Liga"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Xabi Alonso",
    aliases: ["xabi alonso", "alonso"],
    nationality: "Spanish",
    clubs: ["Liverpool", "Real Madrid", "Bayern Munich"],
    leagues: ["Premier League", "La Liga", "Bundesliga"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Lionel Messi",
    aliases: ["messi", "leo messi", "lionel andres messi"],
    nationality: "Argentine",
    clubs: ["Barcelona", "Paris Saint-Germain"],
    leagues: ["La Liga"],
    trophies: ["world-cup", "champions-league", "domestic-league"],
  },
  {
    name: "Julian Alvarez",
    aliases: ["julian alvarez", "alvarez"],
    nationality: "Argentine",
    clubs: ["Manchester City", "Atletico Madrid"],
    leagues: ["Premier League", "La Liga"],
    trophies: ["world-cup", "domestic-league"],
  },
  {
    name: "Paulo Dybala",
    aliases: ["dybala", "paulo dibala"],
    nationality: "Argentine",
    clubs: ["Juventus", "Roma"],
    leagues: ["Serie A"],
    trophies: ["domestic-league"],
  },
  {
    name: "Lautaro Martinez",
    aliases: ["lautaro", "lautaro martinez"],
    nationality: "Argentine",
    clubs: ["Inter"],
    leagues: ["Serie A"],
    trophies: ["world-cup", "domestic-league"],
  },
  {
    name: "Emiliano Martinez",
    aliases: ["emi martinez", "emiliano martinez", "dibu martinez"],
    nationality: "Argentine",
    clubs: ["Arsenal", "Aston Villa"],
    leagues: ["Premier League"],
    trophies: ["world-cup"],
  },
  {
    name: "Luka Modric",
    aliases: ["modric", "luka modric"],
    nationality: "Croatian",
    clubs: ["Real Madrid", "Tottenham"],
    leagues: ["La Liga", "Premier League"],
    trophies: ["champions-league", "domestic-league"],
  },
  {
    name: "Karim Benzema",
    aliases: ["benzema", "karim benzema"],
    nationality: "French",
    clubs: ["Real Madrid", "Lyon"],
    leagues: ["La Liga"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Thierry Henry",
    aliases: ["henry", "thierry henry"],
    nationality: "French",
    clubs: ["Arsenal", "Barcelona", "Juventus"],
    leagues: ["Premier League", "La Liga", "Serie A"],
    trophies: ["world-cup", "champions-league", "domestic-league"],
  },
  {
    name: "Cesc Fabregas",
    aliases: ["fabregas", "cesc fabregas"],
    nationality: "Spanish",
    clubs: ["Arsenal", "Barcelona", "Chelsea"],
    leagues: ["Premier League", "La Liga"],
    trophies: ["world-cup", "domestic-league"],
  },
  {
    name: "Andres Iniesta",
    aliases: ["iniesta", "andres iniesta"],
    nationality: "Spanish",
    clubs: ["Barcelona"],
    leagues: ["La Liga"],
    trophies: ["world-cup", "champions-league", "domestic-league"],
  },
  {
    name: "Gianluigi Buffon",
    aliases: ["buffon", "gigi buffon"],
    nationality: "Italian",
    clubs: ["Juventus", "Paris Saint-Germain"],
    leagues: ["Serie A"],
    trophies: ["world-cup", "domestic-league"],
  },
  {
    name: "Zlatan Ibrahimovic",
    aliases: ["zlatan", "ibrahimovic"],
    nationality: "Swedish",
    clubs: ["Inter", "AC Milan", "Barcelona", "Paris Saint-Germain"],
    leagues: ["Serie A", "La Liga"],
    trophies: ["domestic-league"],
  },
  {
    name: "Cristiano Ronaldo",
    aliases: ["cr7", "ronaldo", "cristiano"],
    nationality: "Portuguese",
    clubs: ["Manchester United", "Real Madrid", "Juventus"],
    leagues: ["Premier League", "La Liga", "Serie A"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Kevin De Bruyne",
    aliases: ["de bruyne", "kevin de bruyne", "kdb"],
    nationality: "Belgian",
    clubs: ["Manchester City", "Chelsea"],
    leagues: ["Premier League"],
    trophies: ["domestic-league", "champions-league"],
  },
  {
    name: "Harry Kane",
    aliases: ["kane", "harry kane"],
    nationality: "English",
    clubs: ["Tottenham", "Bayern Munich"],
    leagues: ["Premier League", "Bundesliga"],
    trophies: [],
  },
  {
    name: "Erling Haaland",
    aliases: ["haaland", "erling haaland"],
    nationality: "Norwegian",
    clubs: ["Manchester City"],
    leagues: ["Premier League"],
    trophies: ["domestic-league", "champions-league"],
  },
];

export const CRITERIA: Record<CriterionId, Criterion> = {
  argentina: { id: "argentina", label: "Argentine", shortLabel: "ARG" },
  "world-cup": {
    id: "world-cup",
    label: "World Cup winner",
    shortLabel: "WC",
  },
  liverpool: {
    id: "liverpool",
    label: "Played for Liverpool",
    shortLabel: "LIV",
  },
  "premier-league": {
    id: "premier-league",
    label: "Premier League",
    shortLabel: "PL",
  },
  "la-liga": { id: "la-liga", label: "La Liga", shortLabel: "LL" },
  "serie-a": { id: "serie-a", label: "Serie A", shortLabel: "SA" },
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export function footballDataFreshness(now = Date.now()): FootballDataFreshness {
  const age = now - Date.parse(FOOTBALL_DATA_UPDATED_AT);
  return age >= 0 && age <= FOOTBALL_DATA_MAX_AGE_MS
    ? "verified-snapshot"
    : "stale";
}

function playerImageUrl(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&backgroundColor=0b1f16,c7f200`;
}

export function searchFootballers(search = "", limit = 8) {
  const query = normalize(search);
  const players = FOOTBALLERS
    .map((player) => {
      const normalizedName = normalize(player.name);
      const normalizedAliases = player.aliases.map(normalize);
      const exact = normalizedName === query || normalizedAliases.includes(query);
      const startsWith =
        normalizedName.startsWith(query) ||
        normalizedAliases.some((alias) => alias.startsWith(query));
      return { player, score: exact ? 0 : startsWith ? 1 : 2 };
    })
    .filter(({ score }) => !query || score < 2)
    .sort((a, b) => a.score - b.score || a.player.name.localeCompare(b.player.name))
    .slice(0, Math.min(Math.max(limit, 1), 10))
    .map(({ player }) => ({
      id: normalize(player.name),
      name: player.name,
      imageUrl: playerImageUrl(player.name),
      aliases: player.aliases,
    }));

  return {
    players,
    updatedAt: FOOTBALL_DATA_UPDATED_AT,
    source: "Penalty Grid verified roster snapshot",
    freshness: footballDataFreshness(),
  };
}

export function resolveFootballer(answer: string): Footballer | null {
  const normalized = normalize(answer);
  if (!normalized) return null;
  return (
    FOOTBALLERS.find(
      (player) =>
        normalize(player.name) === normalized ||
        player.aliases.some((alias) => normalize(alias) === normalized),
    ) ?? null
  );
}

export function satisfies(
  player: Footballer,
  rowId: CriterionId,
  columnId: CriterionId,
): boolean {
  return [rowId, columnId].every((criterionId) => {
    switch (criterionId) {
      case "argentina":
        return player.nationality === "Argentine";
      case "world-cup":
        return player.trophies.includes("world-cup");
      case "liverpool":
        return player.clubs.includes("Liverpool");
      case "premier-league":
        return player.leagues.includes("Premier League");
      case "la-liga":
        return player.leagues.includes("La Liga");
      case "serie-a":
        return player.leagues.includes("Serie A");
    }
  });
}

export function validateAnswer(
  answer: string,
  rowId: CriterionId,
  columnId: CriterionId,
  excludedNames: string[] = [],
) {
  const player = resolveFootballer(answer);
  if (!player) {
    return { valid: false as const, reason: "That player is not in the football database." };
  }
  if (excludedNames.map(normalize).includes(normalize(player.name))) {
    return { valid: false as const, reason: "That player has already been used for this penalty." };
  }
  if (!satisfies(player, rowId, columnId)) {
    return {
      valid: false as const,
      reason: `${player.name} does not satisfy both criteria.`,
    };
  }
  return { valid: true as const, player };
}