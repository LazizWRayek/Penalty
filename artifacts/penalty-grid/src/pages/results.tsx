import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Check, Copy, Home, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGame } from "@/lib/game-state";

export default function Results() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { session, room, match, sendCommand, clearSession } = useGame();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session || session.code !== code) setLocation("/");
  }, [code, session, setLocation]);

  const scores = useMemo(() => ({
    home: room?.players.filter((player) => player.team === "home").reduce((total, player) => total + player.score, 0) ?? 0,
    away: room?.players.filter((player) => player.team === "away").reduce((total, player) => total + player.score, 0) ?? 0,
  }), [room]);

  if (!room || !match) return null;
  const me = room.players.find((player) => player.id === session?.playerId);
  const winner = scores.home === scores.away ? "DRAW" : scores.home > scores.away ? "HOME" : "AWAY";
  const result = winner === "DRAW" ? "DRAW" : winner.toLowerCase() === me?.team ? "VICTORY" : "DEFEAT";
  const bestPlayer = [...room.players].sort((a, b) => b.score - a.score)[0];

  const copyCode = async () => {
    await navigator.clipboard?.writeText(code ?? "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="min-h-[100dvh] bg-background p-5 text-white">
      <div className="mx-auto flex min-h-[90dvh] max-w-4xl flex-col items-center justify-center">
        <Trophy className="mb-5 h-20 w-20 text-primary drop-shadow-[0_0_30px_rgba(199,242,0,.5)]" />
        <p className="font-mono text-xs uppercase tracking-[.3em] text-muted-foreground">Final whistle</p>
        <h1 className={`font-display text-6xl font-black uppercase md:text-8xl ${result === "VICTORY" ? "text-primary" : result === "DEFEAT" ? "text-destructive" : "text-white"}`}>{result}</h1>
        <Card className="my-9 w-full border-primary/20 bg-card/90 p-7 shadow-stadium">
          <div className="grid grid-cols-3 items-center text-center">
            <div><p className="font-mono text-xs text-muted-foreground">HOME</p><p className="font-display text-7xl font-black">{scores.home}</p></div>
            <div className="font-mono text-sm text-muted-foreground">FINAL<br /><span className="text-white">{room.code}</span></div>
            <div><p className="font-mono text-xs text-muted-foreground">AWAY</p><p className="font-display text-7xl font-black">{scores.away}</p></div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-border pt-5 text-center sm:grid-cols-4">
            <div><p className="font-mono text-[10px] text-muted-foreground">PENALTIES</p><p className="font-display text-xl">{match.penaltyHistory.length}</p></div>
            <div><p className="font-mono text-[10px] text-muted-foreground">GOALS</p><p className="font-display text-xl">{match.penaltyHistory.filter((penalty) => penalty.result === "goal").length}</p></div>
            <div><p className="font-mono text-[10px] text-muted-foreground">SAVES</p><p className="font-display text-xl">{match.penaltyHistory.filter((penalty) => penalty.result === "save").length}</p></div>
            <div><p className="font-mono text-[10px] text-muted-foreground">TOP PLAYER</p><p className="font-display text-xl">{bestPlayer?.displayName ?? "—"}</p></div>
          </div>
        </Card>
        <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={() => sendCommand("rematch")}><RotateCcw className="mr-2 h-4 w-4" /> REMATCH</Button>
          <Button size="lg" variant="outline" onClick={clearSession}><Home className="mr-2 h-4 w-4" /> MAIN MENU</Button>
        </div>
        <Button variant="ghost" className="mt-5 font-mono text-xs" onClick={copyCode}>{copied ? <Check className="mr-2 h-3 w-3 text-primary" /> : <Copy className="mr-2 h-3 w-3" />} COPY ROOM CODE {code}</Button>
      </div>
    </main>
  );
}