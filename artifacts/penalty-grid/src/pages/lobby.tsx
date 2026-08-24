import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateRoom, useJoinRoom, useQuickPlay } from "@workspace/api-client-react";
import { useGame } from "@/lib/game-state";
import { Clock3, Loader2, UsersRound } from "lucide-react";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { setSession } = useGame();
  
  const [view, setView] = useState<"home" | "create" | "join">("home");
  
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const quickPlay = useQuickPlay();

  // Create Form State
  const [createName, setCreateName] = useState("");
  const [createMode, setCreateMode] = useState<"classic" | "party">("classic");
  const [createDiff, setCreateDiff] = useState<"casual" | "competitive" | "hardcore">("casual");
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<8 | 12 | 20 | 30>(12);
  const [maxPlayers, setMaxPlayers] = useState<2 | 4 | 6 | 8 | 10>(4);
  
  // Join Form State
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName) return;
    
    createRoom.mutate(
      {
        data: {
          displayName: createName,
          mode: createMode,
          difficulty: createDiff,
          turnTimerSeconds,
          maxPlayers,
        },
      },
      {
        onSuccess: (session) => {
          setSession({ code: session.code, playerId: session.playerId, sessionToken: session.sessionToken });
          setLocation(`/room/${session.code}`);
        }
      }
    );
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !joinName) return;
    
    const code = joinCode.toUpperCase();
    joinRoom.mutate(
      { code, data: { displayName: joinName } },
      {
        onSuccess: (session) => {
          setSession({ code: session.code, playerId: session.playerId, sessionToken: session.sessionToken });
          setLocation(`/room/${session.code}`);
        }
      }
    );
  };

  const handleQuickPlay = () => {
    quickPlay.mutate(
      { data: { displayName: "Guest_" + Math.floor(Math.random() * 1000) } },
      {
        onSuccess: (session) => {
          setSession({ code: session.code, playerId: session.playerId, sessionToken: session.sessionToken });
          setLocation(`/room/${session.code}`);
        }
      }
    );
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-stadium-mesh">
      
      {/* Decorative Lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary opacity-20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white opacity-10 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            PENALTY<br/>
            <span className="text-primary drop-shadow-[0_0_20px_rgba(199,242,0,0.4)]">GRID</span>
          </h1>
          <p className="mt-4 text-muted-foreground font-mono tracking-widest text-sm uppercase">High Stakes Shootout</p>
        </div>

        {view === "home" && (
          <div className="flex flex-col gap-4">
            <Button size="xl" onClick={() => setView("create")} className="w-full text-xl py-8 group">
              Host Match
            </Button>
            <Button size="xl" variant="outline" onClick={() => setView("join")} className="w-full text-xl py-8">
              Join Match
            </Button>
            <div className="flex items-center gap-4 py-4">
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono text-xs text-muted-foreground uppercase">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button size="lg" variant="ghost" onClick={handleQuickPlay} disabled={quickPlay.isPending} className="w-full border border-transparent hover:border-border">
              {quickPlay.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Quick Play
            </Button>
          </div>
        )}

        {view === "create" && (
          <Card className="border-primary/30 shadow-[0_0_30px_rgba(199,242,0,0.1)]">
            <CardHeader>
              <CardTitle>Host Match</CardTitle>
              <CardDescription>Configure your stadium settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Player Name</label>
                  <Input 
                    placeholder="ENTER NAME" 
                    value={createName} 
                    onChange={e => setCreateName(e.target.value)} 
                    maxLength={18}
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <Clock3 className="h-3.5 w-3.5 text-primary" /> Turn timer
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {([8, 12, 20, 30] as const).map((seconds) => (
                      <Button
                        key={seconds}
                        type="button"
                        variant={turnTimerSeconds === seconds ? "default" : "outline"}
                        onClick={() => setTurnTimerSeconds(seconds)}
                        className="w-full px-1 text-xs"
                      >
                        {seconds}s
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <UsersRound className="h-3.5 w-3.5 text-primary" /> Player limit
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {([2, 4, 6, 8, 10] as const).map((count) => (
                      <Button
                        key={count}
                        type="button"
                        variant={maxPlayers === count ? "default" : "outline"}
                        onClick={() => setMaxPlayers(count)}
                        className="w-full px-1 text-xs"
                      >
                        {count}
                      </Button>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    Choose the room size before sharing the code. The room locks when it reaches this limit.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button" 
                      variant={createMode === "classic" ? "default" : "outline"} 
                      onClick={() => setCreateMode("classic")}
                      className="w-full"
                    >
                      Classic
                    </Button>
                    <Button 
                      type="button" 
                      variant={createMode === "party" ? "default" : "outline"} 
                      onClick={() => setCreateMode("party")}
                      className="w-full"
                    >
                      Party
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["casual", "competitive", "hardcore"] as const).map(d => (
                      <Button 
                        key={d}
                        type="button" 
                        variant={createDiff === d ? "default" : "outline"} 
                        onClick={() => setCreateDiff(d)}
                        className="w-full text-xs px-2"
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setView("home")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-2" disabled={createRoom.isPending || !createName}>
                    {createRoom.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Room
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {view === "join" && (
          <Card className="border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle>Join Match</CardTitle>
              <CardDescription>Enter the stadium code</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Room Code</label>
                  <Input 
                    placeholder="4-LETTER CODE" 
                    value={joinCode} 
                    onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                    maxLength={4}
                    className="text-center text-2xl tracking-[0.5em]"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Player Name</label>
                  <Input 
                    placeholder="ENTER NAME" 
                    value={joinName} 
                    onChange={e => setJoinName(e.target.value)} 
                    maxLength={18}
                    required
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setView("home")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-2 bg-white text-black hover:bg-gray-200" disabled={joinRoom.isPending || !joinCode || !joinName}>
                    {joinRoom.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enter Stadium
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        
      </div>
    </div>
  );
}
