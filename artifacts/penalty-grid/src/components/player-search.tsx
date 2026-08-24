import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Search,
  TriangleAlert,
} from "lucide-react";
import {
  getSearchPlayersQueryKey,
  useSearchPlayers,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PlayerSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onChoose: (value: string) => void;
  disabled?: boolean;
};

export function PlayerSearch({
  value,
  onChange,
  onChoose,
  disabled = false,
}: PlayerSearchProps) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), 160);
    return () => window.clearTimeout(timer);
  }, [value]);

  const query = useSearchPlayers(
    { search: debouncedValue || undefined, limit: 8 },
    {
      query: {
        enabled: !disabled && debouncedValue.trim().length > 0,
        queryKey: getSearchPlayersQueryKey({
          search: debouncedValue || undefined,
          limit: 8,
        }),
        staleTime: 30_000,
      },
    },
  );
  const players = query.data?.players ?? [];
  const isOpen = open && value.trim().length > 0;
  const activePlayer = players[activeIndex];
  const freshnessText = useMemo(() => {
    if (!query.data) return null;
    const date = new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(query.data.updatedAt));
    return query.data.freshness === "verified-snapshot"
      ? `Verified roster snapshot · ${date}`
      : `Roster needs refresh · ${date}`;
  }, [query.data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedValue, players.length]);

  useEffect(() => () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  }, []);

  const choose = (name: string) => {
    onChoose(name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
        />
        <Input
          role="combobox"
          aria-autocomplete="list"
          aria-controls={isOpen ? listId : undefined}
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && activePlayer ? `${listId}-${activeIndex}` : undefined
          }
          value={value}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!isOpen || players.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % players.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + players.length) % players.length);
            } else if (event.key === "Enter" && activePlayer) {
              event.preventDefault();
              choose(activePlayer.name);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="SEARCH A PLAYER"
          className="h-12 pl-10 pr-10 font-display text-base normal-case"
        />
        {query.isFetching && (
          <Loader2
            aria-label="Searching players"
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
          />
        )}
      </div>

      {isOpen && (
        <div
          id={listId}
          role="listbox"
          aria-label="Player suggestions"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-primary/30 bg-[#07130d] p-1 shadow-[0_16px_38px_rgba(0,0,0,.45)]"
        >
          {query.isError ? (
            <div className="flex items-center gap-2 px-3 py-3 font-mono text-xs text-destructive">
              <TriangleAlert className="h-4 w-4" /> Player search is unavailable. You can still enter a name.
            </div>
          ) : query.isFetching && players.length === 0 ? (
            <div className="px-3 py-3 font-mono text-xs text-muted-foreground">
              Searching the roster…
            </div>
          ) : players.length === 0 ? (
            <div className="px-3 py-3 font-mono text-xs text-muted-foreground">
              No matching player in this roster.
            </div>
          ) : (
            <>
              {players.map((player, index) => (
                <button
                  id={`${listId}-${index}`}
                  key={player.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(player.name)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    index === activeIndex ? "bg-primary/15" : "hover:bg-white/5",
                  )}
                >
                  <img
                    src={player.imageUrl}
                    alt=""
                    className="h-9 w-9 rounded-full border border-primary/30 bg-secondary object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-bold text-white">
                      {player.name}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {player.aliases.slice(0, 2).join(" · ")}
                    </span>
                  </span>
                  {value.toLowerCase() === player.name.toLowerCase() && (
                    <Check aria-label="Selected player" className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
              {freshnessText && (
                <p className="border-t border-white/10 px-2.5 py-2 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  {freshnessText}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}