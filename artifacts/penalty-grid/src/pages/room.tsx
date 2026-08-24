import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGame } from "@/lib/game-state";
import { useGetRoom, getGetRoomQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, Trophy, Flag, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Room() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { session, room: wsRoom, connected, sendCommand, clearSession } = useGame();

  // Use the REST hook as a fallback/initial fetch
  const { data: restRoom } = useGetRoom(code || "", { 
    query: { 
      enabled: !!code, 
      queryKey: getGetRoomQueryKey(code || "") 
    } 
  });

  const room = wsRoom || restRoom;

  useEffect(() => {
    if (!session || session.code !== code) {
      setLocation("/");
    }
  }, [session, code, setLocation]);

  useEffect(() => {
    if (room?.status === "playing") {
      setLocation(`/game/${code}`);
    }
  }, [room?.status, code, setLocation]);

  if (!session || !room) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-primary">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-mono animate-pulse uppercase">Connecting to Stadium...</p>
      </div>
    );
  }

  const isHost = room.hostId === session.playerId;
  const me = room.players.find(p => p.id === session.playerId);
  
  const allReady = room.players.length >= 2 && room.players.every(p => p.ready);

  const handleReady = () => {
    sendCommand("ready", { state: !me?.ready });
  };

  const handleStart = () => {
    if (isHost && allReady) {
      sendCommand("start");
    }
  };

  const handleLeave = () => {
    sendCommand("leave");
    clearSession();
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col p-4 md:p-8 bg-stadium-mesh relative">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 z-10 relative">
        <Button variant="ghost" size="sm" onClick={handleLeave} className="text-muted-foreground hover:text-white">
          <LogOut className="w-4 h-4 mr-2" /> LEAVE
        </Button>
        <div className="flex items-center gap-4 bg-card border border-card-border px-6 py-2 rounded-full shadow-stadium">
          <span className="font-mono text-xs text-muted-foreground">ROOM CODE</span>
          <span className="font-display font-bold text-2xl tracking-widest text-primary">{room.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-primary shadow-[0_0_10px_#c7f200]" : "bg-destructive shadow-[0_0_10px_red]")} />
          <span className="font-mono text-xs hidden md:inline uppercase">{connected ? "Live Connection" : "Disconnected"}</span>
        </div>
      </div>

      {/* Main Roster Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative max-w-6xl mx-auto w-full">
        
        {/* HOME TEAM */}
        <div className="col-span-1 space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-primary/50 pb-2 mb-4">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Home Team</h2>
          </div>
          {room.players.filter(p => p.team === 'home').map(p => (
            <PlayerCard key={p.id} player={p} isMe={p.id === session.playerId} />
          ))}
          {room.players.filter(p => p.team === 'home').length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-8 flex justify-center items-center text-muted-foreground font-mono text-sm uppercase">
              Waiting for player...
            </div>
          )}
        </div>

        {/* NEUTRAL / MIDDLE INFO */}
        <div className="col-span-1 flex flex-col justify-center items-center gap-8 py-8 lg:py-0">
          <div className="text-center space-y-2 w-full max-w-[240px]">
            <h3 className="font-mono text-muted-foreground text-sm uppercase">Match Rules</h3>
            <div className="bg-card border border-card-border rounded-lg p-4 shadow-sm w-full">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground text-xs font-mono uppercase">Mode</span>
                <span className="text-white text-xs font-bold uppercase">{room.mode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground text-xs font-mono uppercase">Difficulty</span>
                <span className="text-white text-xs font-bold uppercase">{room.difficulty}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground text-xs font-mono uppercase">Length</span>
                <span className="text-white text-xs font-bold uppercase">{room.matchLength} each</span>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-4 max-w-[240px]">
            <Button 
              size="xl" 
              variant={me?.ready ? "secondary" : "default"}
              onClick={handleReady}
              className="w-full"
            >
              {me?.ready ? "NOT READY" : "READY UP"}
            </Button>

            {isHost && (
              <Button 
                size="xl" 
                variant="stadium"
                onClick={handleStart}
                disabled={!allReady}
                className="w-full"
              >
                START MATCH
              </Button>
            )}
            {isHost && !allReady && (
              <p className="text-center text-[10px] font-mono text-muted-foreground uppercase">Waiting for all players</p>
            )}
          </div>
        </div>

        {/* AWAY TEAM */}
        <div className="col-span-1 space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-white/50 pb-2 mb-4 justify-end lg:justify-start">
            <Flag className="w-6 h-6 text-white" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Away Team</h2>
          </div>
          {room.players.filter(p => p.team === 'away').map(p => (
            <PlayerCard key={p.id} player={p} isMe={p.id === session.playerId} align="right" />
          ))}
          {room.players.filter(p => p.team === 'away').length === 0 && (
            <div className="border border-dashed border-border rounded-xl p-8 flex justify-center items-center text-muted-foreground font-mono text-sm uppercase">
              Waiting for player...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player, isMe, align = "left" }: { player: any, isMe: boolean, align?: "left"|"right" }) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all relative overflow-hidden",
      isMe ? "border-primary/50 shadow-[0_0_15px_rgba(199,242,0,0.1)]" : "border-card-border",
      align === "right" ? "flex-row-reverse" : ""
    )}>
      {player.ready && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-[20px] rounded-full pointer-events-none" />
      )}
      
      <div className="relative z-10">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center font-display font-bold text-xl uppercase">
          {player.avatar || player.displayName.substring(0, 2)}
        </div>
        {!player.connected && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-card" title="Disconnected" />
        )}
      </div>
      
      <div className={cn("flex flex-col z-10", align === "right" ? "items-end" : "items-start")}>
        <span className="font-bold text-lg leading-tight flex items-center gap-2 uppercase">
          {player.displayName} 
          {isMe && <span className="text-[10px] font-mono bg-primary text-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">You</span>}
        </span>
        <span className={cn(
          "text-xs font-mono font-bold uppercase tracking-wider",
          player.ready ? "text-primary" : "text-muted-foreground"
        )}>
          {player.ready ? "Ready" : "Not Ready"}
        </span>
      </div>
    </div>
  );
}
