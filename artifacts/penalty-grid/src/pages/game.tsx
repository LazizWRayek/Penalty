import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Check, Goal, Loader2, Shield, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/lib/game-state";
import { cn } from "@/lib/utils";

function useSecondsLeft(deadline: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
}

export default function Game() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { session, room, match, sendCommand, connected, error } = useGame();
  const [answer, setAnswer] = useState("");
  const secondsLeft = useSecondsLeft(match?.deadline ?? null);

  useEffect(() => {
    if (!session || session.code !== code) setLocation("/");
  }, [code, session, setLocation]);
  useEffect(() => {
    if (room?.status === "finished") setLocation(`/results/${code}`);
  }, [code, room?.status, setLocation]);
  useEffect(() => setAnswer(""), [match?.round, match?.phase]);

  const me = room?.players.find((player) => player.id === session?.playerId);
  const isShooter = match?.shooterId === session?.playerId;
  const isKeeper = match?.keeperId === session?.playerId;
  const canChoose =
    match !== null &&
    (match.phase === "shooting-select" || match.phase === "shooting-answer") &&
    ((isShooter && match.shooterSquare === null) || isKeeper);
  const canAnswer =
    match !== null &&
    ((isShooter && match.phase === "shooting-answer") ||
      (isKeeper && match.phase === "save-challenge"));

  const homeScore = useMemo(
    () => room?.players.filter((player) => player.team === "home").reduce((sum, player) => sum + player.score, 0) ?? 0,
    [room],
  );
  const awayScore = useMemo(
    () => room?.players.filter((player) => player.team === "away").reduce((sum, player) => sum + player.score, 0) ?? 0,
    [room],
  );

  if (!session || !room || !match || !me) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const selectedCriteria =
    match.shooterSquare !== null
      ? {
          row: match.grid.rows[Math.floor(match.shooterSquare / 3)],
          column: match.grid.columns[match.shooterSquare % 3],
        }
      : null;

  const roleTitle = isShooter
    ? "You are shooting"
    : isKeeper
      ? "You are in goal"
      : "Watch the duel";
  const instruction =
    match.phase === "shooting-select"
      ? isShooter
        ? "Choose your target. The keeper is reading your body language."
        : isKeeper
          ? "Pick a square to dive toward. Your prediction stays secret."
          : "The shooter and keeper are making their calls."
      : match.phase === "shooting-answer"
        ? isShooter
          ? "Name a footballer who satisfies both criteria."
          : isKeeper
            ? "Keep your dive hidden, then wait for the answer."
            : "The shooter is naming their player."
        : match.phase === "save-challenge"
          ? isKeeper
            ? "Correct dive. Name a different player to make the save."
            : "The keeper read it. Can they prove the save?"
          : match.phase === "result"
            ? match.resultReason ?? "The crowd holds its breath."
            : "The final whistle is about to sound.";

  const chooseSquare = (square: number) => {
    if (!canChoose) return;
    if (isShooter) sendCommand("select_square", { square });
    if (isKeeper) sendCommand("keeper_select", { square });
  };

  const submitAnswer = () => {
    if (answer.trim() && canAnswer) sendCommand("submit_answer", { answer: answer.trim() });
  };

  const resultClass =
    match.result === "goal"
      ? "text-primary"
      : match.result === "save"
        ? "text-sky-300"
        : "text-destructive";
  const resultLabel =
    match.result === "goal" ? "GOAL" : match.result === "save" ? "SAVED" : "MISS";

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-background text-white">
      <div className="pointer-events-none fixed inset-0 bg-stadium-mesh opacity-70" />
      <div className="pointer-events-none fixed -top-64 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col p-4 md:p-7">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="rounded-xl border border-card-border bg-card/90 px-4 py-3 shadow-stadium">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Penalty Grid</div>
            <div className="font-display text-xl font-black tracking-wide">{room.code} <span className="text-primary">LIVE</span></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card/90 px-4 py-2">
            <div className="text-center"><div className="font-mono text-[9px] text-muted-foreground">HOME</div><div className="font-display text-3xl font-black">{homeScore}</div></div>
            <div className="font-mono text-xs text-muted-foreground">ROUND {match.round}/{match.maxRounds}</div>
            <div className="text-center"><div className="font-mono text-[9px] text-muted-foreground">AWAY</div><div className="font-display text-3xl font-black">{awayScore}</div></div>
          </div>
          <div className={cn("hidden items-center gap-2 font-mono text-xs md:flex", connected ? "text-primary" : "text-destructive")}>
            <span className={cn("h-2 w-2 rounded-full", connected ? "bg-primary" : "bg-destructive")} />
            {connected ? "LIVE" : "RECONNECTING"}
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 lg:order-1">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{roleTitle}</p>
                <h1 className="font-display text-2xl font-black uppercase md:text-3xl">{instruction}</h1>
              </div>
              {secondsLeft !== null && (
                <div className="flex min-w-16 flex-col items-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-primary">
                  <Timer className="h-4 w-4" />
                  <span className="font-display text-2xl font-black">{secondsLeft}</span>
                </div>
              )}
            </div>

            <div className="relative mx-auto aspect-[1.9/1] w-full max-w-4xl border-[8px] border-white shadow-[inset_0_0_70px_rgba(0,0,0,0.7),0_0_36px_rgba(255,255,255,0.14)]">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.17)_1px,transparent_1px),linear-gradient(-45deg,rgba(255,255,255,.17)_1px,transparent_1px)] bg-[size:22px_22px] opacity-50" />
              <div className="absolute -left-1 -right-1 -top-10 grid grid-cols-3 gap-2 px-1">
                {match.grid.columns.map((criterion) => <div key={criterion.id} className="rounded-md bg-card/90 px-1 py-1 text-center font-mono text-[9px] font-bold uppercase text-primary md:text-xs">{criterion.label}</div>)}
              </div>
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1.5 p-1.5">
                {Array.from({ length: 9 }, (_, square) => {
                  const selectedByShooter = match.shooterSquare === square;
                  const selectedByKeeper = match.keeperSquare === square;
                  const reveal = match.phase === "result" || match.phase === "finished";
                  return (
                    <button
                      key={square}
                      aria-label={`Grid square ${square + 1}: ${match.grid.rows[Math.floor(square / 3)].label} and ${match.grid.columns[square % 3].label}`}
                      disabled={!canChoose}
                      onClick={() => chooseSquare(square)}
                      className={cn(
                        "group relative flex min-h-12 items-center justify-center border-2 border-white/15 bg-black/20 p-1 transition duration-200",
                        canChoose && "cursor-crosshair hover:border-primary hover:bg-primary/10",
                        selectedByShooter && !reveal && "border-primary bg-primary/20 shadow-[inset_0_0_24px_rgba(199,242,0,.55)]",
                        selectedByKeeper && !reveal && isKeeper && "border-sky-300 bg-sky-300/10 shadow-[inset_0_0_24px_rgba(125,211,252,.4)]",
                        reveal && selectedByShooter && selectedByKeeper && "border-sky-300 bg-sky-300/20",
                        reveal && selectedByShooter && !selectedByKeeper && "border-primary bg-primary/20",
                        reveal && selectedByKeeper && !selectedByShooter && "border-white/60 bg-white/10",
                      )}
                    >
                      <span className="text-center font-mono text-[9px] font-bold leading-tight text-white/70 md:text-xs">
                        {match.grid.rows[Math.floor(square / 3)].shortLabel} + {match.grid.columns[square % 3].shortLabel}
                      </span>
                      {reveal && selectedByShooter && <span className="absolute bottom-1 right-1"><Goal className="h-4 w-4 text-primary" /></span>}
                      {reveal && selectedByKeeper && <span className="absolute left-1 top-1"><Shield className="h-4 w-4 text-sky-300" /></span>}
                    </button>
                  );
                })}
              </div>
              <div className="absolute -left-10 top-0 grid h-full grid-rows-3 gap-1.5 py-1.5">
                {match.grid.rows.map((criterion) => <div key={criterion.id} className="flex -rotate-90 items-center justify-center whitespace-nowrap font-mono text-[8px] font-bold uppercase text-white/60 md:text-[10px]">{criterion.label}</div>)}
              </div>
            </div>
          </div>

          <aside className="order-1 rounded-2xl border border-card-border bg-card/90 p-5 shadow-stadium lg:order-2">
            {selectedCriteria && (
              <div className="mb-5">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Selected criteria</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-primary px-2 py-1 font-mono text-xs font-bold text-primary-foreground">{selectedCriteria.row.label}</span>
                  <span className="rounded border border-primary/40 px-2 py-1 font-mono text-xs font-bold text-primary">{selectedCriteria.column.label}</span>
                </div>
              </div>
            )}
            {canAnswer ? (
              <div className="space-y-3">
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  {isKeeper ? "Different footballer for the save" : "Name the footballer"}
                </label>
                <Input value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitAnswer()} placeholder={isKeeper ? "ANOTHER VALID PLAYER" : "TYPE A PLAYER NAME"} className="h-12 font-display text-base" />
                <Button size="lg" className="w-full" disabled={!answer.trim()} onClick={submitAnswer}>SUBMIT ANSWER</Button>
              </div>
            ) : match.phase === "result" ? (
              <div className="space-y-3 text-center">
                <div className={cn("font-display text-5xl font-black", resultClass)}>{resultLabel}</div>
                {match.shooterAnswer && <p className="font-mono text-xs text-white/80">SHOOTER: {match.shooterAnswer}</p>}
                {match.keeperAnswer && <p className="font-mono text-xs text-sky-200">KEEPER: {match.keeperAnswer}</p>}
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">{match.resultReason}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /><span className="font-mono text-xs uppercase">Server-authoritative match</span></div>
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">Selections remain hidden until the reveal. The database validates every answer.</p>
                {error && <p className="rounded border border-destructive/40 bg-destructive/10 p-2 font-mono text-[10px] text-destructive">{error}</p>}
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}